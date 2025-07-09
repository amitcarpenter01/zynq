import db from "../config/db.js";
import { isEmpty } from "./user_helper.js";

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

export const extractUserData = (userData) => {
    if (!userData || !userData.role) {
        throw new Error("Invalid user data");
    }

    const sender_type = userData.role;
    const token = userData.fcm_token || null;

    let sender_id, full_name;

    switch (sender_type) {
        case 'DOCTOR':
        case 'SOLO_DOCTOR':
            sender_id = userData?.doctorData?.doctor_id;
            full_name = userData?.doctorData?.name || "Someone";
            break;

        case 'CLINIC':
            sender_id = userData?.clinicData?.clinic_id;
            full_name = userData?.clinicData?.clinic_name || "Someone";
            break;

        case 'USER':
            sender_id = userData?.user_id;
            full_name = userData?.full_name || "Someone";
            break;

        case 'ADMIN':
            sender_id = userData?.admin_id;
            full_name = userData?.full_name || "Someone";
            break;

        default:
            throw new Error("Unsupported role");
    }

    if (!sender_id) {
        throw new Error(`${sender_type} ID not found in userData`);
    }

    return { sender_id, sender_type, full_name, token };
};
