import db from "../config/db.js";

export const insertAppointment = async (appointmentData) => {
    try {
        return await db.query(`INSERT INTO tbl_appointments SET ?`, appointmentData);
    } catch (error) {
        console.error("Database Error in insertAppointment:", error.message);
        throw error;
    }
};

export const checkIfSlotAlreadyBooked = async (doctor_id, start_time) => {
    try {
        const result = await db.query(`
            SELECT appointment_id FROM tbl_appointments
            WHERE doctor_id = ? AND  start_time = ?
        `, [doctor_id, start_time]);
        console.log("result", result)
        return result;
    } catch (error) {
        console.error("Database Error in checkIfSlotAlreadyBooked:", error.message);
        throw error;
    }
};

export const getAppointmentsByUserId = async (user_id) => {
    const results = await db.query(` 
        SELECT a.*,d.*,zu.email,r.pdf,c.clinic_name FROM tbl_appointments a INNER JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
        INNER JOIN tbl_zqnq_users zu ON d.zynq_user_id = zu.id LEFT JOIN tbl_face_scan_results r ON r.face_scan_result_id  = a.report_id 
        INNER JOIN tbl_clinics c ON c.clinic_id  = a.clinic_id
        WHERE a.user_id = ?
        ORDER BY  start_time ASC
    `, [user_id]);
    return results;
};

export const getAppointmentsByDoctorId = async (doctor_id) => {
    const results = await db.query(`
        SELECT a.*, u.* , c.clinic_name FROM tbl_appointments a INNER JOIN tbl_users u ON a.user_id = u.user_id  INNER JOIN tbl_clinics c ON a.clinic_id = c.clinic_id 
        WHERE a.doctor_id = ?
        ORDER BY  start_time ASC
    `, [doctor_id]);
    return results;
};

export const getAppointmentsByClinicId = async (clinic_id) => {
    try {
        const results = await db.query(`
            SELECT 
                a.appointment_id AS appointment_id,
                a.doctor_id AS appointment_doctor_id,
                a.user_id AS appointment_user_id,
                a.clinic_id AS appointment_clinic_id,
                a.start_time AS appointment_start_time,
                a.end_time AS appointment_end_time,
                a.type AS appointment_type,
                a.status AS appointment_status,
                a.created_at AS appointment_created_at,
                a.updated_at AS appointment_updated_at,

                c.clinic_id AS clinic_id,
                c.zynq_user_id AS clinic_zynq_user_id,
                c.clinic_name AS clinic_name,
                c.org_number AS clinic_org_number,
                c.email AS clinic_email,
                c.mobile_number AS clinic_mobile_number,
                c.address AS clinic_address,
                c.is_invited AS clinic_is_invited,
                c.is_active AS clinic_is_active,
                c.is_deleted AS clinic_is_deleted,
                c.onboarding_token AS clinic_onboarding_token,
                c.profile_completion_percentage AS clinic_profile_completion_percentage,
                c.created_at AS clinic_created_at,
                c.updated_at AS clinic_updated_at,
                c.email_sent_at AS clinic_email_sent_at,
                c.email_sent_count AS clinic_email_sent_count,
                c.fee_range AS clinic_fee_range,
                c.website_url AS clinic_website_url,
                c.clinic_description AS clinic_description,
                c.clinic_logo AS clinic_logo,
                c.language AS clinic_language,
                c.form_stage AS clinic_form_stage,
                c.ivo_registration_number AS clinic_ivo_registration_number,
                c.hsa_id AS clinic_hsa_id,
                c.is_onboarded AS clinic_is_onboarded,
                c.is_unsubscribed AS clinic_is_unsubscribed,

                u.user_id AS user_id,
                u.email AS user_email,
                u.full_name AS user_full_name,
                u.age AS user_age,
                u.gender AS user_gender,
                u.mobile_number AS user_mobile_number,
                u.fcm_token AS user_fcm_token,
                u.profile_image AS user_profile_image,
                u.language AS user_language,
                u.is_verified AS user_is_verified,
                u.is_active AS user_is_active,
                u.is_push_notification_on AS user_push_notification_on,
                u.is_location_on AS user_is_location_on,
                u.created_at AS user_created_at,
                u.updated_at AS user_updated_at,
                u.latitude AS user_latitude,
                u.longitude AS user_longitude,
                u.udid AS user_udid,
                u.isOnline AS user_isOnline,

                d.doctor_id AS doctor_id,
                d.zynq_user_id AS doctor_zynq_user_id,
                d.name AS doctor_name,
                d.specialization AS doctor_specialization,
                d.employee_id AS doctor_employee_id,
                d.experience_years AS doctor_experience_years,
                d.rating AS doctor_rating,
                d.fee_per_session AS doctor_fee_per_session,
                d.session_duration AS doctor_session_duration,
                d.currency AS doctor_currency,
                d.phone AS doctor_phone,
                d.age AS doctor_age,
                d.address AS doctor_address,
                d.biography AS doctor_biography,
                d.gender AS doctor_gender,
                d.profile_image AS doctor_profile_image,
                d.created_at AS doctor_created_at,
                d.updated_at AS doctor_updated_at,
                d.profile_completion_percentage AS doctor_profile_completion_percentage,
                d.isOnline AS doctor_isOnline

            FROM tbl_appointments a 
            INNER JOIN tbl_users u ON a.user_id = u.user_id  
            INNER JOIN tbl_clinics c ON a.clinic_id = c.clinic_id 
            INNER JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
            WHERE a.clinic_id = ?
            ORDER BY a.start_time ASC
        `, [clinic_id]);

        return results;
    } catch (error) {
        console.error("Error in getAppointmentsByClinicId:", error);
        throw error;
    }
};

