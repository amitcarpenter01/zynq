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
    const full_name = userData.name || userData.full_name || 'Someone';
    const token = userData.fcm_token || null;

    if (sender_type === 'DOCTOR' || sender_type === 'SOLO_DOCTOR') {
        const sender_id = userData?.doctorData?.doctor_id;
        if (!sender_id) throw new Error("Doctor ID not found in userData");
        return { sender_id, sender_type, full_name, token };
    }

    if (sender_type === 'CLINIC') {
        const sender_id = userData?.clinicData?.clinic_id;
        if (!sender_id) throw new Error("Clinic ID not found in userData");
        return { sender_id, sender_type, full_name, token };
    }

    if (sender_type === 'USER') {
        const sender_id = userData?.user_id;
        if (!sender_id) throw new Error("User ID not found in userData");
        return { sender_id, sender_type, full_name, token };
    }

    if (sender_type === 'ADMIN') {
        const sender_id = userData?.admin_id;
        if (!sender_id) throw new Error("Admin ID not found in userData");
        return { sender_id, sender_type, full_name, token };
    }

    throw new Error("Unsupported role for ID extraction");
};

