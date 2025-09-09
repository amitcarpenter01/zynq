import db from "../config/db.js";
import { get_web_user_by_id } from "./web_user.js";
import { extractUserData } from "../utils/misc.util.js";
import { isEmpty } from "../utils/user_helper.js";
import { get_product_images_by_product_ids } from "./api.js";


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
              AND status != 'Cancelled'
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
        const result = await db.query(`
            SELECT d.*, zu.email 
            FROM tbl_doctors d
            LEFT JOIN tbl_zqnq_users zu ON d.zynq_user_id = zu.id
            WHERE d.doctor_id = ?`, [doctor_id]);
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

export const getDoctorByDoctorID = async (doctor_id, clinic_id) => {
    try {
        const query = `
            SELECT dcm.*, d.*, zu.email, cl.latitude, cl.longitude, c.clinic_name, c.clinic_logo
            FROM tbl_doctor_clinic_map dcm
            JOIN tbl_doctors d ON dcm.doctor_id = d.doctor_id
            JOIN tbl_zqnq_users zu ON d.zynq_user_id = zu.id
            JOIN tbl_clinic_locations cl ON cl.clinic_id = dcm.clinic_id
            JOIN tbl_clinics c ON c.clinic_id = dcm.clinic_id
            WHERE d.doctor_id = ? AND dcm.clinic_id = ? ORDER BY dcm.created_at DESC`;

        const result = await db.query(query, [doctor_id, clinic_id]);

        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor by doctor id.");
    }
};

// -----------------------------
// Role-specific dashboards
// -----------------------------
const getDoctorDashboard = async (doctorId) => {
    const query = `
    SELECT 
      COUNT(DISTINCT a.user_id) AS total_patients,
      COUNT(a.appointment_id) AS total_appointments,
      ROUND(AVG(ar.rating), 2) AS average_rating,
      ROUND(IFNULL(SUM(
        CASE WHEN a.save_type = 'booked' AND a.total_price > 0 
             THEN a.clinic_earnings ELSE 0 END
      ), 0), 2) AS clinic_appointment_earnings,
(
  SELECT ROUND(IFNULL(zw.amount, 0), 2)
  FROM zynq_users_wallets zw
  WHERE zw.user_id = ? AND zw.user_type = 'DOCTOR'
  LIMIT 1
) AS wallet_earnings

    FROM tbl_appointments a
    LEFT JOIN tbl_appointment_ratings ar 
           ON a.appointment_id = ar.appointment_id 
           AND ar.approval_status = 'APPROVED'
    WHERE a.doctor_id = ?
  `;

    const [dashboard = {}] = await db.query(query, [doctorId, doctorId]);

    return {
        total_patients: Number(dashboard.total_patients || 0),
        total_appointments: Number(dashboard.total_appointments || 0),
        average_rating: Number(dashboard.average_rating || 0),
        total_doctors: 0,
        clinic_product_earnings: 0, // doctors don’t earn from products
        clinic_appointment_earnings: Number(dashboard.clinic_appointment_earnings || 0),
        wallet_earnings: Number(dashboard.wallet_earnings || 0),
        role: "DOCTOR",
    };
};

