import db from "../config/db.js";

//======================================= Auth =========================================

export const get_user_by_user_id = async (user_id) => {
    try {
        return await db.query(`SELECT * FROM tbl_users WHERE user_id = ?`, [user_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch user data.");
    }
};

export const get_user_by_mobile_number = async (mobile_number) => {
    try {
        return await db.query(`SELECT * FROM tbl_users WHERE mobile_number = ?`, [mobile_number]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch user data.");
    }
};

export const create_user = async (mobile_number, otp = '', language) => {
    try {
        const userData = {
            mobile_number,
            otp,
            language,
            is_verified: 0,
            is_active: 1
        };
        return await db.query(`INSERT INTO tbl_users SET ?`, userData);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to create user.");
    }
};

export const enroll_user = async (user_data) => {
    try {
        return await db.query(`INSERT INTO tbl_users SET ?`, user_data);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to create user.");
    }
};

export const update_user = async (user_data, user_id) => {
    try {
        return await db.query(
            `UPDATE tbl_users SET ? WHERE user_id = ?`,
            [user_data, user_id]
        );
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update user.");
    }
};

export const delete_user = async (user_id) => {
    try {
        return await db.query(
            `DELETE FROM tbl_users WHERE user_id = ?`,
            [user_id]
        );
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to delete user.");
    }
};


//======================================= Ai Prompt =========================================
export const get_prompt_data = async (prompt_type) => {
    try {
        return await db.query(`SELECT * FROM tbl_aiprompt WHERE prompt_type = ?`, [prompt_type]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch prompt data.");
    }
};

export const create_prompt = async (promptData) => {
    try {
        return await db.query(`INSERT INTO  tbl_aiprompt SET ?`, promptData);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to create prompt.");
    }
};

export const update_prompt = async (prompt_data, prompt_type) => {
    try {
        return await db.query(
            `UPDATE tbl_aiprompt SET ? WHERE prompt_type = ?`,
            [prompt_data, prompt_type]
        );
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update prompt.");
    }
};


//======================================= Face Scan =========================================
export const add_face_scan_data = async (face_data) => {
    try {
        return await db.query(`INSERT INTO tbl_face_scan_results SET ?`, face_data);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to add face scan data.");
    }
};

export const get_face_scan_history = async (user_id) => {
    try {
        return await db.query(
            `SELECT * FROM tbl_face_scan_results WHERE user_id = ? ORDER BY created_at DESC`, [user_id]);
    } catch (error) {
        console.error("DB Error in get_prompt_data:", error);
        throw new Error("Failed to face scan historydata");
    }
};


//======================================= Doctor =========================================
export const getAllDoctors = async () => {
    try {
        const doctors = await db.query(`
            SELECT d.*, z.email 
            FROM tbl_doctors d
            LEFT JOIN tbl_zqnq_users z ON d.zynq_user_id = z.id 
            WHERE d.profile_completion_percentage >= 50 
            ORDER BY d.created_at DESC `);

        return doctors;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch all doctors.");
    }
}

export const getDoctorAvailability = async (doctor_id) => {
    try {
        const availability = await db.query('SELECT * FROM tbl_doctor_availability WHERE doctor_id = ? ORDER BY created_at DESC', [doctor_id]);
        return availability;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor availability.");
    }
};

export const getDoctorCertifications = async (doctor_id) => {
    try {
        const certifications = await db.query(`
            SELECT c.*, ct.* 
            FROM tbl_doctor_certification c
            LEFT JOIN tbl_certification_type ct ON c.certification_type_id = ct.certification_type_id 
            WHERE c.doctor_id = ? ORDER BY c.created_at DESC`, [doctor_id]);
        return certifications;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor certifications.");
    }
};

export const getDoctorEducation = async (doctor_id) => {
    try {
        const education = await db.query('SELECT * FROM tbl_doctor_educations WHERE doctor_id = ? ORDER BY created_at DESC', [doctor_id]);
        return education;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor education.");
    }
};

export const getDoctorExperience = async (doctor_id) => {
    try {
        const experience = await db.query('SELECT * FROM tbl_doctor_experiences WHERE doctor_id = ? ORDER BY created_at DESC', [doctor_id]);
        return experience;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor experience.");
    }
};

export const getDoctorReviews = async (doctor_id) => {
    try {
        const reviews = await db.query('SELECT * FROM tbl_doctor_reviews WHERE doctor_id = ? ORDER BY created_at DESC', [doctor_id]);
        return reviews;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor reviews.");
    }
};

export const getDoctorSeverityLevels = async (doctor_id) => {
    try {
        const severityLevels = await db.query('SELECT * FROM tbl_doctor_severity_levels WHERE doctor_id = ? ORDER BY created_at DESC', [doctor_id]);
        return severityLevels;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor severity levels.");
    }
};

export const getDoctorSkinTypes = async (doctor_id) => {
    try {
        const skinTypes = await db.query('SELECT * FROM tbl_doctor_skin_types WHERE doctor_id = ? ORDER BY created_at DESC', [doctor_id]);
        return skinTypes;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor skin types.");
    }
};

export const getDoctorTreatments = async (doctor_id) => {
    try {
        const treatments = await db.query('SELECT * FROM tbl_doctor_treatments WHERE doctor_id = ? ORDER BY created_at DESC', [doctor_id]);
        return treatments;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor treatments.");
    }
};


//======================================= Product =========================================
export const get_all_products_for_user = async () => {
    try {
        return await db.query(`SELECT * FROM tbl_products ORDER BY created_at DESC`);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch products.");
    }
}

export const get_product_images = async (product_id) => {
    try {
        return await db.query(`SELECT * FROM tbl_product_images WHERE product_id = ? ORDER BY created_at DESC`, [product_id]);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch product images.");
    }
}


//======================================= Clinic =========================================
export const getAllClinicsForUser = async (ids = [],limit,offset) => {
    try {
        let query = `
            SELECT c.*
            FROM tbl_clinics c
            LEFT JOIN tbl_clinic_treatments tct ON c.clinic_id = tct.clinic_id
            WHERE c.profile_completion_percentage >= 50
        `;
        let params = [];

        if (ids.length > 0) {
            const placeholders = ids.map(() => '?').join(', ');
            query += ` AND tct.treatment_id IN (${placeholders})`;
            params.push(...ids);
        }

        query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;

        return await db.query(query, [...params,limit,offset]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch clinics.");
    }
};


export const get_clinic_by_zynq_user_id = async (zynq_user_id) => {
    try {
        return await db.query(`SELECT * FROM tbl_clinics WHERE zynq_user_id = ?`, [zynq_user_id]);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch clinic.");
    }
}


//======================================= Support =========================================
export const insert_support_ticket = async (support_ticket_data) => {
    try {
        return await db.query(`INSERT INTO tbl_support_tickets SET ?`, support_ticket_data);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert support ticket.");
    }
}

export const get_support_tickets_by_user_id = async (user_id) => {
    try {
        return await db.query(`SELECT * FROM tbl_support_tickets WHERE user_id = ? ORDER BY created_at DESC`, [user_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch support tickets.");
    }
}