import configs from "../config/config.js";
import db from "../config/db.js";
import OpenAI from "openai";

const isEmpty = (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'boolean' || typeof value === 'number') return false;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (value instanceof Map || value instanceof Set) return value.size === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
};

export const getTreatmentIDsByUserID = async (userID) => {
    // 1️⃣ Fetch latest face scan result
    const result = await db.query(
        `SELECT aiAnalysisResult, scoreInfo
         FROM tbl_face_scan_results 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [userID]
    );

    if (result.length === 0) return [];

    // 2️⃣ Parse aiAnalysisResult
    let AIAnalysisResult;
    try {
        AIAnalysisResult = JSON.parse(result[0].aiAnalysisResult);
    } catch {
        AIAnalysisResult = null;
    }

    // If AIAnalysisResult has skinIssues → prefer those treatment IDs
    if (!isEmpty(AIAnalysisResult?.skinIssues)) {
        return [
            ...new Set(
                (AIAnalysisResult.skinIssues || [])
                    .flatMap(issue => issue.recommendedTreatmentsIds || [])
            )
        ];
    }

    // 3️⃣ Parse scoreInfo as fallback
    let scoreInfo;
    try {
        scoreInfo = JSON.parse(result[0].scoreInfo);
    } catch {
        scoreInfo = null;
    }

    if (!scoreInfo) return [];

    const { skinConcernMap, mapping } = configs;
    const concernIDs = [];

    // 4️⃣ Only consider scores > 25
    for (const key in mapping) {
        const value = scoreInfo[key];
        if (typeof value === "number" && value > 25) {
            const concernName = mapping[key];
            const concernID = skinConcernMap[concernName];
            if (concernID) {
                concernIDs.push(concernID);
            }
        }
    }

    if (concernIDs.length === 0) return [];

    // 5️⃣ Fetch treatments for those concerns
    const placeholders = concernIDs.map(() => "?").join(",");
    const treatmentsResult = await db.query(
        `SELECT DISTINCT treatment_id 
         FROM tbl_treatment_concerns 
         WHERE concern_id IN (${placeholders})`,
        concernIDs
    );

    if (!treatmentsResult || treatmentsResult.length === 0) return [];

    // 6️⃣ Return treatment IDs
    return treatmentsResult.map(row => row.treatment_id);
};

export const getLatestFaceScanReportIDByUserID = async (userID) => {
    try {

        const result = await db.query(`
            SELECT face_scan_result_id
            FROM tbl_face_scan_results 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [userID]);

        console.log("result", result);

        if (!result?.length) {
            return null;
        }

        return result[0].face_scan_result_id || null;
    } catch (error) {
        console.error("getLatestFaceScanReportIDByUserID error:", error);
        return null;
    }
};


export const extractUserData = (userData) => {
    if (!userData || !userData.role) {
        throw new Error("Invalid user data");
    }

    const role = userData.role;
    const token = userData.fcm_token || null;

    let user_id, full_name;

    switch (role) {
        case 'DOCTOR':
        case 'SOLO_DOCTOR':
            user_id = userData?.doctorData?.doctor_id;
            full_name = userData?.doctorData?.name || "Someone";
            break;

        case 'CLINIC':
            user_id = userData?.clinicData?.clinic_id;
            full_name = userData?.clinicData?.clinic_name || "Someone";
            break;

        case 'USER':
            user_id = userData?.user_id;
            full_name = userData?.full_name || "Someone";
            break;

        case 'ADMIN':
            user_id = userData?.admin_id;
            full_name = userData?.full_name || "Someone";
            break;

        default:
            throw new Error("Unsupported role");
    }

    if (!user_id) {
        throw new Error(`${role} ID not found in userData`);
    }

    return { user_id, role, full_name, token };
};

export const formatBenefitsOnLang = (rows = [], lang = 'en') => {
    return rows.map(row => {
        let localizedBenefits = [];

        try {
            const parsed = typeof row.benefits === 'string' ? JSON.parse(row.benefits) : row.benefits;
            localizedBenefits = Object.values(parsed).map(b => b?.[lang] || '');
        } catch (e) {
            console.error(`Failed to parse benefits for treatment_id: ${row.treatment_id}`, e.message);
        }

        return {
            ...row,
            benefits: localizedBenefits
        };
    });
};

export const formatBenefitsUnified = (rows = [], lang = 'en') => {
    return rows.map(row => {
        if (row.source === 'old' && row.benefits) {
            try {
                const parsed = typeof row.benefits === 'string'
                    ? JSON.parse(row.benefits)
                    : row.benefits;
                return {
                    ...row,
                    benefits: Object.values(parsed).map(b => b?.[lang] || '').filter(Boolean)
                };
            } catch {
                return { ...row, benefits: [] };
            }
        }

        if (row.source === 'new') {
            const raw = lang === 'sv' ? row.benefits_sv : row.benefits_en;
            if (!raw) return { ...row, benefits: [] };

            // Split on bullets, semicolons, or commas, then clean up
            const benefits = raw
                .split(/•|;|,/)
                .map(s => s.replace(/^\s*[,\.•]+/, '').trim()) // remove leading punctuation
                .filter(Boolean); // remove empty strings

            return { ...row, benefits };
        }

        return { ...row, benefits: [] };
    });
};



const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;


export async function translateFAQ(question, answer) {
    const fallback = {
        ques_en: question,
        ans_en: answer,
        ques_sv: null,
        ans_sv: null,
    };

    if (!openai) return fallback;

    const prompt = `
                Translate the following FAQ into both English and Swedish. 
                The input FAQ can be in both english or swedish, 
                You dont have to generate answers, simply translate.

                Return a valid JSON object with:
                {
                "ques_en": "...",
                "ans_en": "...",
                "ques_sv": "...",
                "ans_sv": "..."
                }
                Question: "${question}"
                Answer: "${answer}"
                `;

    try {

        const res = await openai.chat.completions.create(
            {
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
            }
        );

        const content = res?.choices?.[0]?.message?.content;

        return content ? JSON.parse(content) : fallback;
    } catch (err) {
        console.error("OpenAI translation failed:", err);
        return fallback;
    }
}

export function normalizeCategory(inputCategory) {
    if (!inputCategory) return null;

    const match = configs.faq_categories.find(
        cat => cat.en === inputCategory || cat.sv === inputCategory
    );

    // Always return English (since DB stores English)
    return match ? match.en : null;
}