const getSoloDoctorDashboard = async (doctorId, clinicId) => {
    const query = `
    SELECT 
      COUNT(DISTINCT a.user_id) AS total_patients,
      COUNT(a.appointment_id) AS total_appointments,
      ROUND(AVG(ar.rating), 2) AS average_rating,

      -- Clinic product earnings (if solo doctor is mapped to a clinic)
      (
        SELECT ROUND(IFNULL(SUM(pp.clinic_earnings), 0), 2)
        FROM tbl_product_purchase pp
        JOIN tbl_carts cart ON pp.cart_id = cart.cart_id
        WHERE cart.clinic_id = ?
      ) AS clinic_product_earnings,

      -- Clinic appointment earnings
      (
        SELECT ROUND(IFNULL(SUM(sa.clinic_earnings), 0), 2)
        FROM tbl_appointments sa
        WHERE sa.clinic_id = ? 
          AND sa.save_type = 'booked'
          AND sa.total_price > 0
      ) AS clinic_appointment_earnings,

      -- Wallet earnings
(
  SELECT ROUND(IFNULL(zw.amount, 0), 2)
  FROM zynq_users_wallets zw
  WHERE zw.user_id = ? AND zw.user_type = 'SOLO_DOCTOR'
  LIMIT 1
) AS wallet_earnings

    FROM tbl_appointments a
    LEFT JOIN tbl_appointment_ratings ar ON a.appointment_id = ar.appointment_id AND ar.approval_status = 'APPROVED'
    WHERE a.doctor_id = ?
  `;

    const [row = {}] = await db.query(query, [
        clinicId,
        clinicId,
        doctorId,
        doctorId
    ]);

    return {
        total_patients: Number(row.total_patients || 0),
        total_appointments: Number(row.total_appointments || 0),
        average_rating: Number(row.average_rating || 0),
        total_doctors: 0, // always 0 for solo doctor

        clinic_product_earnings: Number(row.clinic_product_earnings || 0),
        clinic_appointment_earnings: Number(row.clinic_appointment_earnings || 0),
        wallet_earnings: Number(row.wallet_earnings || 0),

        role: "SOLO_DOCTOR",
    };
};

const getClinicDashboard = async (clinicId) => {
    const query = `
    SELECT 
      COUNT(DISTINCT a.user_id) AS total_patients,
      COUNT(a.appointment_id) AS total_appointments,
      ROUND(AVG(ar.rating), 2) AS average_rating,
      COUNT(DISTINCT map.doctor_id) AS total_doctors,

      ROUND(IFNULL(SUM(CASE 
        WHEN a.save_type = 'booked' AND a.total_price > 0 THEN a.clinic_earnings 
        ELSE 0 END), 0), 2) AS clinic_appointment_earnings,

      ROUND(IFNULL(SUM(pp.clinic_earnings), 0), 2) AS clinic_product_earnings,

      -- Inline wallet earnings
(
  SELECT ROUND(IFNULL(zw.amount, 0), 2)
  FROM zynq_users_wallets zw
  WHERE zw.user_id = c.clinic_id 
    AND zw.user_type = 'CLINIC'
  LIMIT 1
) AS wallet_earnings


    FROM tbl_clinics c
    LEFT JOIN tbl_appointments a ON a.clinic_id = c.clinic_id
    LEFT JOIN tbl_appointment_ratings ar ON a.appointment_id = ar.appointment_id AND ar.approval_status = 'APPROVED'
    LEFT JOIN tbl_doctor_clinic_map map ON map.clinic_id = c.clinic_id
    LEFT JOIN tbl_carts cart ON cart.clinic_id = c.clinic_id
    LEFT JOIN tbl_product_purchase pp ON pp.cart_id = cart.cart_id
    WHERE c.clinic_id = ?
  `;

    const [row = {}] = await db.query(query, [clinicId]);

    return {
        total_patients: Number(row.total_patients || 0),
        total_appointments: Number(row.total_appointments || 0),
        average_rating: Number(row.average_rating || 0),
        total_doctors: Number(row.total_doctors || 0),
        clinic_product_earnings: Number(row.clinic_product_earnings || 0),
        clinic_appointment_earnings: Number(row.clinic_appointment_earnings || 0),
        wallet_earnings: Number(row.wallet_earnings || 0),
        role: "CLINIC",
    };
};

export const getDashboardData = async (userData) => {
    try {
        const { user_id, role } = extractUserData(userData);

        switch (role) {
            case "DOCTOR":
                return await getDoctorDashboard(user_id);
            case "SOLO_DOCTOR":
                return await getSoloDoctorDashboard(user_id, userData.clinicData.clinic_id);
            case "CLINIC":
                return await getClinicDashboard(user_id);
            default:
                throw new Error("Unsupported role");
        }
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch dashboard data.");
    }
};

const APP_URL = process.env.APP_URL