export const updateAppointmentStatus = async (appointment_id, status) => {
    try {
        return await db.query(
            `UPDATE tbl_appointments SET status = ? WHERE appointment_id = ?`,
            [status, appointment_id]
        );
    } catch (error) {
        console.error("Database Error in updating appointment status:", error.message);
        throw error;
    }
};



export const getAppointmentsById = async (user_id, appointment_id) => {
    const results = await db.query(` 
        SELECT a.*,d.*,zu.email FROM tbl_appointments a INNER JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
        INNER JOIN tbl_zqnq_users zu ON d.zynq_user_id = zu.id
        WHERE a.user_id = ? AND a.appointment_id  = ?
    `, [user_id, appointment_id]);
    return results;
};

export const getAppointmentDataByAppointmentID = async (appointment_id) => {
    try {
        const results = await db.query(` 
            SELECT doctor_id, clinic_id FROM tbl_appointments WHERE appointment_id  = ?
        `, [appointment_id]);
        return results;
    } catch (error) {
        console.error("Database Error in getAppointmentDataByAppointmentID:", error.message);
        throw error;

    }
};

export const getAppointmentByIdForDoctor = async (doctor_id, appointment_id) => {
    try {
        const results = await db.query(`
         SELECT a.*, u.* , c.clinic_name , r.pdf FROM tbl_appointments a INNER JOIN tbl_users u ON a.user_id = u.user_id  INNER JOIN tbl_clinics c ON a.clinic_id = c.clinic_id LEFT JOIN tbl_face_scan_results r ON r.face_scan_result_id  = a.report_id
         WHERE a.doctor_id = ? AND a.appointment_id  = ?
         ORDER BY  start_time ASC
     `, [doctor_id, appointment_id]);
        return results;
    } catch (error) {
        console.error("Database Error in getAppointmentByIdForDoctor:", error.message);
        throw error;

    }
};

export const rescheduleAppointment = async (appointment_id, start_time, end_time) => {
    try {
        return await db.query(`UPDATE tbl_appointments SET start_time = ?, end_time = ?, status = "Rescheduled" WHERE appointment_id = ?`, [start_time, end_time, appointment_id]);
    } catch (error) {
        console.error("Database Error in rescheduling appointment:", error.message);
        throw error;
    }
};

export const rateAppointment = async ({ appointment_id, clinic_id, doctor_id, user_id, rating, review }) => {
    try {
        return await db.query(`INSERT INTO tbl_appointment_ratings (appointment_id, clinic_id, doctor_id, user_id, rating, review) VALUES (?, ?, ?, ?, ?, ?)`, [appointment_id, clinic_id, doctor_id, user_id, rating, review]);
    } catch (error) {
        console.error("Database Error in rating appointment:", error.message);
        throw error;
    }
};