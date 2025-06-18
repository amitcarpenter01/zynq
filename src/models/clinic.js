import db from "../config/db.js";

//======================================= Auth =========================================

export const get_clinic_by_zynq_user_id = async (zynq_user_id) => {
    try {
        return await db.query(`SELECT * FROM tbl_clinics WHERE zynq_user_id = ?`, [zynq_user_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch clinic data.");
    }
};

console.log('get_clinic_by_zynq_user_id', get_clinic_by_zynq_user_id)

export const get_zqnq_user_by_email = async (email) => {
    try {
        return await db.query(`SELECT * FROM tbl_zqnq_users WHERE email = ?`, [email]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch user data.");
    }
};

export const get_clinic_by_email = async (email) => {
    try {
        return await db.query(`SELECT * FROM tbl_clinics WHERE email = ?`, [email]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch clinic data.");
    }
};

export const get_clinic_by_mobile_number = async (mobile_number) => {
    try {
        return await db.query(`SELECT * FROM tbl_clinics WHERE mobile_number = ?`, [mobile_number]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch clinic data.");
    }
};

export const get_clinic_by_id = async (clinic_id) => {
    try {
        return await db.query(`SELECT * FROM tbl_clinics WHERE clinic_id = ?`, [clinic_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch clinic data.");
    }
};

export const update_clinic = async (clinicData, clinic_id) => {
    try {
        return await db.query('UPDATE tbl_clinics SET ? WHERE clinic_id = ?', [clinicData, clinic_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic data.");
    }
};

export const update_clinic_location = async (locationData, clinic_id) => {
    try {
        const [existingLocation] = await db.query('SELECT * FROM tbl_clinic_locations WHERE clinic_id = ?', [clinic_id]);
        if (existingLocation) {
            return await db.query('UPDATE tbl_clinic_locations SET ? WHERE clinic_id = ?', [locationData, clinic_id]);
        } else {
            return await db.query('INSERT INTO tbl_clinic_locations SET ?', { ...locationData, clinic_id });
        }
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic location.");
    }
};

export const update_clinic_treatments = async (treatments, clinic_id) => {
    try {
        // First delete existing treatments
        await db.query('DELETE FROM tbl_clinic_treatments WHERE clinic_id = ?', [clinic_id]);

        // Then insert new treatments
        const treatmentPromises = treatments.map(treatment_id => {
            return db.query(
                'INSERT INTO tbl_clinic_treatments (clinic_id, treatment_id) VALUES (?, ?)',
                [clinic_id, treatment_id]
            );
        });

        return await Promise.all(treatmentPromises);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic treatments.");
    }
};

export const update_clinic_timing = async (timing, clinic_id) => {
    try {
        // First delete existing timing
        await db.query('DELETE FROM tbl_clinic_operation_hours WHERE clinic_id = ?', [clinic_id]);

        // Then insert new timing
        const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const timingPromises = daysOfWeek.map(day => {
            if (timing[day] && timing[day].open && timing[day].close) {
                return db.query(
                    'INSERT INTO tbl_clinic_operation_hours (clinic_id, day_of_week, open_time, close_time) VALUES (?, ?, ?, ?)',
                    [clinic_id, day, timing[day].open, timing[day].close]
                );
            }
            return null;
        }).filter(promise => promise !== null);

        return await Promise.all(timingPromises);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic timing.");
    }
};

export const insertClinicData = async (clinicData) => {
    try {
        const result = await db.query('INSERT INTO tbl_clinics SET ?', [clinicData]);
        return result;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert clinic data.");
    }
};

export const insertClinicLocation = async (locationData) => {
    try {
        const result = await db.query('INSERT INTO tbl_clinic_locations SET ?', [locationData]);
        return result.insertId;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert clinic location.");
    }
};

export const insertClinicTreatments = async (treatments, clinic_id) => {
    try {
        if (!Array.isArray(treatments)) {
            throw new Error("Treatments must be an array");
        }

        const treatmentPromises = treatments.map(treatment_id => {
            return db.query(
                'INSERT INTO tbl_clinic_treatments (clinic_id, treatment_id) VALUES (?, ?)',
                [clinic_id, treatment_id]
            );
        });
        return await Promise.all(treatmentPromises);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert clinic treatments.");
    }
};

export const insertClinicSurgeries = async (surgeries, clinic_id) => {
    try {
        if (!Array.isArray(surgeries)) {
            throw new Error("Surgeries must be an array");
        }

        const insertPromises = surgeries.map(surgery_id => {
            return db.query(
                'INSERT INTO tbl_clinic_surgery (clinic_id, surgery_id) VALUES (?, ?)',
                [clinic_id, surgery_id]
            );
        });

        return await Promise.all(insertPromises);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert clinic surgeries.");
    }
};

export const insertClinicSkinConditions = async (skin_conditions, clinic_id) => {
    try {
        if (!Array.isArray(skin_conditions)) {
            throw new Error("Skin conditions must be an array");
        }

        const insertPromises = skin_conditions.map(skin_condition_id => {
            return db.query(
                'INSERT INTO clinic_skin_condition (clinic_id, skin_condition_id) VALUES (?, ?)',
                [clinic_id, skin_condition_id]
            );
        });

        return await Promise.all(insertPromises);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert clinic skin conditions.");
    }
};

export const insertClinicAestheticDevices = async (device_ids, clinic_id) => {
    try {
        if (!Array.isArray(device_ids)) {
            throw new Error("Aesthetic device IDs must be an array");
        }

        const insertPromises = device_ids.map(aesthetic_devices_id => {
            return db.query(
                'INSERT INTO tbl_clinic_aesthetic_devices (clinic_id, aesthetic_devices_id) VALUES (?, ?)',
                [clinic_id, aesthetic_devices_id]
            );
        });

        return await Promise.all(insertPromises);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert clinic aesthetic devices.");
    }
};


export const insertClinicOperationHours = async (timing, clinic_id) => {
    try {
        const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const timingPromises = daysOfWeek.map(day => {
            const openTime = timing[day]?.open ?? '';
            const closeTime = timing[day]?.close ?? '';
            const isClosed = timing[day]?.is_closed ?? false;
            return db.query(
                'INSERT INTO tbl_clinic_operation_hours (clinic_id, day_of_week, open_time, close_time, is_closed) VALUES (?, ?, ?, ?, ?)',
                [clinic_id, day, openTime, closeTime, isClosed ? 1 : 0]
            );
        }).filter(Boolean);

        return await Promise.all(timingPromises);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert clinic timing.");
    }
};

export const insertClinicEquipments = async (equipments, clinic_id) => {
    try {
        const equipmentPromises = equipments.map(equipment_id => {
            return db.query(
                'INSERT INTO tbl_clinic_equipments (clinic_id, equipment_id) VALUES (?, ?)',
                [clinic_id, equipment_id]
            );
        });
        return await Promise.all(equipmentPromises);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert clinic equipments.");
    }
};

export const insertClinicSkinTypes = async (skin_types, clinic_id) => {
    try {
        const skinTypePromises = skin_types.map(skin_type_id => {
            return db.query(
                'INSERT INTO tbl_clinic_skin_types (clinic_id, skin_type_id) VALUES (?, ?)',
                [clinic_id, skin_type_id]
            );
        });
        return await Promise.all(skinTypePromises);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert clinic skin types.");
    }
};

export const insertClinicSeverityLevels = async (severity_levels, clinic_id) => {
    try {
        const severityLevelPromises = severity_levels.map(severity_id => {
            return db.query(
                'INSERT INTO tbl_clinic_severity_levels (clinic_id, severity_id) VALUES (?, ?)',
                [clinic_id, severity_id]
            );
        });
        return await Promise.all(severityLevelPromises);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert clinic severity levels.");
    }
};

export const insertClinicDocuments = async (clinic_id, certification_type_id, document_type, file_url) => {
    try {
        const result = await db.query('INSERT INTO tbl_clinic_documents (clinic_id, certification_type_id, document_type, file_url) VALUES (?, ?, ?, ?)', [clinic_id, certification_type_id, document_type, file_url]);
        return result.insertId;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert clinic document.");
    }
};

export const getAllTreatments = async () => {
    try {
        const treatments = await db.query('SELECT * FROM tbl_treatments ORDER BY created_at DESC');
        return treatments;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch treatments.");
    }
};

export const getClinicTreatments = async (clinic_id) => {
    try {
        const treatments = await db.query('SELECT t.* FROM tbl_treatments t ' +
            'INNER JOIN tbl_clinic_treatments ct ON t.treatment_id = ct.treatment_id ' +
            'WHERE ct.clinic_id = ? ORDER BY t.created_at DESC', [clinic_id]);
        return treatments;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch treatments.");
    }
};

export const getClinicSurgeries = async (clinic_id) => {
    try {
        const [surgeries] = await db.query(
            `SELECT s.* FROM tbl_surgery s
             INNER JOIN tbl_clinic_surgery cs ON s.surgery_id = cs.surgery_id
             WHERE cs.clinic_id = ?
             ORDER BY s.created_at DESC`,
            [clinic_id]
        );
        return surgeries;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch clinic surgeries.");
    }
};

export const getClinicSkinConditions = async (clinic_id) => {
    try {
        const conditions = await db.query(
            `SELECT s.* FROM tbl_skin_conditions s
             INNER JOIN clinic_skin_condition csc ON s.skin_condition_id = csc.skin_condition_id
             WHERE csc.clinic_id = ? ORDER BY s.created_at DESC`,
            [clinic_id]
        );
        return conditions;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch skin conditions.");
    }
};


export const getClinicAestheticDevices = async (clinic_id) => {
    try {
        const [devices] = await db.query(
            `SELECT ad.* FROM tbl_aesthetic_devices ad
             INNER JOIN tbl_clinic_aesthetic_devices cad ON ad.aesthetic_device_id  = cad.clinic_aesthetic_devices_id 
             WHERE cad.clinic_id = ?
             ORDER BY ad.created_at DESC`,
            [clinic_id]
        );
        return devices;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch clinic aesthetic devices.");
    }
};


export const getClinicOperationHours = async (clinic_id) => {
    try {
        const operationHours = await db.query('SELECT * FROM tbl_clinic_operation_hours WHERE clinic_id = ?', [clinic_id]);
        return operationHours;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch operation hours.");
    }
};

export const getClinicEquipments = async (clinic_id) => {
    try {
        const equipments = await db.query('SELECT e.* FROM tbl_equipments e ' +
            'INNER JOIN tbl_clinic_equipments ce ON e.equipment_id = ce.equipment_id ' +
            'WHERE ce.clinic_id = ? ORDER BY e.created_at DESC', [clinic_id]);
        return equipments;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch equipments.");
    }
};

export const getClinicSkinTypes = async (clinic_id) => {
    try {
        const skinTypes = await db.query('SELECT s.* FROM tbl_skin_types s ' +
            'INNER JOIN tbl_clinic_skin_types cst ON s.skin_type_id = cst.skin_type_id ' +
            'WHERE cst.clinic_id = ? ORDER BY s.created_at DESC', [clinic_id]);
        return skinTypes;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch skin types.");
    }
};

export const getClinicSeverityLevels = async (clinic_id) => {
    try {
        const severityLevels = await db.query('SELECT sl.* FROM tbl_severity_levels sl ' +
            'INNER JOIN tbl_clinic_severity_levels csl ON sl.severity_level_id = csl.severity_id ' +
            'WHERE csl.clinic_id = ? ORDER BY sl.created_at DESC', [clinic_id]);
        return severityLevels;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch severity levels.");
    }
};

export const getClinicDocuments = async (clinic_id) => {
    try {
        const documents = await db.query('SELECT * FROM tbl_clinic_documents WHERE clinic_id = ? ORDER BY created_at DESC', [clinic_id]);
        return documents;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch documents.");
    }
};

export const getClinicLocation = async (clinic_id) => {
    try {
        const location = await db.query('SELECT * FROM tbl_clinic_locations WHERE clinic_id = ? ORDER BY created_at DESC', [clinic_id]);
        return location;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch location.");
    }
};

export const getClinicProfile = async (clinic_id) => {
    try {
        const clinic = await db.query('SELECT * FROM tbl_clinics WHERE clinic_id = ? ORDER BY created_at DESC', [clinic_id]);
        return clinic;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch clinic profile.");
    }
};

export const getAllClinicEquipments = async () => {
    try {
        const equipments = await db.query('SELECT * FROM tbl_equipments ORDER BY created_at DESC');
        return equipments;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch equipments.");
    }
};

export const getAllRoles = async () => {
    try {
        const roles = await db.query('SELECT * FROM tbl_roles');
        return roles;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch roles.");
    }
};

export const getAllSkinTypes = async () => {
    try {
        const skinTypes = await db.query('SELECT * FROM tbl_skin_types ORDER BY created_at DESC');
        return skinTypes;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch skin types.");
    }
};

export const getAllSeverityLevels = async () => {
    try {
        const severityLevels = await db.query('SELECT * FROM tbl_severity_levels ORDER BY created_at DESC');
        return severityLevels;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch severity levels.");
    }
};

export const getCertificateType = async () => {
    try {
        const documents = await db.query('SELECT * FROM tbl_certification_type WHERE file_name IS NOT NULL ORDER BY created_at DESC');
        return documents;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch certificate type.");
    }
};

export const updateClinicData = async (clinicData, clinic_id) => {
    try {
        const result = await db.query('UPDATE tbl_clinics SET ? WHERE clinic_id = ?', [clinicData, clinic_id]);
        return result;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic data.");
    }
};

export const updateClinicLocation = async (locationData, clinic_id) => {
    try {
        const result = await db.query('UPDATE tbl_clinic_locations SET ? WHERE clinic_id = ?', [locationData, clinic_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic location.");
    }
};

export const updateClinicTreatments = async (treatments, clinic_id) => {
    try {
        await db.query('DELETE FROM tbl_clinic_treatments WHERE clinic_id = ?', [clinic_id]);
        if (!treatments || treatments.length === 0) return;
        const values = treatments.map(treatment_id => [clinic_id, treatment_id]);
        await db.query('INSERT INTO tbl_clinic_treatments (clinic_id, treatment_id) VALUES ?', [values]);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic treatments.");
    }
};

export const updateClinicSurgeries = async (surgeries, clinic_id) => {
    try {
        await db.query('DELETE FROM tbl_clinic_surgery WHERE clinic_id = ?', [clinic_id]);

        if (!surgeries || surgeries.length === 0) return;

        const values = surgeries.map(surgery_id => [clinic_id, surgery_id]);
        await db.query(
            'INSERT INTO tbl_clinic_surgery (clinic_id, surgery_id) VALUES ?',
            [values]
        );
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic surgeries.");
    }
};


export const updateClinicSkinConditions = async (skin_conditions, clinic_id) => {
    try {
        await db.query('DELETE FROM tbl_clinic_skin_condition WHERE clinic_id = ?', [clinic_id]);

        if (!skin_conditions || skin_conditions.length === 0) return;

        const values = skin_conditions.map(skin_condition_id => [clinic_id, skin_condition_id]);
        await db.query(
            'INSERT INTO tbl_clinic_skin_condition (clinic_id, skin_condition_id) VALUES ?',
            [values]
        );
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic skin conditions.");
    }
};

export const updateClinicAestheticDevices = async (device_ids, clinic_id) => {
    try {
        await db.query('DELETE FROM tbl_clinic_aesthetic_devices WHERE clinic_id = ?', [clinic_id]);

        if (!device_ids || device_ids.length === 0) return;

        const values = device_ids.map(device_id => [clinic_id, device_id]);
        await db.query(
            'INSERT INTO tbl_clinic_aesthetic_devices (clinic_id, device_id) VALUES ?',
            [values]
        );
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic aesthetic devices.");
    }
};



export const updateClinicOperationHours = async (clinic_timing, clinic_id) => {
    try {
        if (!clinic_timing) {
            return;
        }
        await db.query('DELETE FROM tbl_clinic_operation_hours WHERE clinic_id = ?', [clinic_id]);
        const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const timingPromises = daysOfWeek.map(day => {
            const openTime = clinic_timing[day]?.open ?? '';
            const closeTime = clinic_timing[day]?.close ?? '';
            const isClosed = clinic_timing[day]?.is_closed ?? false;

            return db.query(
                'INSERT INTO tbl_clinic_operation_hours (clinic_id, day_of_week, open_time, close_time, is_closed) VALUES (?, ?, ?, ?, ?)',
                [clinic_id, day, openTime, closeTime, isClosed ? 1 : 0]
            );
        }
        ).filter(Boolean);
        return await Promise.all(timingPromises);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic operation hours.");
    }
};

export const updateClinicEquipments = async (equipments, clinic_id) => {
    try {
        await db.query('DELETE FROM tbl_clinic_equipments WHERE clinic_id = ?', [clinic_id]);
        if (!equipments || equipments.length === 0) return;
        const values = equipments.map(equipment_id => [clinic_id, equipment_id]);
        await db.query('INSERT INTO tbl_clinic_equipments (clinic_id, equipment_id) VALUES ?', [values]);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic equipments.");
    }
};

export const updateClinicSkinTypes = async (skin_types, clinic_id) => {
    try {
        await db.query('DELETE FROM tbl_clinic_skin_types WHERE clinic_id = ?', [clinic_id]);
        if (!skin_types || skin_types.length === 0) return;
        const values = skin_types.map(skin_type_id => [clinic_id, skin_type_id]);
        await db.query('INSERT INTO tbl_clinic_skin_types (clinic_id, skin_type_id) VALUES ?', [values]);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic skin types.");
    }
};

export const updateClinicSeverityLevels = async (severity_levels, clinic_id) => {
    try {
        await db.query('DELETE FROM tbl_clinic_severity_levels WHERE clinic_id = ?', [clinic_id]);
        if (!severity_levels || severity_levels.length === 0) return;
        const values = severity_levels.map(severity_id => [clinic_id, severity_id]);
        await db.query('INSERT INTO tbl_clinic_severity_levels (clinic_id, severity_id) VALUES ?', [values]);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic severity levels.");
    }
};

export const updateClinicSkinConditionsLevel = async (skin_conditions, clinic_id) => {
    try {
        await db.query('DELETE FROM tbl_clinic_skin_condition WHERE clinic_id = ?', [clinic_id]);
        if (!skin_conditions || skin_conditions.length === 0) return;
        const values = skin_conditions.map(skin_condition_id => [clinic_id, skin_condition_id]);
        await db.query('INSERT INTO tbl_clinic_skin_condition (clinic_id, skin_condition_id) VALUES ?', [values]);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic skin conditions.");
    }
};

export const updateClinicSurgeriesLevel = async (surgeries, clinic_id) => {
    try {
        await db.query('DELETE FROM tbl_clinic_surgery WHERE clinic_id = ?', [clinic_id]);
        if (!surgeries || surgeries.length === 0) return;
        const values = surgeries.map(surgery_id => [clinic_id, surgery_id]);
        await db.query('INSERT INTO tbl_clinic_surgery (clinic_id, surgery_id) VALUES ?', [values]);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic surgeries.");
    }
};

export const updateClinicAestheticDevicesLevel = async (device_ids, clinic_id) => {
    try {
        await db.query('DELETE FROM tbl_clinic_aesthetic_devices WHERE clinic_id = ?', [clinic_id]);
        if (!device_ids || device_ids.length === 0) return;
        const values = device_ids.map(aesthetic_devices_id => [clinic_id, aesthetic_devices_id]);
        await db.query('INSERT INTO tbl_clinic_aesthetic_devices (clinic_id, aesthetic_devices_id) VALUES ?', [values]);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic aesthetic devices.");
    }
};




export const updateClinicDocuments = async (clinic_id, certification_type_id, document_type, file_url) => {
    try {
        const result = await db.query('UPDATE tbl_clinic_documents SET file_url = ? WHERE clinic_id = ? AND certification_type_id = ? AND document_type = ?', [file_url, clinic_id, certification_type_id, document_type]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic documents.");
    }
};

export const deleteClinicData = async (clinic_id) => {
    try {
        await db.query('DELETE FROM tbl_clinics WHERE clinic_id = ?', [clinic_id]);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to delete clinic data.");
    }
};

export const getCertificateTypeByFileName = async (file_name) => {
    try {
        const documents = await db.query('SELECT * FROM tbl_certification_type WHERE file_name = ? ORDER BY created_at DESC', [file_name]);
        return documents;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch certificate type.");
    }
};

export const get_all_doctors = async () => {
    try {
        const doctors = await db.query('SELECT * FROM tbl_doctors ORDER BY created_at DESC');
        return doctors;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctors.");
    }
};


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
        const severityLevels = await db.query(`
            SELECT dsl.*, sl.* 
            FROM tbl_doctor_severity_levels dsl 
            LEFT JOIN tbl_severity_levels sl ON dsl.severity_id = sl.severity_level_id  
            WHERE dsl.doctor_id = ? 
            ORDER BY dsl.created_at DESC`,
            [doctor_id]
        );
        return severityLevels;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor severity levels.");
    }
};

export const getDoctorSkinTypes = async (doctor_id) => {
    try {
        const skinTypes = await db.query(`
            SELECT dst.*, st.* 
            FROM tbl_doctor_skin_types dst 
            LEFT JOIN tbl_skin_types st ON dst.skin_type_id = st.skin_type_id 
            WHERE dst.doctor_id = ? 
            ORDER BY dst.created_at DESC`,
            [doctor_id]
        );
        return skinTypes;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor skin types.");
    }
};

export const getDoctorTreatments = async (doctor_id) => {
    try {
        const treatments = await db.query(`
            SELECT dt.*, t.* 
            FROM tbl_doctor_treatments dt 
            LEFT JOIN tbl_treatments t ON dt.treatment_id = t.treatment_id 
            WHERE dt.doctor_id = ? 
            ORDER BY dt.created_at DESC`,
            [doctor_id]
        );
        return treatments;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor treatments.");
    }
};

export const create_doctor = async (doctorData) => {
    try {
        const result = await db.query('INSERT INTO tbl_doctors SET ?', [doctorData]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to create doctor.");
    }
};

export const create_doctor_clinic_map = async (clinicMapData) => {
    try {
        const result = await db.query('INSERT INTO tbl_doctor_clinic_map SET ?', [clinicMapData]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to create doctor clinic map.");
    }
};

export const get_mapping_data_by_map_id = async (map_id) => {
    try {
        const result = await db.query('SELECT * FROM tbl_doctor_clinic_map WHERE map_id = ?', [map_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch mapping data by map id.");
    }
};

export const update_clinic_maping_data_accept_invitation = async (map_id) => {
    try {
        const result = await db.query('UPDATE tbl_doctor_clinic_map SET is_invitation_accepted = 1 WHERE map_id = ?', [map_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update clinic maping data accept invitation.");
    }
};

export const get_doctor_by_zynq_user_id = async (zynq_user_id) => {
    try {
        const result = await db.query('SELECT * FROM tbl_doctors WHERE zynq_user_id = ? ORDER BY created_at DESC', [zynq_user_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor by zynq user id.");
    }
};

export const get_doctor_clinic_map_by_both = async (doctor_id, clinic_id) => {
    try {
        console.log(doctor_id, clinic_id, "doctor_id, clinic_id");
        const result = await db.query('SELECT * FROM tbl_doctor_clinic_map WHERE doctor_id = ? AND clinic_id = ?', [doctor_id, clinic_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor clinic map by both.");
    }
};

export const get_clinic_location_by_clinic_id = async (clinic_id) => {
    try {
        const result = await db.query('SELECT * FROM tbl_clinic_locations WHERE clinic_id = ?', [clinic_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch clinic location by clinic id.");
    }
};

export const get_all_doctors_by_clinic_id = async (clinic_id) => {
    try {
        const query = `
            SELECT dcm.*, d.*, zu.email
            FROM tbl_doctor_clinic_map dcm
            JOIN tbl_doctors d ON dcm.doctor_id = d.doctor_id
            JOIN tbl_zqnq_users zu ON d.zynq_user_id = zu.id
            WHERE dcm.clinic_id = ?  ORDER BY dcm.created_at DESC`;
        const result = await db.query(query, [clinic_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch all doctors by clinic id.");
    }
};

export const get_doctor_by_id = async (doctor_id) => {
    try {
        const result = await db.query('SELECT * FROM tbl_doctors WHERE doctor_id = ?', [doctor_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor by id.");
    }
};

export const delete_doctor_clinic_map = async (doctor_id) => {
    try {
        const result = await db.query('DELETE FROM tbl_doctor_clinic_map WHERE doctor_id = ?', [doctor_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to delete doctor clinic map.");
    }
};

export const get_mapping_data_by_doctor_id = async (doctor_id) => {
    try {
        const result = await db.query('SELECT * FROM tbl_doctor_clinic_map WHERE doctor_id = ?', [doctor_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch mapping data by doctor id.");
    }
};

export const update_doctor_password = async (clinic_id, password) => {
    try {
        const result = await db.query('UPDATE tbl_zqnq_users SET password = ? WHERE id = ?', [password, clinic_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update doctor password.");
    }
};

export const insertProduct = async (productData) => {
    try {
        const result = await db.query('INSERT INTO tbl_products SET ?', [productData]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to add product.");
    }
};

export const get_all_products = async (clinic_id) => {
    try {
        const result = await db.query('SELECT * FROM tbl_products WHERE clinic_id = ? ORDER BY created_at DESC', [clinic_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch all products.");
    }
};

export const get_product_by_id = async (product_id) => {
    try {
        const result = await db.query('SELECT * FROM tbl_products WHERE product_id = ?', [product_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch product by id.");
    }
};

export const get_product_by_product_id = async (product_id) => {
    try {
        const result = await db.query('SELECT * FROM tbl_products WHERE product_id = ?', [product_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch product by product id.");
    }
};

export const deleteProductImageByProductId = async (product_id) => {
    try {
        const result = await db.query('DELETE FROM tbl_product_images WHERE product_id = ?', [product_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to delete product image by product id.");
    }
};

export const updateProduct = async (productData, product_id) => {
    try {
        const result = await db.query('UPDATE tbl_products SET ? WHERE product_id = ?', [productData, product_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update product.");
    }
};

export const deleteProduct = async (product_id) => {
    try {
        const result = await db.query('DELETE FROM tbl_products WHERE product_id = ?', [product_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to delete product.");
    }
};

export const insertProductImage = async (image_url) => {
    try {
        const result = await db.query('INSERT INTO tbl_product_images SET ?', [image_url]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert product image.");
    }
};

export const get_product_images = async (product_id) => {
    try {
        const result = await db.query('SELECT * FROM tbl_product_images WHERE product_id = ?', [product_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch product images.");
    }
};

export const get_product_image_by_id = async (product_image_id) => {
    try {
        const result = await db.query('SELECT * FROM tbl_product_images WHERE product_image_id = ?', [product_image_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch product image by id.");
    }
};

export const deleteProductImage = async (product_image_id) => {
    try {
        const result = await db.query('DELETE FROM tbl_product_images WHERE product_image_id = ?', [product_image_id]);
        return result;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to delete product image.");
    }
};

export const get_issue_categories = async () => {
    try {
        const result = await db.query('SELECT * FROM tbl_issue_categories');
        return result;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch issue categories.");
    }
}

export const insertSupportTicket = async (supportTicketData) => {
    try {
        const result = await db.query('INSERT INTO tbl_support_tickets SET ?', [supportTicketData]);
        return result;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert support ticket.");
    }
}

export const get_support_tickets_by_clinic_id = async (clinic_id) => {
    try {
        const result = await db.query('SELECT * FROM tbl_support_tickets WHERE clinic_id = ? ORDER BY created_at DESC', [clinic_id]);

        return result;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch support tickets.");
    }
}

export const get_issue_by_id = async (support_ticket_id) => {
    try {
        return await db.query(`SELECT * FROM tbl_doctor_support_tickets WHERE support_ticket_id  = ?`, [support_ticket_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch clinic data.");
    }
};
 
export const get_support_tickets_by_doctor_id_to_clinic = async (clinic_id) => {
    try {
        const result = await db.query('SELECT * FROM tbl_doctor_support_tickets WHERE clinic_id = ? ORDER BY created_at DESC', [clinic_id]);
 
        return result;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch support tickets.");
    }
}
 
export const send_ticket_response = async (clinic_response, ticket_id) => {
    try {
        return await db.query(`UPDATE  tbl_doctor_support_tickets SET clinic_response = ? , responded_at = NOW() where support_ticket_id  = ? `, [clinic_response, ticket_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to add doctor personal details.");
    }
};

export const getAllSkinCondition = async () => {
    try {
        const conditions = await db.query('SELECT * FROM tbl_skin_conditions');
        return conditions;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch conditions.");
    }
};

export const getAllsurgery = async() =>{
    try {
        const surgeries = await db.query('SELECT * FROM tbl_surgery');
        return surgeries;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch surgeries.");
    }
}

export const getAllDevices = async() =>{
    try {
        const devices = await db.query('SELECT * FROM tbl_aesthetic_devices')
        return devices;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch devices.");
    }
}