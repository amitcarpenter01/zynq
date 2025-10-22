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