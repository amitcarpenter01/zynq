import configs from "../config/config.js";
import db from "../config/db.js";
import { openai } from "../../app.js"
import { deleteGuestDataModel, getInvitedZynqUsers } from "../models/api.js";
import { zynqReminderEnglishTemplate, zynqReminderSwedishTemplate } from "./templates.js";
import { sendEmail } from "../services/send_email.js";
import { cosineSimilarity } from "./user_helper.js";
import axios from "axios";

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
    if (!userID) return [];

    const safeJSONParse = (data) => {
        try {
            return JSON.parse(data);
        } catch {
            return null;
        }
    };

    const result = await db.query(
        `SELECT aiAnalysisResult, scoreInfo
         FROM tbl_face_scan_results
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [userID]
    );

    if (!result?.length) return [];

    const { aiAnalysisResult, scoreInfo } = result[0];
    const { skinConcernMap, mapping } = configs;
    const SCORE_THRESHOLD = 25;

    // STEP 1: SCORE INFO (PRIMARY PRIORITY)
    const parsedScoreInfo = safeJSONParse(scoreInfo);
    if (parsedScoreInfo && mapping && skinConcernMap) {
        const concernIDs = [];

        for (const key in mapping) {
            const value = parsedScoreInfo[key];
            if (typeof value === "number" && value > SCORE_THRESHOLD) {
                const concernName = mapping[key];
                const concernID = skinConcernMap[concernName];
                if (concernID) concernIDs.push(concernID);
            }
        }

        if (concernIDs.length > 0) {
            const placeholders = concernIDs.map(() => "?").join(",");
            const treatmentsResult = await db.query(
                `SELECT DISTINCT treatment_id
                 FROM tbl_treatment_concerns
                 WHERE concern_id IN (${placeholders})`,
                concernIDs
            );

            if (treatmentsResult?.length > 0) {
                return [...new Set(treatmentsResult.map((r) => r.treatment_id))];
            }
        }
    }

    // STEP 2: AI ANALYSIS RESULT (SECOND PRIORITY)
    const AIAnalysisResult = safeJSONParse(aiAnalysisResult);
    if (!AIAnalysisResult?.skinIssues?.length) return [];

    // STEP 2A: Direct recommended treatments
    const aiTreatmentIDs = [
        ...new Set(
            AIAnalysisResult.skinIssues.flatMap(
                (issue) => issue?.recommendedTreatmentsIds || []
            )
        ),
    ];
    if (aiTreatmentIDs.length > 0) return aiTreatmentIDs;

    // STEP 2B: Fallback using concernId
    const concernIDs = AIAnalysisResult.skinIssues
        .map((issue) => issue?.concernId)
        .filter(Boolean);

    if (concernIDs.length > 0) {
        const placeholders = concernIDs.map(() => "?").join(",");
        const treatmentsResult = await db.query(
            `SELECT DISTINCT treatment_id
             FROM tbl_treatment_concerns
             WHERE concern_id IN (${placeholders})`,
            concernIDs
        );

        if (treatmentsResult?.length > 0) {
            return [...new Set(treatmentsResult.map((r) => r.treatment_id))];
        }
    }

    // STEP 3: Nothing worked
    return [];
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

export async function sendInvitationEmail(user) {
    try {
        if (!user?.email) return;

        const emailTemplate = user?.language === "sv" ? zynqReminderEnglishTemplate : zynqReminderSwedishTemplate

        const recipient_name = user.name || "";
        const roleKey = user.role || "";
        const { subject, body } = emailTemplate({ recipient_name: recipient_name, roleKey: roleKey });

        await sendEmail({
            to: user.email,
            subject: subject,
            html: body,
        });

    } catch (error) {
        console.error(`❌ Failed to send invitation email to ${user.email}:`, error.message);
    }
}

export async function sendInvitationReminders() {
    try {

        const users = await getInvitedZynqUsers();
        if (!users.length) {
            return;
        }

        const nowUTC = new Date();
        const reminderSchedule = [3, 7, 14];

        const toUpdateClinics = [];
        const toUpdateDoctors = [];
        const toImportClinics = [];
        const toImportDoctors = [];

        for (const user of users) {
            if (!user.invited_date) continue;

            const invitedDate = new Date(user.invited_date);
            const diffDays = Math.floor((nowUTC - invitedDate) / (1000 * 60 * 60 * 24));

            const nextReminderDay = reminderSchedule[user.invitation_email_count] ?? null;

            if (!nextReminderDay) {
                // After 14 days → mark imported
                if (diffDays > 14) {
                    if (user.role === "CLINIC") toImportClinics.push(user.id);
                    else toImportDoctors.push(user.id);
                }
                continue;
            }

            // If time for next reminder email
            if (diffDays >= nextReminderDay) {
                await sendInvitationEmail(user);

                if (user.role === "CLINIC") toUpdateClinics.push(user.id);
                else toUpdateDoctors.push(user.id);

            }
        }

        // --- BULK UPDATE: increment invitation_email_count ---
        const bulkUpdate = async (table, idField, ids) => {
            if (!ids.length) {
                return;
            }
            const placeholders = ids.map(() => "?").join(",");
            await db.query(
                `UPDATE ${table}
                 SET invitation_email_count = invitation_email_count + 1
                 WHERE ${idField} IN (${placeholders})`,
                ids
            );
        };

        await Promise.all([
            bulkUpdate("tbl_clinics", "clinic_id", toUpdateClinics),
            bulkUpdate("tbl_doctors", "doctor_id", toUpdateDoctors)
        ]);

        const bulkImport = async (table, idField, ids) => {
            if (!ids.length) {
                return;
            }
            const placeholders = ids.map(() => "?").join(",");
            await db.query(
                `UPDATE ${table}
                 SET profile_status = 'IMPORTED'
                 WHERE ${idField} IN (${placeholders})`,
                ids
            );
        };

        await Promise.all([
            bulkImport("tbl_clinics", "clinic_id", toImportClinics),
            bulkImport("tbl_doctors", "doctor_id", toImportDoctors)
        ]);

    } catch (error) {
        console.error("sendInvitationReminders: error:", error);
    }
}

export async function deleteGuestData() {
    await deleteGuestDataModel()
}

export const getTopSimilarRows = async (rows, search, threshold = 0.4, topN = null) => {
    console.log("ROws - ", rows.length, rows);
    console.log("Search - ", search);
    if (!search?.trim()) return rows;
    // 1️⃣ Get embedding for the search term
    const response = await axios.post("http://localhost:11434/api/embeddings", {
        model: "nomic-embed-text",
        prompt: search,
    });

    const queryEmbedding = response.data.embedding;

    // 2️⃣ Compute similarity for each row
    const results = [];

    for (const row of rows) {
        if (!row.embeddings) continue;

        const dbEmbedding = Array.isArray(row.embeddings)
            ? row.embeddings
            : JSON.parse(row.embeddings);

        const score = cosineSimilarity(queryEmbedding, dbEmbedding);

        console.log("name - ", row.name || "user", "score - ", score);
        if (score >= threshold) {
            const { embeddings, ...rest } = row; // exclude embeddings
            results.push({ ...rest, score });
        }
    }

    // 3️⃣ Sort descending by similarity
    results.sort((a, b) => b.score - a.score);

    // 4️⃣ Return all above threshold or topN if specified
    if (topN && topN > 0) {
        return results.slice(0, topN);
    }
    return results;
};

export const paginateRows = (rows, limit, page) => {
    if (!Array.isArray(rows)) return [];

    // If limit or page is not provided, return all rows
    if (limit == null || page == null) return rows;

    const total = rows.length;
    const totalPages = Math.ceil(total / limit);

    // ensure page is within bounds
    const currentPage = Math.min(Math.max(page, 1), totalPages || 1);

    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;

    return rows.slice(startIndex, endIndex);
};

export const rankSimilarRows = async (rows, search, threshold = 0, topN = null) => {
    if (!rows?.length) return [];
    if (!search?.trim()) return rows;

    // 1️⃣ Fetch embedding for search term
    const { data } = await axios.post("http://localhost:11434/api/embeddings", {
        model: "nomic-embed-text",
        prompt: search,
    });
    const queryEmbedding = data.embedding;

    // 2️⃣ Compute similarity scores for all rows
    const scoredResults = rows.map(row => {
        if (!row.embeddings) return { ...row, score: 0 };

        const dbEmbedding = Array.isArray(row.embeddings)
            ? row.embeddings
            : JSON.parse(row.embeddings);

        const score = cosineSimilarity(queryEmbedding, dbEmbedding);
        return { ...row, score };
    });

    // 3️⃣ Sort all rows by descending similarity
    scoredResults.sort((a, b) => b.score - a.score);

    // 4️⃣ Optionally apply threshold or topN
    const filtered = threshold > 0 
        ? scoredResults.filter(r => r.score >= threshold)
        : scoredResults;

    return topN && topN > 0 ? filtered.slice(0, topN) : filtered;
};