export const getClinicPurchasedProductModel = async (clinic_id) => {
    try {
        // 1️⃣ Fetch all purchases with user & address data
        const purchaseRows = await db.query(`
            SELECT 
                pp.purchase_id,
                pp.cart_id,
                pp.product_details, 
                pp.total_price,
                pp.clinic_earnings,
                pp.admin_earnings,
                pp.created_at AS purchase_date,
                pp.shipment_status,
                pp.shipped_date,
                pp.delivered_date,
                u.user_id,
                u.full_name AS user_name,
                u.email AS user_email,
                u.mobile_number,
                a.address
            FROM tbl_product_purchase pp
            JOIN tbl_users u ON pp.user_id = u.user_id
            LEFT JOIN tbl_address a ON pp.address_id = a.address_id
            ORDER BY pp.created_at DESC
        `);

        // 2️⃣ Extract all unique product IDs from purchases
        const allProductIds = [
            ...new Set(
                purchaseRows.flatMap(row =>
                    Array.isArray(row.product_details)
                        ? row.product_details.map(p => p.product_id)
                        : []
                )
            )
        ];

        if (!allProductIds.length) return [];

        // 3️⃣ Fetch product info for this clinic only
        const productRows = await db.query(
            `SELECT product_id, stock, clinic_id FROM tbl_products WHERE clinic_id = ? AND product_id IN (?)`,
            [clinic_id, allProductIds]
        );

        const productInfoMap = Object.fromEntries(productRows.map(p => [p.product_id, p]));

        // 4️⃣ Fetch clinic info once
        const clinic = await db.query(
            `SELECT clinic_id, clinic_name, address, clinic_logo FROM tbl_clinics WHERE clinic_id = ?`,
            [clinic_id]
        ).then(rows => rows[0] || null);

        // 5️⃣ Fetch product images for relevant products
        const imageRows = await get_product_images_by_product_ids(Object.keys(productInfoMap));
        const imagesMap = imageRows.reduce((map, row) => {
            if (!map[row.product_id]) map[row.product_id] = [];
            map[row.product_id].push(
                row.image.startsWith('http') ? row.image : `${APP_URL}clinic/product_image/${row.image}`
            );
            return map;
        }, {});

        // 6️⃣ Build purchases with enriched products
        const purchases = purchaseRows.map(row => {
            const enrichedProducts = (Array.isArray(row.product_details) ? row.product_details : [])
                .filter(p => productInfoMap[p.product_id]) // only clinic's products
                .map(p => ({
                    ...p,
                    stock: productInfoMap[p.product_id].stock ?? 0,
                    clinic_id: productInfoMap[p.product_id].clinic_id ?? null,
                    product_images: imagesMap[p.product_id] || [],
                }));

            if (!enrichedProducts.length) return null;

            return {
                purchase_id: row.purchase_id,
                purchase_type: "PRODUCT",
                cart_id: row.cart_id,
                purchase_date: row.purchase_date,
                delivered_date: row.delivered_date || null,
                shipped_date: row.shipped_date || null,
                total_price: row.total_price,
                clinic_earnings: row.clinic_earnings,
                admin_earnings: row.admin_earnings,
                address: row.address,
                shipment_status: row.shipment_status,
                clinic,
                user: {
                    user_id: row.user_id,
                    name: row.user_name || null,
                    email: row.user_email || null,
                    mobile_number: row.mobile_number || null,
                },
                products: enrichedProducts,
            };
        }).filter(Boolean); // remove nulls

        return purchases;

    } catch (error) {
        console.error("Failed to fetch clinic purchased product data:", error);
        throw error;
    }
};

export const getClinicCartProductModel = async (clinic_id) => {
    try {
        const query = `
      SELECT pp.* FROM tbl_product_purchase pp JOIN tbl_carts c ON pp.cart_id = c.cart_id WHERE c.clinic_id = ? ORDER BY created_at DESC
    `;
        const results = await db.query(query, [clinic_id]);
        return results;
    } catch (error) {
        console.error("Failed to fetch purchase products data:", error);
        throw error;
    }
};

