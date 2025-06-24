import db from "../config/db.js";

//======================================= Admin =========================================

export const findEmail = async (email) => {
    // try {
    return await db.query('SELECT * FROM `tbl_admin` WHERE email = ?', [email]);
    // } catch (error) {
    //     console.error("Database Error:", error.message);
    //     throw new Error("Failed to get admin data.");
    // }
};

export const updateData = async (admin_id, token, fcm_token) => {
    try {
        return await db.query('UPDATE `tbl_admin` SET jwt_token = ?, fcm_token = ? WHERE admin_id = ?', [token, fcm_token, admin_id]);
    } catch (error) {
        console.error("Update Error:", error.message);
        throw new Error("Failed to update admin token.");
    }
};

export const findById = async (admin_id) => {
    try {
        return await db.query('SELECT * FROM `tbl_admin` WHERE admin_id = ?', [admin_id])
    } catch (error) {
        console.error("Update Error:", error.message);
        throw new Error("Failed to update admin token.");
    }
};

export const updatePassword = async (admin_id, password) => {
    try {
        return await db.query('UPDATE `tbl_admin` SET password = ? WHERE admin_id = ?', [password, admin_id]);
    } catch (error) {
        console.error("Update Error:", error.message);
        throw new Error("Failed to update password.");
    }
};

export const updateProfile = async (admin_id, updateData) => {
    try {
        return await db.query('UPDATE `tbl_admin` SET `full_name` = ?,`email` = ?,`mobile_number` = ?,`profile_image`= ? WHERE admin_id = ?', [updateData.full_name, updateData.email, updateData.mobile_number, updateData.profile_image, admin_id])
    } catch (error) {
        console.error("Update Error:", error.message);
        throw new Error("Failed to update profile.");
    }
};

//======================================= Dashboard =========================================

export const get_clinics = async () => {
    try {
        return await db.query('SELECT * FROM `tbl_clinics` WHERE is_deleted = 0;');
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get dashboard clinic data.");
    }
};

export const get_doctors = async () => {
    try {
        return await db.query('SELECT * FROM `tbl_doctors`');
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get dashboard doctor data.");
    }
};

export const get_users = async () => {
    try {
        return await db.query('SELECT * FROM `tbl_users` WHERE is_verified = 1;');
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get dashboard users data.");
    }
};

export const get_latest_clinic = async () => {
    try {
        return await db.query('SELECT clinic_id, clinic_name, address, DATE_FORMAT(created_at, "%M %d, %Y") AS date_joined, profile_completion_percentage AS onboarding_progress FROM `tbl_clinics` WHERE is_deleted = 0 ORDER BY created_at DESC;')
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get dashboard latest data.");
    }
};

//======================================= User Managment =========================================
export const get_users_managment = async () => {
    try {
        return await db.query(`SELECT tbl_users.*, COUNT(DISTINCT tbl_face_scan_results.face_scan_result_id) AS total_ai_scan_done, COUNT(DISTINCT tbl_appointments.appointment_id) AS total_appointment FROM tbl_users LEFT JOIN tbl_face_scan_results ON tbl_face_scan_results.user_id = tbl_users.user_id LEFT JOIN tbl_appointments ON tbl_appointments.patient_id = tbl_users.user_id WHERE tbl_users.is_verified = 1 GROUP BY tbl_users.user_id ORDER BY tbl_users.created_at DESC;`);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get user latest data.");
    }
};

export const get_all_face_scan_results = async () => {
    try {
        const rows = await db.query(`SELECT * FROM tbl_face_scan_results`);
        return rows;
    } catch (error) {
        console.error("Error fetching face scan results:", error);
        throw error;
    }
};




export const update_user_status = async (user_id, is_active) => {
    try {
        return await db.query('UPDATE `tbl_users` SET `is_active`= "' + is_active + '" WHERE user_id = "' + user_id + '"')
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update user status.");
    }
};

//======================================= Clinic Managment =========================================

export const findRole = async (role) => {
    try {
        const [rows] = await db.query('SELECT * FROM `tbl_roles` WHERE role = ?', [role]);
        return rows;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to find role.");
    }
};

