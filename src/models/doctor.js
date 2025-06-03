import db from "../config/db.js";
import { get_web_user_by_id } from "./web_user.js";


export const get_doctor_by_zynquser_id = async (zynqUserId) => {
    try {
        return await db.query(`SELECT * FROM tbl_doctors WHERE zynq_user_id = ?`, [zynqUserId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor by zynq user ID.");
    }
};

export const add_personal_details = async (zynqUserId, name, phone, age, address, gender, profile_image, biography) => {
    try {
        return await db.query(`UPDATE  tbl_doctors SET name = ?, phone=? , age=?, address=?, gender=?, profile_image=?,biography=? where zynq_user_id = ? `, [name, phone, age, address, gender, profile_image, biography, zynqUserId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to add doctor personal details.");
    }
};

export const create_doctor_profile = async (userId) => {
    try {
        return await db.query(`INSERT INTO tbl_doctors (user_id) VALUES (?)`, [userId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to create doctor profile.");
    }
};

export const add_education = async (doctorId, institute, degree, start_year, end_year) => {
    try {
        return await db.query(`INSERT INTO tbl_doctor_educations (doctor_id, institution, degree, start_year, end_year) VALUES (?, ?, ?, ?, ?)`, [doctorId, institute, degree, start_year, end_year]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to add education.");
    }
};

export const update_education = async (educationId, institute, degree, start_year, end_year) => {
    try {
        return await db.query(`UPDATE tbl_doctor_educations SET institution = ?, degree = ?, start_year = ?, end_year = ? WHERE education_id = ?`, [institute, degree, start_year, end_year, educationId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update education.");
    }
};

export const delete_education = async (educationId) => {
    try {
        return await db.query(`DELETE FROM tbl_doctor_educations WHERE education_id = ?`, [educationId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to delete education.");
    }
};

export const get_doctor_education = async (doctorId) => {
    try {
        return await db.query(`SELECT * FROM tbl_doctor_educations WHERE doctor_id = ? ORDER BY end_year DESC, start_year DESC`, [doctorId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor's education.");
    }
};

export const add_experience = async (doctorId, organization, designation, startDate, endDate) => {
    try {
        return await db.query(`INSERT INTO tbl_doctor_experiences (doctor_id, organization, designation, start_date, end_date) VALUES (?, ?, ?, ?, ?)`, [doctorId, organization, designation, startDate, endDate]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to add experience.");
    }
};

export const update_experience = async (experienceId, organization, designation, startDate, endDate) => {
    try {
        return await db.query(`UPDATE tbl_doctor_experiences SET organization = ?, designation = ?, start_date = ?, end_date = ? WHERE experience_id = ?`, [organization, designation, startDate, endDate, experienceId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update experience.");
    }
};

export const delete_experience = async (experienceId) => {
    try {
        return await db.query(`DELETE FROM tbl_doctor_experiences WHERE experience_id = ?`, [experienceId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to delete experience.");
    }
};

export const get_doctor_experience = async (doctorId) => {
    try {
        return await db.query(`SELECT * FROM tbl_doctor_experiences WHERE doctor_id = ? ORDER BY end_date DESC, start_date DESC`, [doctorId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor's experience.");
    }
};

export const get_doctor_treatments = async (doctorId) => {
    try {
        return await db.query(`
          SELECT 
                dt.*,
                tt.*
            FROM 
                tbl_doctor_treatments dt
            INNER JOIN 
                tbl_treatments tt 
            ON 
                dt.treatment_id = tt.treatment_id 
            WHERE 
                dt.doctor_id = ?`, [doctorId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor's treatments.");
    }
};

export const get_doctor_skin_types = async (doctorId) => {
    try {
        return await db.query(` SELECT 
                dst.*,
                tst.*
            FROM 
                tbl_doctor_skin_types dst
            INNER JOIN 
                tbl_skin_types tst
            ON 
                dst.skin_type_id = tst.skin_type_id  
            WHERE 
                dst.doctor_id = ?`, [doctorId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor's skin types.");
    }
};

export const get_doctor_severity_levels = async (doctorId) => {
    try {
        return await db.query(`SELECT 
                dsl.*,
                tsl.*
            FROM 
                tbl_doctor_severity_levels dsl
            INNER JOIN 
                tbl_severity_levels tsl
            ON 
                dsl.severity_id = tsl.severity_level_id   
            WHERE 
                dsl.doctor_id = ?`, [doctorId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor's severity_levels");
    }
};

export const update_doctor_services = async (doctorId, serviceIds) => {
    try {
        // Clear existing services
        await db.query(`DELETE FROM tbl_doctors_service WHERE doctor_id = ?`, [doctorId]);
        // Add new services
        const values = serviceIds.map(serviceId => [doctorId, serviceId]);
        if (values.length > 0) {
            return await db.query(`INSERT INTO tbl_doctors_service (doctor_id, service_id) VALUES ?`, [values]);
        }
        return null;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update doctor's services.");
    }
};

export const get_all_services = async () => {
    try {
        return await db.query(`SELECT * FROM tbl_service`);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get all services.");
    }
};

export const update_doctor_skin_types = async (doctorId, skinTypeIds) => {
    try {
        await db.query(`DELETE FROM tbl_doctor_skin_types WHERE doctor_id = ?`, [doctorId]);
        const values = skinTypeIds.map(skinTypeId => [doctorId, skinTypeId]);
        if (values.length > 0) {
            return await db.query(`INSERT INTO tbl_doctor_skin_types (doctor_id, skin_type_id) VALUES ?`, [values]);
        }
        return null;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update doctor's skin types.");
    }
};

export const get_all_skin_types = async () => {
    try {
        return await db.query(`SELECT * FROM tbl_skin_type`);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get all skin types.");
    }
};

export const update_doctor_severity_levels = async (doctorId, severityLevelIds) => {
    try {
        await db.query(`DELETE FROM tbl_doctor_severity_levels WHERE doctor_id = ?`, [doctorId]);
        const values = severityLevelIds.map(severityLevelId => [doctorId, severityLevelId]);
        if (values.length > 0) {
            return await db.query(`INSERT INTO tbl_doctor_severity_levels (doctor_id, severity_id) VALUES ?`, [values]);
        }
        return null;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update doctor's severity levels.");
    }
};

export const update_doctor_treatments = async (doctorId, treatmentIds) => {
    try {
        await db.query(`DELETE FROM tbl_doctor_treatments WHERE doctor_id = ?`, [doctorId]);
        const values = treatmentIds.map(treatmentId => [doctorId, treatmentId]);
        if (values.length > 0) {
            return await db.query(`INSERT INTO tbl_doctor_treatments (doctor_id, treatment_id) VALUES ?`, [values]);
        }
        return null;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update doctor's severity levels.");
    }
};

export const get_all_severity_levels = async () => {
    try {
        return await db.query(`SELECT * FROM tbl_severity_level`);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get all severity levels.");
    }
};

export const update_consultation_fee = async (doctorId, feePerSession, currency, sessionDuration) => {
    try {

        return await db.query(`UPDATE tbl_doctors SET fee_per_session = ?, currency = ?, session_duration = ? WHERE doctor_id = ?`, [feePerSession, currency, sessionDuration, doctorId]);

    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update consultation fee.");
    }
};

export const get_doctor_consultation_fee = async (doctorId) => {
    try {
        const [fee] = await db.query(`SELECT * FROM tbl_consultation_fee WHERE doctor_id = ?`, [doctorId]);
        return fee[0];
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor's consultation fee.");
    }
};

export const update_availability = async (doctorId, availabilityData) => {
    try {
        await db.query(`DELETE FROM tbl_doctor_availability WHERE doctor_id = ?`, [doctorId]);
        const values = availabilityData.map(avail => [doctorId, avail.day_of_week, avail.start_time, avail.end_time, avail.closed]);
        if (values.length > 0) {
            return await db.query(`INSERT INTO tbl_doctor_availability (doctor_id, day_of_week, start_time, end_time,closed) VALUES ?`, [values]);
        }
        return null;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update availability.");
    }
};

export const get_doctor_availability = async (doctorId) => {
    try {
        return await db.query(`SELECT * FROM tbl_doctor_availability WHERE doctor_id = ?`, [doctorId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor's availability.");
    }
};

export const add_certification = async (doctorId, certificationTypeId, uploadPath, issueDate, expiryDate, issuingAuthority) => {
    try {
        return await db.query(`INSERT INTO tbl_doctor_certification (doctor_id, certification_type_id, upload_path, issue_date, expiry_date, issuing_authority) VALUES (?, ?, ?, ?, ?, ?)`, [doctorId, certificationTypeId, uploadPath, issueDate, expiryDate, issuingAuthority]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to add certification.");
    }
};

export const get_doctor_certifications = async (doctorId) => {
    try {
        return await db.query(`
            SELECT 
                dc.*,
                ct.*
            FROM 
                tbl_doctor_certification dc
            INNER JOIN 
                tbl_certification_type ct 
            ON 
                dc.certification_type_id = ct.certification_type_id
            WHERE 
                dc.doctor_id = ?
        `, [doctorId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor's certifications.");
    }
};


export const get_all_certification_types = async () => {
    try {
        return await db.query(`SELECT * FROM tbl_certification_type`);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get all certification types.");
    }
};

export const get_doctor_profile = async (doctorId) => {
    try {
        const [doctor] = await db.query(`SELECT * FROM tbl_doctors WHERE doctor_id = ?`, [doctorId]);
        const [mainUser] = await get_web_user_by_id(doctor.zynq_user_id);
        const education = await get_doctor_education(doctorId);
        const experience = await get_doctor_experience(doctorId);
        const treatments = await get_doctor_treatments(doctorId)
        const skinTypes = await get_doctor_skin_types(doctorId);
        const severityLevels = await get_doctor_severity_levels(doctorId);
        const availability = await get_doctor_availability(doctorId);
        const certifications = await get_doctor_certifications(doctorId);

        return {
            ...mainUser,
            ...doctor, education, experience, treatments, skinTypes, severityLevels, availability, certifications,
        };
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor's complete profile.");
    }
};

export const get_certification_type_by_filename = async (filename) => {
    try {
        return await db.query(`SELECT * FROM tbl_certification_type WHERE file_name = ?`, [filename]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor by zynq user ID.");
    }
};

export const update_certification = async (upload_path, doctor_certification_id) => {
    try {
        return await db.query(`UPDATE tbl_doctor_certification SET upload_path = ? WHERE doctor_certification_id  = ?`, [upload_path, doctor_certification_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update experience.");
    }
};

export const delete_certification = async (certificationId) => {
    try {
        return await db.query(`DELETE FROM tbl_doctor_certification WHERE doctor_certification_id = ?`, [certificationId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to delete certification.");
    }
};

export const get_clinics_data_by_doctor_id = async (doctorId) => {
    try {
        return await db.query(`
            SELECT
    c.*,
    cl.*,
    u.email
FROM
    tbl_doctor_clinic_map dcm
JOIN
    tbl_clinics c ON dcm.clinic_id = c.clinic_id
LEFT JOIN
    tbl_clinic_locations cl ON cl.clinic_id = c.clinic_id
LEFT JOIN
    tbl_zqnq_users u ON c.zynq_user_id = u.id
WHERE
    dcm.doctor_id = ?
ORDER BY
    dcm.assigned_at DESC;
        `, [doctorId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch clinic data by doctor ID.");
    }
};


export const delete_all_education = async (doctor_id) => {
    try {
        return await db.query(`DELETE FROM tbl_doctor_educations WHERE doctor_id = ?`, [doctor_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to delete education.");
    }
};

export const delete_all_experience = async (doctor_id) => {
    try {
        return await db.query(`DELETE FROM tbl_doctor_experiences WHERE doctor_id = ?`, [doctor_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to delete experience.");
    }
};

export const delete_all_certifications_for_doctor = async (doctorId) => {
    try {
        return await db.query(`DELETE FROM tbl_doctor_certification WHERE doctor_id = ?`, [doctorId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to delete all certifications for doctor.");
    }
};

export const update_certification_upload_path = async (doctorId, certificationTypeId, newUploadPath) => {
    try {
        return await db.query(
            `UPDATE tbl_doctor_certification
             SET upload_path = ?
             WHERE doctor_id = ? AND certification_type_id = ?`,
            [newUploadPath, doctorId, certificationTypeId]
        );
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update certification upload path.");
    }
};

export const get_doctor_certification_by_type = async (doctorId, certificationTypeId) => {
    try {
        return await db.query(
            `SELECT doctor_certification_id, upload_path FROM tbl_doctor_certification
             WHERE doctor_id = ? AND certification_type_id = ?`,
            [doctorId, certificationTypeId]
        );// Returns the first matching certification or undefined
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor certification by type.");
    }
};

export const update_doctor_profile_completion = async (doctorId, percentage) => {
    try {
        return await db.query(`
            UPDATE tbl_doctors
            SET profile_completion_percentage = ?
            WHERE doctor_id = ?
        `, [percentage, doctorId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update profile completion percentage.");
    }
};

export const delete_profile_image = async (doctor_id) => {
    try {
        return await db.query(`
            UPDATE tbl_doctors
            SET profile_image = NULL
            WHERE doctor_id = ?
        `, [doctor_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update profile image.");
    }
};

export const insertSupportTicket = async (supportTicketData) => {
    try {
        return await db.query(`INSERT INTO tbl_support_tickets SET ?`, [supportTicketData]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert support ticket.");
    }
};

export const get_support_tickets_by_doctor_id = async (doctor_id) => {
    try {
        const result = await db.query('SELECT * FROM tbl_support_tickets WHERE doctor_id = ?', [doctor_id]);
        return result;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch support tickets.");
    }
}

export const get_doctor_by_zynq_user_id = async (zynq_user_id) => {
    try {
        return await db.query(`SELECT * FROM tbl_doctors WHERE zynq_user_id = ? ORDER BY created_at DESC`, [zynq_user_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor by zynq user ID.");
    }
};

export const insertDoctorSupportTicket = async (supportTicketData) => {
    try {
        return await db.query(`INSERT INTO tbl_doctor_support_tickets SET ?`, [supportTicketData]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert support ticket.");
    }
};
 
export const get_doctor_support_tickets_by_doctor_id = async (doctor_id) => {
    try {
        const result = await db.query('SELECT * FROM tbl_doctor_support_tickets WHERE doctor_id = ? ORDER BY created_at DESC', [doctor_id]);
        return result;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch support tickets.");
    }
}

export const getCertificationsWithUploadPathByDoctorId = async (doctorId) => {
    try {
        const query = `
            SELECT
    tc.certification_type_id,
    tc.name AS certification_name,
    tc.created_at AS certification_type_created_at,
    tc.updated_at AS certification_type_updated_at,
    tc.file_name,
tdc.upload_path,
tdc.doctor_certification_id
FROM
    tbl_certification_type AS tc
LEFT JOIN tbl_doctor_certification AS tdc
ON
    tc.certification_type_id = tdc.certification_type_id AND tdc.doctor_id = ?
WHERE
    tc.file_name IS NOT NULL;;
        `;
        return await db.query(query, [doctorId]); // Assuming db.query returns an array, with the first element being the actual data rows.// This will return an array of certification objects for the given doctor.

    } catch (error) {
        console.error("Database Error (getCertificationsWithUploadPathByDoctorId):", error.message);
        throw new Error("Failed to retrieve certifications due to a database error.");
    }
};

