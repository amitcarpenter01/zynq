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


