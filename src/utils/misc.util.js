import configs from "../config/config.js";
import db from "../config/db.js";
import { isEmpty } from "./user_helper.js";
import { translate } from "@vitalets/google-translate-api";

export const getTreatmentIDsByUserID = async (UserID) => {
    const result = await db.query(`
        SELECT aiAnalysisResult
        FROM tbl_face_scan_results 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
    `, [UserID]);

    if (result.length === 0) {
        return [];
    }
    let AIAnalysisResult;
    try {
        AIAnalysisResult = JSON.parse(result[0].aiAnalysisResult);
    } catch (e) {
        console.error("Invalid JSON in aiAnalysisResult:", e);
        return [];
    }

    if (isEmpty(AIAnalysisResult?.skinIssues)) {
        return [];
    }

    const treatmentIDs = [
        ...new Set(
            (AIAnalysisResult?.skinIssues || [])
                .flatMap(issue => issue.recommendedTreatmentsIds || [])
        )
    ];


    return treatmentIDs;
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

export async function translateFAQ(question, answer) {
    try {
        return { ques_en: question, ans_en: answer, ques_sv: null, ans_sv: null };
        const merged = `${question} -> ${answer}`;

        const translateResult = await translate(merged, { to: "en" });
        const translateTo = translateResult.raw.src === "en" ? "sv" : "en";

        const translated = await translate(merged, { to: translateTo });

        const [q_tr, a_tr] = translated.text.split(" -> ");

        const [ques_en, ans_en] = translateTo === "en" ? [q_tr, a_tr] : [question, answer];
        const [ques_sv, ans_sv] = translateTo === "sv" ? [q_tr, a_tr] : [question, answer];

        return { ques_en, ans_en, ques_sv, ans_sv };
    } catch (err) {
        console.error("Translation failed:", err);
        return { ques_en: question, ans_en: answer, ques_sv: null, ans_sv: null };
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