export const getSingleClinicPurchasedProductModel = async (clinic_id, purchase_id) => {
    try {
        const query = `
            SELECT 
                pp.purchase_id,
                pp.cart_id,
                pp.product_details, 
                pp.total_price,
                pp.created_at AS purchase_date,
                pp.shipment_status,
                pp.shipped_date,
                pp.delivered_date,
                u.user_id,
                u.full_name AS user_name,
                u.email AS user_email,
                u.mobile_number,
                a.address
            FROM tbl_product_purchase pp
            LEFT JOIN tbl_carts c ON pp.cart_id = c.cart_id
            LEFT JOIN tbl_users u ON pp.user_id = u.user_id
            LEFT JOIN tbl_address a ON pp.address_id = a.address_id
            WHERE c.clinic_id = ? AND pp.purchase_id = ?
            ORDER BY pp.created_at DESC
        `;
        const purchaseRows = await db.query(query, [clinic_id, purchase_id]);

        // 1️⃣ Collect all product IDs from purchases for this clinic
        let allProductIds = [];
        let filteredPurchases = [];

        for (const row of purchaseRows) {
            const products = Array.isArray(row.product_details) ? row.product_details : [];
            const productIds = products.map(p => p.product_id);
            allProductIds.push(...productIds);
            filteredPurchases.push(row);
        }
        allProductIds = [...new Set(allProductIds)];

        // 2️⃣ Fetch product info for this clinic only
        let productInfoMap = {};
        if (allProductIds.length) {
            const productRows = await db.query(
                `SELECT product_id, stock, clinic_id FROM tbl_products WHERE clinic_id = ? AND product_id IN (?)`,
                [clinic_id, allProductIds]
            );
            productInfoMap = productRows.reduce((map, p) => {
                map[p.product_id] = p;
                return map;
            }, {});
        }

        // 3️⃣ Fetch clinic info (single clinic)
        const clinicRows = await db.query(
            `SELECT clinic_id, clinic_name, address, clinic_logo FROM tbl_clinics WHERE clinic_id = ?`,
            [clinic_id]
        );
        const clinicMap = clinicRows.reduce((map, c) => {
            map[c.clinic_id] = c;
            return map;
        }, {});

        // 4️⃣ Fetch product images
        let imagesMap = {};
        if (allProductIds.length) {
            const imageRows = await get_product_images_by_product_ids(allProductIds);
            imagesMap = imageRows.reduce((map, row) => {
                if (!map[row.product_id]) map[row.product_id] = [];
                map[row.product_id].push(
                    row.image.startsWith('http') ? row.image : `${APP_URL}clinic/product_image/${row.image}`
                );
                return map;
            }, {});
        }

        // 5️⃣ Build purchases with enriched products
        const purchases = {};
        for (const row of filteredPurchases) {
            const products = Array.isArray(row.product_details) ? row.product_details : [];
            const enrichedProducts = products
                .filter(p => productInfoMap[p.product_id]) // keep only products from this clinic
                .map(p => {
                    const prodInfo = productInfoMap[p.product_id] || {};
                    return {
                        ...p,
                        stock: prodInfo.stock ?? 0,
                        clinic_id: prodInfo.clinic_id ?? null,
                        product_images: imagesMap[p.product_id] || [],
                    };
                });

            if (!enrichedProducts.length) continue; // skip if no clinic products

            const clinic = clinicMap[clinic_id] || null;

            purchases[row.purchase_id] = {
                purchase_id: row.purchase_id,
                purchase_type: "PRODUCT",
                cart_id: row.cart_id,
                purchase_date: row.purchase_date,
                delivered_date: row.delivered_date || null,
                shipped_date: row.shipped_date || null,
                total_price: row.total_price,
                address: row.address,
                shipment_status: row.shipment_status,
                clinic,
                user: {
                    user_id: row.user_id,
                    name: row.user_name || null,
                    email: row.user_email || null,
                    mobile_number: row.mobile_number || null,
                },
                products: enrichedProducts,
            };
        }

        return Object.values(purchases);
    } catch (error) {
        console.error("Failed to fetch clinic purchased product data:", error);
        throw error;
    }
};

export const getSingleClinicCartProductModel = async (clinic_id, purchase_id) => {
    try {
        const query = `
      SELECT pp.* FROM tbl_product_purchase pp JOIN tbl_carts c ON pp.cart_id = c.cart_id WHERE c.clinic_id = ? ORDER BY created_at DESC
    `;
        const results = await db.query(query, [clinic_id]);
        return results;
    } catch (error) {
        console.error("Failed to fetch purchase products data:", error);
        throw error;
    }
};