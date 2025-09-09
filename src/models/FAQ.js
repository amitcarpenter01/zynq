import db from "../config/db.js";

export const getAllFAQsModel = async (filters = {}) => {
    try {
        const { search, category } = filters;
        let query = 'SELECT * FROM `tbl_faqs`';
        const params = [];

        const whereClauses = [];

        // Free text search on 4 columns
        if (search) {
            whereClauses.push(
                '(ques_en LIKE ? OR ans_en LIKE ? OR ques_sv LIKE ? OR ans_sv LIKE ?)'
            );
            const likeSearch = `%${search}%`;
            params.push(likeSearch, likeSearch, likeSearch, likeSearch);
        }

        // Hard match on category
        if (category) {
            whereClauses.push('category = ?');
            params.push(category);
        }

        // Combine WHERE clauses
        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        query += ' ORDER BY created_at DESC'; // optional, latest first

        return await db.query(query, params);
    } catch (error) {
        console.error("Failed to get all FAQs:", error);
        throw error;
    }
};


export const getSingleFAQModel = async (faq_id) => {
    try {
        return await db.query('SELECT * FROM `tbl_faqs` WHERE faq_id = ?', [faq_id]);
    } catch (error) {
        console.error("Failed to get single FAQ:", error);
        throw error;
    }
}

export const deleteFAQModel = async (faq_id) => {
    try {
        return await db.query('DELETE FROM `tbl_faqs` WHERE faq_id = ?', [faq_id]);
    } catch (error) {
        console.error("Failed to delete FAQ:", error);
        throw error;
    }
}

export const addFAQModel = async (data) => {
    try {
        return await db.query('INSERT INTO `tbl_faqs`(`ques_en`, `ans_en`, `ques_sv`, `ans_sv`, `category`) VALUES (?, ?, ?, ?, ?)', [data.ques_en, data.ans_en, data.ques_sv, data.ans_sv, data.category]);
    } catch (error) {
        console.error("Failed to add FAQ:", error);
        throw error;
    }
}

export const updateFAQModel = async (faq_id, data) => {
    try {
        return await db.query('UPDATE `tbl_faqs` SET ? WHERE faq_id = ?', [data, faq_id]);
    } catch (error) {
        console.error(`Failed to update FAQ (ID: ${faq_id}):`, error);
        throw error;
    }
};