export const findClinicEmail = async (email) => {
    try {
        return await db.query('SELECT * FROM `tbl_zqnq_users` WHERE email = ?', [email]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to find zynq users email.");
    }
};

export const addClinic = async (data) => {
    try {
        return await db.query(
            'INSERT INTO `tbl_clinics`(`zynq_user_id`, `clinic_name`, `org_number`, `email`, `mobile_number`, `address`) VALUES (?, ?, ?, ?, ?, ?)',
            [data.zynq_user_id, data.clinic_name, data.org_number, data.email, data.mobile_number, data.address]
        );
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to add clinic.");
    }
};

export const findClinicByClinicUserId = async (id) => {
    try {
        return await db.query('SELECT * FROM `tbl_clinics` WHERE zynq_user_id = ?', [id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to find clinic by zynq user id.");
    }
};

export const addClinicLocationAddress = async (data) => {
    try {
        return await db.query(
            'INSERT INTO `tbl_clinic_locations`(`clinic_id`, `city`, `zip_code`) VALUES (?, ?, ?)',
            [data.clinic_id, data.city, data.zip_code]
        );
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to add zynq user.");
    }
}

export const addZynqUsers = async (data) => {
    try {
        const result = await db.query(
            'INSERT INTO `tbl_zqnq_users`(`email`, `role_id`) VALUES (?, ?)',
            [data.email, data.role_id]
        );

        return result;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to add zynq user.");
    }
};

export const insert_clinic = async (clinic) => {
    try {
        return await db.query(
            `INSERT INTO tbl_clinics 
            (clinic_name, org_number, email, mobile_number, address, onboarding_token, is_invited) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                clinic.clinic_name,
                clinic.org_number,
                clinic.email,
                clinic.mobile_number,
                clinic.address,
                clinic.token,
                false
            ]
        );
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert clinic data.");
    }
};

// export const get_clinic_managment = async () => {
//     try {
//         return await db.query(`SELECT tbl_clinics.clinic_id, tbl_clinics.clinic_name, tbl_clinics.org_number, tbl_clinics.email, tbl_clinics.mobile_number, tbl_clinics.address, tbl_clinics.email_sent_count, tbl_clinics.clinic_logo, tbl_clinics.clinic_description, tbl_clinics.website_url, tbl_clinics.profile_completion_percentage AS onboarding_progress, tbl_clinic_locations.city, tbl_clinic_locations.zip_code AS postal_code,tbl_clinics.ivo_registration_number , tbl_clinics.hsa_id FROM tbl_clinics LEFT JOIN tbl_clinic_locations ON tbl_clinic_locations.clinic_id = tbl_clinics.clinic_id WHERE tbl_clinics.is_deleted = 0 ORDER BY tbl_clinics.created_at DESC;`);
//     } catch (error) {
//         console.error("Database Error:", error.message);
//         throw new Error("Failed to get clinic latest data.");
//     }
// };

export const get_clinic_managment = async () => {
    try {
        return await db.query(`
            SELECT 
                c.clinic_id, 
                c.clinic_name, 
                c.org_number, 
                c.email, 
                c.mobile_number, 
                c.address, 
                c.email_sent_count, 
                c.clinic_logo, 
                c.clinic_description, 
                c.website_url, 
                c.profile_completion_percentage AS onboarding_progress, 
                cl.city, 
                cl.zip_code AS postal_code,
                c.ivo_registration_number, 
                c.hsa_id,

                -- Label the user type
                CASE 
                    WHEN zu.role_id = '2fc0b43c-3196-11f0-9e07-0e8e5d906eef' THEN 'Clinic'
                    WHEN zu.role_id = '407595e3-3196-11f0-9e07-0e8e5d906eef' THEN 'Solo Doctor'
                END AS user_type

            FROM tbl_clinics c

            LEFT JOIN tbl_clinic_locations cl 
                ON cl.clinic_id = c.clinic_id

            LEFT JOIN tbl_zqnq_users zu 
                ON zu.id = c.zynq_user_id

            WHERE c.is_deleted = 0
              AND zu.role_id IN (
                  '2fc0b43c-3196-11f0-9e07-0e8e5d906eef',  -- Clinic
                  '407595e3-3196-11f0-9e07-0e8e5d906eef'   -- Solo Doctor
              )

            ORDER BY c.created_at DESC
        `);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get clinic latest data.");
    }
};

// export const get_clinic_managment = async () => {
//     try {
//         return await db.query(`
//             SELECT 
//                 c.clinic_id, 
//                 c.clinic_name, 
//                 c.org_number, 
//                 c.email, 
//                 c.mobile_number, 
//                 c.address, 
//                 c.email_sent_count, 
//                 c.clinic_logo, 
//                 c.clinic_description, 
//                 c.website_url, 
//                 c.profile_completion_percentage AS onboarding_progress, 
//                 cl.city, 
//                 cl.zip_code AS postal_code,
//                 c.ivo_registration_number, 
//                 c.hsa_id,

//                 -- ✅ Determine if user is solo doctor using tbl_zqnq_users
//                 CASE 
//                     WHEN zu.role_id = '3677a3e6-3196-11f0-9e07-0e8e5d906eef' THEN TRUE
//                     ELSE FALSE
//                 END AS is_solo_doctor

//             FROM tbl_clinics c

//             LEFT JOIN tbl_clinic_locations cl 
//                 ON cl.clinic_id = c.clinic_id

//             LEFT JOIN tbl_zqnq_users zu 
//                 ON zu.id = c.zynq_user_id

//             WHERE c.is_deleted = 0
//             ORDER BY c.created_at DESC
//         `);
//     } catch (error) {
//         console.error("Database Error:", error.message);
//         throw new Error("Failed to get clinic latest data.");
//     }
// };


export const get_clinic_treatments = async (clinic_id) => {
    return await db.query('SELECT tbl_clinic_treatments.clinic_treatment_id, tbl_clinic_treatments.clinic_id, tbl_treatments.name FROM tbl_clinic_treatments LEFT JOIN tbl_treatments ON tbl_treatments.treatment_id = tbl_clinic_treatments.treatment_id WHERE tbl_clinic_treatments.clinic_id = ? ORDER BY tbl_clinic_treatments.created_at DESC;', [clinic_id])
};

export const get_clinic_equipments = async (clinic_id) => {
    return await db.query('SELECT tbl_clinic_equipments.clinic_equipment_id, tbl_clinic_equipments.clinic_id, tbl_equipments.name FROM tbl_clinic_equipments LEFT JOIN tbl_equipments ON tbl_equipments.equipment_id = tbl_clinic_equipments.equipment_id WHERE tbl_clinic_equipments.clinic_id = ? ORDER BY tbl_clinic_equipments.created_at DESC;', [clinic_id])
};

export const get_clinic_skintype = async (clinic_id) => {
    return await db.query('SELECT tbl_clinic_skin_types.clinic_skin_type_id, tbl_clinic_skin_types.clinic_id, tbl_skin_types.name FROM tbl_clinic_skin_types LEFT JOIN tbl_skin_types ON tbl_skin_types.skin_type_id = tbl_clinic_skin_types.skin_type_id WHERE tbl_clinic_skin_types.clinic_id = ? ORDER BY tbl_clinic_skin_types.created_at DESC;', [clinic_id])
};

export const get_clinic_serveritylevel = async (clinic_id) => {
    return await db.query('SELECT tbl_clinic_severity_levels.clinic_severity_level_id, tbl_clinic_severity_levels.clinic_id, tbl_severity_levels.level FROM tbl_clinic_severity_levels LEFT JOIN tbl_severity_levels ON tbl_severity_levels.severity_level_id = tbl_clinic_severity_levels.severity_id WHERE tbl_clinic_severity_levels.clinic_id = ? ORDER BY tbl_clinic_severity_levels.created_at DESC;', [clinic_id])
}

export const get_clinic_skin_conditions = async (clinic_id) => {
    return await db.query(`
        SELECT 
            tbl_clinic_skin_condition.clinic_skin_condition_id, 
            tbl_clinic_skin_condition.clinic_id, 
            tbl_skin_conditions.name 
        FROM tbl_clinic_skin_condition 
        LEFT JOIN tbl_skin_conditions 
            ON tbl_skin_conditions.skin_condition_id = tbl_clinic_skin_condition.skin_condition_id 
        WHERE tbl_clinic_skin_condition.clinic_id = ? 
        ORDER BY tbl_clinic_skin_condition.created_at DESC
    `, [clinic_id]);
};

export const get_clinic_surgeries = async (clinic_id) => {
    return await db.query(`
        SELECT 
            tbl_clinic_surgery.clinic_surgery_id, 
            tbl_clinic_surgery.clinic_id, 
            tbl_surgery.type,
            tbl_surgery.swedish AS name 
        FROM tbl_clinic_surgery 
        LEFT JOIN tbl_surgery 
            ON tbl_surgery.surgery_id = tbl_clinic_surgery.surgery_id 
        WHERE tbl_clinic_surgery.clinic_id = ? 
        ORDER BY tbl_clinic_surgery.created_at DESC
    `, [clinic_id]);
};

export const get_clinic_aesthetic_devices = async (clinic_id) => {
    return await db.query(`
        SELECT 
            tbl_clinic_aesthetic_devices.clinic_aesthetic_devices_id, 
            tbl_clinic_aesthetic_devices.clinic_id, 
            tbl_aesthetic_devices.device 
        FROM tbl_clinic_aesthetic_devices 
        LEFT JOIN tbl_aesthetic_devices 
            ON tbl_aesthetic_devices.aesthetic_device_id  = tbl_clinic_aesthetic_devices.clinic_aesthetic_devices_id 
        WHERE tbl_clinic_aesthetic_devices.clinic_id = ? 
        ORDER BY tbl_clinic_aesthetic_devices.created_at DESC
    `, [clinic_id]);
};



export const delete_clinic_by_id = async (clinic_id) => {
    try {
        return await db.query('UPDATE `tbl_clinics` SET `is_deleted`= 1 WHERE clinic_id = ?', [clinic_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to delete clinic data.");
    }
};

export const findClinicById = async (clinic_id) => {
    try {
        return await db.query('SELECT tbl_clinics.*, tbl_clinic_locations.city, tbl_clinic_locations.zip_code FROM `tbl_clinics` LEFT JOIN tbl_clinic_locations ON tbl_clinic_locations.clinic_id = tbl_clinics.clinic_id WHERE tbl_clinics.clinic_id IN(?) AND tbl_clinics.is_unsubscribed = 0;', [clinic_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to find clinic data.");
    }
};

export const updatePasseordByClinicId = async (hashedPassword, password, zynq_user_id) => {
    try {
        return await db.query('UPDATE `tbl_zqnq_users` SET `password`= ?,`show_password`= ? WHERE id = ?', [hashedPassword, password, zynq_user_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update password clinic data.");
    }
};

export const updateClinicCountAndEmailSent = async (clinic_id, email_sent_count, date) => {
    try {
        return await db.query('UPDATE `tbl_clinics` SET `email_sent_at`= ?,`email_sent_count`= ? WHERE clinic_id = ?', [date, email_sent_count, clinic_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic count and email sent data.");
    }
};

export const clinicSubscribed = async (clinic_id) => {
    try {
        await db.query('UPDATE `tbl_clinics` SET `is_invited`= 1 WHERE clinic_id = ?', [clinic_id]);
        return await db.query('SELECT * FROM `tbl_clinics` WHERE clinic_id = ?', [clinic_id])
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic invited status.");
    }
};

export const clinicUnsubscribed = async (clinic_id) => {
    try {
        return await db.query('UPDATE `tbl_clinics` SET `is_unsubscribed`= 1 WHERE clinic_id = ?', [clinic_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic unscubscribed status.");
    }
};

//======================================= Doctor Managment =========================================

export const get_doctors_management = async () => {
    try {
        return await db.query(`
            SELECT 
                d.doctor_id, 
                d.name, 
                d.specialization, 
                d.fee_per_session, 
                d.phone, 
                d.profile_image, 
                d.rating, 
                d.age, 
                d.address, 
                d.gender, 
                d.experience_years, 
                d.biography, 
                d.profile_completion_percentage AS onboarding_progress, 
                u.email,

                -- ✅ Add user type based on role_id
                CASE 
                    WHEN u.role_id = '407595e3-3196-11f0-9e07-0e8e5d906eef' THEN 'Solo Doctor'
                    WHEN u.role_id = '3677a3e6-3196-11f0-9e07-0e8e5d906eef' THEN 'Doctor'
                END AS user_type

            FROM tbl_doctors d

            LEFT JOIN tbl_zqnq_users u 
                ON u.id = d.zynq_user_id

            WHERE u.role_id IN (
                '407595e3-3196-11f0-9e07-0e8e5d906eef',  -- Solo Doctor
                '3677a3e6-3196-11f0-9e07-0e8e5d906eef'   -- Doctor
            )

            ORDER BY d.created_at DESC;
        `);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor latest data.");
    }
};



export const get_doctor_experience = async (doctor_id) => {
    try {
        return await db.query('SELECT experience_id, organization, designation, start_date, end_date FROM `tbl_doctor_experiences` WHERE doctor_id = ?', [doctor_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor latest data.");
    }
};

export const get_doctor_education = async (doctor_id) => {
    try {
        return await db.query('SELECT education_id, degree, institution, start_year, end_year FROM `tbl_doctor_educations` WHERE doctor_id = ?', [doctor_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor latest data.");
    }
};

//======================================= Product Managment =========================================

export const get_products_management = async () => {
    try {
        return await db.query('SELECT tbl_products.product_id, tbl_products.name AS product_name, tbl_clinics.clinic_name, tbl_products.price, tbl_products.stock, tbl_products.rating, tbl_products.short_description, tbl_products.full_description FROM `tbl_products` LEFT JOIN tbl_clinics ON tbl_clinics.clinic_id = tbl_products.clinic_id WHERE tbl_products.is_deleted = 0 ORDER BY tbl_products.created_at DESC;')
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get product latest data.");
    }
};

export const get_product_images_by_product_id = async (product_id, image_url) => {
    try {
        return await db.query(`SELECT tbl_product_images.*, CONCAT(?, image) AS image_url FROM tbl_product_images  WHERE product_id = ?`, [image_url, product_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get product image latest data.");
    }
};

export const delete_product_by_id = async (product_id) => {
    try {
        return await db.query('UPDATE `tbl_products` SET `is_deleted`= 1 WHERE product_id = ?', [product_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to delete product data.");
    }
}

//yashraj 
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

export const get_doctor_skin_conditions = async (doctorId) => {
    try {
        return await db.query(`
            SELECT 
                dsc.*,
                sc.name 
            FROM 
                tbl_doctor_skin_condition dsc
            INNER JOIN 
                tbl_skin_conditions sc 
            ON 
                dsc.skin_condition_id = sc.skin_condition_id
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
                s.type 
            FROM 
                tbl_doctor_surgery ds
            INNER JOIN 
                tbl_surgery s 
            ON 
                ds.surgery_id = s.surgery_id
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
                ad.device 
            FROM 
                tbl_doctor_aesthetic_devices dad
            INNER JOIN 
                tbl_aesthetic_devices ad 
            ON 
                dad.doctor_aesthetic_devices_id = ad.aesthetic_device_id 
            WHERE 
                dad.doctor_id = ?`, [doctorId]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor's aesthetic devices.");
    }
};


//======================================= Support Managment =========================================

export const get_all_support_tickets = async () => {
    try {
        return await db.query('SELECT * FROM `tbl_support_tickets` ORDER BY `created_at` DESC;');
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get all support tickets.");
    }
}

export const get_clinic_by_id = async (clinic_id) => {
    try {
        return await db.query('SELECT * FROM `tbl_clinics` WHERE clinic_id = ?', [clinic_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get clinic by id.");
    }
}

export const get_doctor_by_id = async (doctor_id) => {
    try {
        const query = `
            SELECT 
                td.*, 
                tu.email, 
                tu.password
            FROM 
                tbl_doctors AS td
            JOIN 
                tbl_zqnq_users AS tu 
            ON 
                td.zynq_user_id = tu.id
            WHERE 
                td.doctor_id = ?;
        `;
        return await db.query(query, [doctor_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get doctor and user data by doctor id.");
    }
}

export const get_user_by_id = async (user_id) => {
    try {
        return await db.query('SELECT * FROM `tbl_users` WHERE user_id = ?', [user_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get user by id.");
    }
}

export const get_support_ticket_by_id = async (support_ticket_id) => {
    try {
        return await db.query('SELECT * FROM `tbl_support_tickets` WHERE support_ticket_id = ?', [support_ticket_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to get support ticket by id.");
    }
}

export const update_support_ticket = async (support_ticket_id, updateData) => {
    try {
        return await db.query('UPDATE `tbl_support_tickets` SET `admin_response`= ?, `responded_at`= ? WHERE support_ticket_id = ?', [updateData.response, new Date(), support_ticket_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update support ticket.");
    }
}