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
        SELECT a.*,d.*,zu.email FROM tbl_appointments a INNER JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
        INNER JOIN tbl_zqnq_users zu ON d.zynq_user_id = zu.id
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
    const results = await db.query(`
        SELECT 
            a.*, 
            c.clinic_name,
            u.user_id,
            u.email,
            u.full_name,
            u.age,
            u.gender,
            u.mobile_number,
            u.fcm_token,
            u.profile_image,
            u.language,
            u.is_verified,
            u.is_active,
            u.is_push_notification_on,
            u.is_location_on,
            u.created_at,
            u.updated_at,
            u.latitude,
            u.longitude,
            u.udid,
            u.isOnline
        FROM tbl_appointments a 
        INNER JOIN tbl_users u ON a.user_id = u.user_id  
        INNER JOIN tbl_clinics c ON a.clinic_id = c.clinic_id 
        WHERE a.clinic_id = ?
        ORDER BY a.start_time ASC
    `, [clinic_id]);

    return results;
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

export const getAppointmentByIdForDoctor = async (doctor_id, appointment_id) => {
    const results = await db.query(`
        SELECT a.*, u.* , c.clinic_name FROM tbl_appointments a INNER JOIN tbl_users u ON a.user_id = u.user_id  INNER JOIN tbl_clinics c ON a.clinic_id = c.clinic_id 
        WHERE a.doctor_id = ? AND a.appointment_id  = ?
        ORDER BY  start_time ASC
    `, [doctor_id, appointment_id]);
    return results;
};

export const rescheduleAppointment = async (appointment_id, start_time, end_time) => {
    try {
        return await db.query(`UPDATE tbl_appointments SET start_time = ?, end_time = ? WHERE appointment_id = ?`, [start_time, end_time, appointment_id]);
    } catch (error) {
        console.error("Database Error in rescheduling appointment:", error.message);
        throw error;
    }
};