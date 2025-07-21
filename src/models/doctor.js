import db from "../config/db.js";
import { get_web_user_by_id } from "./web_user.js";
import { extractUserData } from "../utils/misc.util.js";
import { isEmpty } from "../utils/user_helper.js";


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

export const update_doctor_treatments = async (doctorId, treatments) => {
    try {
        await db.query(`DELETE FROM tbl_doctor_treatments WHERE doctor_id = ?`, [doctorId]);

        const values = treatments.map(t => [
            doctorId,
            t.treatment_id,
            t.price,
            t.add_notes || null,
            t.session_duration || null
        ]);

        if (values.length > 0) {
            const insertQuery = `
                INSERT INTO tbl_doctor_treatments (
                    doctor_id,
                    treatment_id,
                    price,
                    add_notes,
                    session_duration
                ) VALUES ?
            `;
            return await db.query(insertQuery, [values]);
        }

        return null;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update doctor's treatments.");
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

export const update_availability = async (doctorId, availabilityData, clinic_id) => {
    try {
        // await db.query(`DELETE FROM tbl_doctor_availability WHERE doctor_id = ?`, [doctorId]);
        const values = availabilityData.map(avail => [doctorId, avail.day_of_week, avail.start_time, avail.end_time, avail.closed, avail.fee_per_session, clinic_id]);
        if (values.length > 0) {
            return await db.query(`INSERT INTO tbl_doctor_availability (doctor_id, day_of_week, start_time, end_time,closed,fee_per_session, clinic_id) VALUES ?`, [values]);
        }
        return null;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update availability.");
    }
};

export const update_docter_availability = async (updatedFields, id) => {
    const keys = Object.keys(updatedFields);
    const values = Object.values(updatedFields);
    const setClause = keys.map((key) => `${key} = ?`).join(", ");
    values.push(id);
    const query = `UPDATE tbl_doctor_availability SET ${setClause} WHERE doctor_availability_id = ?`;
    return db.query(query, values);
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
        const skinCondition = await get_doctor_skin_condition(doctorId);
        const surgery = await get_doctor_surgeries(doctorId);
        const aestheticDevices = await get_doctor_aesthetic_devices(doctorId)

        console.log("aestheticModel", aestheticDevices);

        return {
            ...mainUser,
            ...doctor,
            education,
            experience,
            treatments,
            skinTypes,
            severityLevels,
            availability,
            certifications,
            skinCondition,
            surgery,
            aestheticDevices
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


export const update_doctor_surgery = async (doctorId, surgeryIds) => {
    try {
        await db.query(`DELETE FROM tbl_doctor_surgery WHERE doctor_id = ?`, [doctorId]);
        const values = surgeryIds.map(surgeryId => [doctorId, surgeryId]);
        if (values.length > 0) {
            return await db.query(`INSERT INTO tbl_doctor_surgery (doctor_id, surgery_id) VALUES ?`, [values]);
        }
        return null;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update doctor's surgery.");
    }
};

export const update_doctor_skin_conditions = async (doctorId, surgeryIds) => {
    try {
        await db.query(`DELETE FROM tbl_doctor_skin_condition WHERE doctor_id = ?`, [doctorId]);
        const values = surgeryIds.map(surgeryId => [doctorId, surgeryId]);
        if (values.length > 0) {
            return await db.query(`INSERT INTO tbl_doctor_skin_condition (doctor_id, skin_condition_id) VALUES ?`, [values]);
        }
        return null;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update doctor's surgery.");
    }
};


export const update_doctor_aesthetic_devices = async (doctorId, aestheticDevicesIds) => {
    try {
        await db.query(`DELETE FROM tbl_doctor_aesthetic_devices WHERE doctor_id = ?`, [doctorId]);
        const values = aestheticDevicesIds.map(aestheticDevicesId => [doctorId, aestheticDevicesId]);
        if (values.length > 0) {
            return await db.query(`INSERT INTO tbl_doctor_aesthetic_devices (doctor_id, aesthetic_devices_id) VALUES ?`, [values]);
        }
        return null;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update doctor's aesthetic devices.");
    }
};

export const get_doctor_skin_condition = async (doctorId) => {
    try {
        return await db.query(`
            SELECT 
                dsc.*, 
                tsc.*
            FROM 
                tbl_doctor_skin_condition dsc
            LEFT JOIN 
                tbl_skin_conditions tsc ON dsc.skin_condition_id = tsc.skin_condition_id
            WHERE 
                dsc.doctor_id = ?`, [doctorId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor's skin conditions.");
    }
};


export const get_doctor_surgeries = async (doctorId) => {
    try {
        return await db.query(`
            SELECT 
                ds.*, 
                s.*
            FROM 
                tbl_doctor_surgery ds
            LEFT JOIN 
                tbl_surgery s ON ds.surgery_id = s.surgery_id
            WHERE 
                ds.doctor_id = ?`, [doctorId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor's surgeries.");
    }
};


export const get_doctor_aesthetic_devices = async (doctorId) => {
    try {
        return await db.query(`
            SELECT 
                dad.*, 
                ad.*
            FROM 
                tbl_doctor_aesthetic_devices dad
            LEFT JOIN 
                tbl_aesthetic_devices ad ON dad.aesthetic_devices_id  = ad.aesthetic_device_id
            WHERE 
                dad.doctor_id = ?`, [doctorId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor's aesthetic devices.");
    }
};

export const fetchDocterAvibilityById = async (doctor_id) => {
    try {
        const result = await db.query('SELECT * FROM tbl_doctor_availability WHERE doctor_id = ? ORDER BY created_at DESC', [doctor_id]);
        return result;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch support tickets.");
    }
}


// -------------------------------------slot managment------------------------------------------------//



export const insertDoctorAvailabilityModel = async (data) => {
    return db.query("INSERT INTO tbl_doctor_availability SET ?", [data]);
};

export const fetchDoctorAvailabilityModel = async (doctor_id) => {
    return db.query("SELECT * FROM tbl_doctor_availability WHERE doctor_id = ?", [doctor_id]);
};

export const fetchAppointmentsModel = async (doctor_id, date, start_time) => {
    return db.query("SELECT * FROM tbl_appointments WHERE doctor_id = ? AND date = ? AND start_time = ?", [doctor_id, date, start_time]);
};

export const update_doctor_fee_per_session = async (doctorId, feePerSession) => {
    try {

        return await db.query(`UPDATE tbl_doctors SET fee_per_session = ? WHERE doctor_id = ?`, [feePerSession, doctorId]);

    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update consultation fee.");
    }
};


export const deleteDoctorAvailabilityByDoctorId = async (doctor_id) => {
    return db.query("DELETE FROM tbl_doctor_availability WHERE doctor_id = ?", [doctor_id]);
};

export const update_doctor_is_online = async (doctorId, isOnline) => {
    return db.query("UPDATE tbl_doctors SET isOnline = ? WHERE doctor_id = ?", [isOnline, doctorId]);
};


// doctorModels.js
// export const fetchAppointmentsBulkModel = async (doctor_id, start_date, end_date) => {
//     const query = `
//         SELECT date, start_time, COUNT(*) as count
//         FROM tbl_appointments
//         WHERE doctor_id = ?
//         AND date BETWEEN ? AND ?
//         GROUP BY date, start_time
//     `;
//     const results = await db.query(query, [doctor_id, start_date, end_date]);
//     return results;
// };

export const fetchAppointmentsBulkModel = async (doctorId, fromDate, toDate) => {
    try {
        const query = `
            SELECT start_time 
            FROM tbl_appointments 
            WHERE doctor_id = ? 
              AND start_time >= ? 
              AND start_time <= ?
        `;
        return await db.query(query, [doctorId, `${fromDate} 00:00:00`, `${toDate} 23:59:59`]);
    } catch (error) {
        console.error("DB Error in fetchAppointmentsBulkModel:", error);
        throw error;
    }
};


export const createOrUpdateCallLog = async ({
    call_id,
    sender_user_id,
    sender_doctor_id,
    receiver_user_id,
    receiver_doctor_id,
    status,
    started_at
}) => {
    try {
        await db.query(`
      INSERT INTO tbl_call_logs (
        call_id, sender_user_id, sender_doctor_id,
        receiver_user_id, receiver_doctor_id, status, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        started_at = VALUES(started_at)
    `, [
            call_id,
            sender_user_id,
            sender_doctor_id,
            receiver_user_id,
            receiver_doctor_id,
            status,
            started_at
        ]);
    } catch (error) {
        console.error("Error in createOrUpdateCallLog:", error);
        throw error;
    }
};

export const getDocterByDocterId = async (doctor_id) => {
    try {
        const result = await db.query('SELECT * FROM tbl_doctors WHERE doctor_id = ?', [doctor_id]);
        return result;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch support tickets.");
    }
}


export const getSoloDoctorByZynqUserId = async (zynq_user_id) => {
    try {
        const result = await db.query('SELECT * FROM tbl_zqnq_users WHERE id = ?', [zynq_user_id]);
        return result;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch support tickets.");
    }
}

export const getDoctorByDoctorID = async (doctor_id) => {
    try {
        const query = `
            SELECT dcm.*, d.*, zu.email
            FROM tbl_doctor_clinic_map dcm
            JOIN tbl_doctors d ON dcm.doctor_id = d.doctor_id
            JOIN tbl_zqnq_users zu ON d.zynq_user_id = zu.id
            WHERE d.doctor_id = ? ORDER BY dcm.created_at DESC`;

        const result = await db.query(query, [doctor_id]);

        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor by doctor id.");
    }
};

export const getDashboardDataByRole = async (id, role) => {
    if (!['DOCTOR', 'SOLO_DOCTOR', 'CLINIC'].includes(role)) {
        throw new Error('Invalid role provided');
    }

    const isClinic = role === 'CLINIC';
    const whereField = isClinic ? 'a.clinic_id' : 'a.doctor_id';
    const values = [id];

    // SELECT fields
    const selectFields = [
        'COUNT(DISTINCT a.user_id) AS total_patients',
        `COUNT(CASE WHEN DATE(a.start_time) = CURDATE() THEN 1 ELSE NULL END) AS today_appointments`,
        'ROUND(AVG(ar.rating), 2) AS average_rating',
    ];

    if (isClinic) {
        selectFields.push('COUNT(DISTINCT map.doctor_id) AS total_doctors');
    }

    // JOINs
    const joinClauses = [
        'LEFT JOIN tbl_appointment_ratings ar ON a.appointment_id = ar.appointment_id',
    ];

    if (isClinic) {
        joinClauses.push('LEFT JOIN tbl_doctor_clinic_map map ON map.clinic_id = a.clinic_id');
    }

    const query = `
        SELECT ${selectFields.join(',\n        ')}
        FROM tbl_appointments a
        ${joinClauses.join('\n        ')}
        WHERE ${whereField} = ?
    `;

    try {
        const [dashboard] = await db.query(query, values);
        return dashboard;
    } catch (error) {
        console.error('[DashboardDataError]', error);
        throw new Error('Failed to fetch dashboard data.');
    }
};

export const getDashboardData = async (userData) => {
    try {
        const { user_id, role } = extractUserData(userData);
        let results = await getDashboardDataByRole(user_id, role);
        if (!isEmpty(results)) results.total_earnings = 0
        return results;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch dashboard data.");
    }
};