import { CompositionHookListInstance } from "twilio/lib/rest/video/v1/compositionHook.js";
import * as adminModels from "../../models/admin.js";
import { handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import { calculateProfileCompletionPercentageByDoctorId } from "../doctor/profileController.js";
import * as doctorModels from "../../models/doctor.js";
import * as clinicModels from "../../models/clinic.js";
import * as webModels from "../../models/web_user.js";
import dbOperations from '../../models/common.js';
import Joi from "joi";
import path from "path";
import { fileURLToPath } from 'url';
import { generatePassword, isEmpty } from "../../utils/user_helper.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import bcrypt from "bcrypt";
import ejs from 'ejs';
import dotenv from "dotenv";
import { sendEmail } from "../../services/send_email.js";
import { buildClinicData } from "../clinic/authController.js";
import { generateDoctorsEmbeddingsV2 } from "../api/embeddingsController.js";
import moment from 'moment/moment.js';
dotenv.config();


const APP_URL = process.env.APP_URL;
const image_logo = process.env.LOGO_URL_PNG;

export const get_doctors_management = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const search = req.query.search || "";
        const type = req.query.type || "";

        // 1. Get total doctor count
        const totalRecords = await adminModels.get_doctors_count(search, type);

        // 2. Fetch doctors with LIMIT & OFFSET
        const doctors = await adminModels.get_doctors_management(limit, offset, search, type)

        if (!doctors || doctors.length === 0) {
            return handleSuccess(res, 200, 'en', "No doctors found", {
                Doctors: [],
                totalRecords,
                totalPages: 0,
                currentPage: page
            });
        }

        const fullDoctorData = await Promise.all(
            doctors.map(async (doctor) => {
                doctor.profile_image = doctor.profile_image == null || doctor.profile_image == ''
                    ? null
                    : process.env.APP_URL + 'doctor/profile_images/' + doctor.profile_image;

                const experince = await adminModels.get_doctor_experience(doctor.doctor_id);
                const education = await adminModels.get_doctor_education(doctor.doctor_id);
                const treatments = await adminModels.get_doctor_treatments(doctor.doctor_id);
                const skinTypes = await adminModels.get_doctor_skin_types(doctor.doctor_id);
                const severityLevels = await adminModels.get_doctor_severity_levels(doctor.doctor_id);
                // const skinConditions = await adminModels.get_doctor_skin_conditions(doctor.doctor_id);
                const surgeries = await adminModels.get_doctor_surgeries(doctor.doctor_id);
                // const aestheticDevices = await adminModels.get_doctor_aesthetic_devices(doctor.doctor_id);
                const completionPercantage = await calculateProfileCompletionPercentageByDoctorId(doctor.doctor_id)

                return {
                    ...doctor,
                    onboarding_progress: completionPercantage,
                    experince,
                    education,
                    treatments,
                    skinTypes,
                    severityLevels,
                    // skinConditions,
                    surgeries,
                    // aestheticDevices
                };
            })
        );

        fullDoctorData.map((item) => {
            if (item.onboarding_progress == 100 && item.profile_status != 'VERIFIED') {
                item.profile_status = 'ONBOARDING'
            }
        })

        return handleSuccess(res, 200, 'en', "Fetch doctor management successfully", {
            Doctors: fullDoctorData,
            totalRecords,
            totalPages: Math.ceil(totalRecords / limit),
            currentPage: page
        });

    } catch (error) {
        console.error("internal E", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR " + error.message);
    }
};


export const sendDoctorOnaboardingInvitation = async (req, res) => {
    try {

        const schema = Joi.object({
            email: Joi.string().email().min(1).required(),
            clinic_id: Joi.string().uuid().required(),
            name: Joi.string().max(255).optional().allow('', null),
            phone: Joi.string().max(255).optional().allow('', null),
            age: Joi.string().optional().allow('', null),
            address: Joi.string().max(255).optional().allow('', null),
            gender: Joi.string().optional().allow('', null),
            biography: Joi.string().optional().allow(''),
            last_name: Joi.string().optional().allow('', null),
            education: Joi.array().items(Joi.object({
                institute: Joi.string().required(),
                degree: Joi.string().required(),
                start_year: Joi.string().required(),
                end_year: Joi.string().required()
            })).optional().allow(null),   // will be JSON
            experience: Joi.array().items(
                Joi.object({
                    organization: Joi.string().required(),
                    designation: Joi.string().required(),
                    start_date: Joi.string().required(),
                    end_date: Joi.string().required()
                })
            ).optional().allow(null),// will be JSON
            treatments: Joi.array().items(
                Joi.object({
                    treatment_id: Joi.string().required(),
                    price: Joi.number().optional(),
                    sub_treatments: Joi.array().items(
                        Joi.object({
                            sub_treatment_id: Joi.string().required(),
                            sub_treatment_price: Joi.number().required()
                        })
                    ).optional()
                })
            ).min(1).required(),

            skin_type_ids: Joi.string().allow(null).optional(),
            // skin_condition_ids: Joi.string().allow("", null).optional(),
            surgery_ids: Joi.string().allow(null).optional(),

            // UPDATED: device ids instead of aesthetic devices
            device_ids: Joi.string().allow(null).optional()
        });

        if (typeof req.body.treatments === "string") {
            try {
                req.body.treatments = JSON.parse(req.body.treatments);
            } catch (err) {
                return handleError(res, 400, "en", "INVALID_JSON_FOR_TREATMENTS");
            }
        }

        if (typeof req.body.education === "string") {
            try {
                req.body.education = JSON.parse(req.body.education);
            } catch (err) {
                return handleError(res, 400, "en", "INVALID_JSON_FOR_EDUCATION");
            }
        }

        if (typeof req.body.experience === "string") {
            try {
                req.body.experience = JSON.parse(req.body.experience);
            } catch (err) {
                return handleError(res, 400, "en", "INVALID_JSON_FOR_EXPERIENCE");
            }
        }

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { email,
            clinic_id,
            name,
            phone,
            age,
            address,
            gender,
            biography,
            last_name,
            education,   // will be JSON
            experience, // will be JSON
            treatments,

            skin_type_ids,
            surgery_ids,
            device_ids } = value;

        let language = req.user.language || "en";
        const emailTemplatePath = path.resolve(__dirname, "../../views/doctor_invite/en.ejs");

        const emailTemplatePath2 = path.resolve(__dirname, "../../views/doctor_invite/enn.ejs");

        const [existingUser] = await webModels.get_web_user_by_email(email);
        const [clinicData] = await clinicModels.getClinicProfile(clinic_id);

        if (!clinicData) {
            return handleError(res, 401, language, "CLINIC_NOT_FOUND");
        }

        const [get_location] = await clinicModels.get_clinic_location_by_clinic_id(clinic_id);



        let doctor, doctor_id, password, newWebUser;


        if (existingUser) {

            const roles = await clinicModels.getAllRoles();
            const userRole = roles.find(role => role.id === existingUser.role_id);

            // Helpful readable names
            const roleLabelMap = {
                CLINIC: "Clinic",
                DOCTOR: "Doctor",
                SOLO_DOCTOR: "Solo Doctor"
            };

            // ========== 1️⃣ CLINIC ROLE - NOT ALLOWED ==========
            if (userRole.role === "CLINIC") {
                return handleError(
                    res,
                    400,
                    language,
                    "This user already has a Clinic account."
                );
            }

            // ========== 2️⃣ SOLO DOCTOR ROLE - NOT ALLOWED ==========
            if (userRole.role === "SOLO_DOCTOR") {
                return handleError(
                    res,
                    400,
                    language,
                    "This email already belongs to a Solo Doctor. It cannot be mapped with a clinic."
                );
            }

            // ========== 3️⃣ DOCTOR ROLE - ALLOWED (MAP TO CLINIC) ==========
            if (userRole.role === "DOCTOR") {

                // Get doctor record
                const [existingDoctor] = await clinicModels.get_doctor_by_zynq_user_id(existingUser.id);

                if (!existingDoctor) {
                    return handleError(res, 400, language, "Doctor record not found.");
                }

                doctor_id = existingDoctor.doctor_id;

                // Check mapping
                const [existingMap] = await clinicModels.get_doctor_clinic_map_by_both(
                    doctor_id,
                    clinic_id
                );

                if (existingMap) {
                    return handleError(
                        res,
                        400,
                        language,
                        "This doctor is already mapped to this clinic."
                    );
                }


                // Create map
                const clinicMapData = {
                    doctor_id,
                    clinic_id: clinic_id,
                    assigned_at: new Date(),
                };
                await clinicModels.create_doctor_clinic_map(clinicMapData);


                const [doctorClinicMap] = await clinicModels.get_doctor_clinic_map_by_both(doctor_id, clinic_id);


                const invitation_id = doctorClinicMap?.map_id;

                // Send invitation WITHOUT password → use enn.ejs
                const emailHtml = await ejs.renderFile(emailTemplatePath2,
                    {
                        clinic_name: clinicData.clinic_name,
                        clinic_org_number: clinicData.org_number,
                        clinic_city: get_location.city,
                        clinic_street_address: get_location.street_address,
                        clinic_state: get_location.state,
                        clinic_zip: get_location.zip_code,
                        clinic_phone: clinicData.mobile_number,
                        clinic_email: clinicData.email,
                        image_logo,
                        invitation_id,
                        invitation_link: `${APP_URL}clinic/accept-invitation?invitation_id=${invitation_id}`,
                    }
                );

                await sendEmail({
                    to: email,
                    subject: "Expert Invitation",
                    html: emailHtml,
                });

            }
        }
        else {
            const roles = await clinicModels.getAllRoles();
            const doctorRole = roles.find(role => role.role === 'DOCTOR');
            if (!doctorRole) {
                return handleError(res, 400, language, "DOCTOR_ROLE_NOT_FOUND");
            }

            password = generatePassword(email);
            const hashedPassword = await bcrypt.hash(password, 10);

            const doctorData = {
                email,
                password: hashedPassword,
                show_password: password,
                role_id: doctorRole.id,
                created_at: new Date(),
            };

            await webModels.create_web_user(doctorData);
            [newWebUser] = await webModels.get_web_user_by_email(email);

            const doctorTableData = {
                zynq_user_id: newWebUser.id,
                created_at: new Date(),
            };
            await clinicModels.create_doctor(doctorTableData);
            const [createdDoctor] = await clinicModels.get_doctor_by_zynq_user_id(newWebUser.id);
            doctor = createdDoctor;
            doctor_id = doctor.doctor_id;

            const [doctorClinicMapForCreate] = await clinicModels.get_doctor_clinic_map_by_both(doctor_id, clinic_id);
            if (!doctorClinicMapForCreate) {
                const clinicMapData = {
                    doctor_id,
                    clinic_id: clinic_id,
                    assigned_at: new Date(),
                };
                await clinicModels.create_doctor_clinic_map(clinicMapData);
            }

            const [doctorClinicMap] = await clinicModels.get_doctor_clinic_map_by_both(doctor_id, clinic_id);
            const invitation_id = doctorClinicMap?.map_id;

            let sendPassword = password;
            if (!password && existingUser) {
                sendPassword = existingUser.show_password;
            }

            const emailHtml = await ejs.renderFile(emailTemplatePath, {
                clinic_name: clinicData.clinic_name,
                clinic_org_number: clinicData.org_number,
                clinic_city: get_location.city,
                clinic_street_address: get_location.street_address,
                clinic_state: get_location.state,
                clinic_zip: get_location.zip_code,
                clinic_phone: clinicData.mobile_number,
                clinic_email: clinicData.email,
                email,
                password: sendPassword,
                image_logo,
                invitation_id,
                invitation_link: `${APP_URL}clinic/accept-invitation?invitation_id=${invitation_id}`,
            });

            const emailOptions = {
                to: email,
                subject: "Expert Invitation",
                html: emailHtml,
            };
            await sendEmail(emailOptions);
        }

        const [checkexistingUser] = await webModels.get_web_user_by_email(email);
        const [doctorData] = await doctorModels.get_doctor_by_zynquser_id(checkexistingUser.id);


        if (!doctorData) {
            return handleError(res, 401, 'en', "DOCTOR_NOT_FOUND");
        }

        const doctorId = doctorData.doctor_id;
        const zynqUserId = checkexistingUser.id;

        let filename = '';
        if (req.files?.profile?.length > 0) {
            filename = req.files.profile[0].filename
        }


        const result = await doctorModels.add_personal_details(zynqUserId, name, phone, age, address, gender, filename, biography, last_name);

        const files = req.files;
        if (Object.keys(files).length > 0) { // Only process if new files are actually uploaded
            for (const key in files) { // 'key' is like 'medical_council', 'deramatology_board', etc.
                const certTypeFromDb = await doctorModels.get_certification_type_by_filename(key);

                if (certTypeFromDb.length > 0) {
                    const certification_type_id = certTypeFromDb[0].certification_type_id;

                    for (const file of files[key]) { // Loop through potential multiple files for the same field name
                        const newUploadPath = file.filename; // This is the new path

                        // Check if this certification type already exists for the doctor
                        const existingCert = await doctorModels.get_doctor_certification_by_type(doctorId, certification_type_id);

                        if (existingCert.length > 0) {
                            // Certification already exists, update its file path
                            await doctorModels.update_certification_upload_path(doctorId, certification_type_id, newUploadPath);

                        } else {
                            // Certification does not exist, add it
                            await doctorModels.add_certification(doctorId, certification_type_id, newUploadPath); // Add other metadata if available from req.body

                        }
                    }
                } else {
                    console.warn(`Certification type with filename key '${key}' not found in tbl_certification_type. Skipping file processing.`);
                }
            }
        }

        const eduArray = Array.isArray(education) ? education : [];
        const expArray = Array.isArray(experience) ? experience : [];

        if (eduArray.length > 0) {
            await doctorModels.delete_all_education(doctorId);
            for (let edu of eduArray) {
                await doctorModels.add_education(doctorId, edu.institute, edu.degree, edu.start_year, edu.end_year);
            }
        }

        if (expArray.length > 0) {
            await doctorModels.delete_all_experience(doctorId);
            for (let exp of expArray) {
                await doctorModels.add_experience(doctorId, exp.organization, exp.designation, exp.start_date, exp.end_date);
            }
        }


        // Convert CSV strings into arrays
        const skinTypeIds = skin_type_ids ? skin_type_ids.split(',').map(id => id.trim()) : [];
        // const skinConditionIds = value.skin_condition_ids.split(',').map(id => id.trim());
        const surgeryIds = surgery_ids ? surgery_ids.split(',').map(id => id.trim()) : [];
        const deviceIds = device_ids ? device_ids.split(',').map(id => id.trim()) : [];

        // Save expertis
        if (treatments.length > 0) {
            await doctorModels.update_doctor_treatments(doctorId, treatments);
        }
        if (skinTypeIds.length > 0) {
            await doctorModels.update_doctor_skin_types(doctorId, skinTypeIds);
        }
        if (surgeryIds.length > 0) {
            await doctorModels.update_doctor_surgery(doctorId, surgeryIds);
        }

        // NEW: Save treatment → user → device mapping
        if (deviceIds.length > 0) {
            await doctorModels.update_doctor_treatment_devices(
                zynqUserId,       // zynq_user_id
                treatments, // treatments array
                deviceIds         // device ids
            );
        }


        return handleSuccess(res, 200, language, "INVITATION_SENT_SUCCESSFULLY");

    } catch (error) {
        console.error("Error sending doctor invitation:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};


export const mapTreatmentsForClinic = (treatments = []) => {
    return treatments.map(treatment => ({
        treatment_id: treatment.treatment_id,
        total_price: Number(treatment.price) || 0,

        sub_treatments: Array.isArray(treatment.sub_treatments)
            ? treatment.sub_treatments.map(sub => ({
                sub_treatment_id: sub.sub_treatment_id,
                price: Number(sub.sub_treatment_price)
            }))
            : null
    }));
};


export const sendSoloDoctorOnaboardingInvitation = async (req, res) => {
    try {

        const schema = Joi.object({
            email: Joi.string().email().min(1).required(),
            name: Joi.string().max(255).optional().allow('', null),
            last_name: Joi.string().max(255).optional().allow('', null),
            age: Joi.string().optional().allow('', null),
            gender: Joi.string().optional().allow('', null),
            clinic_name: Joi.string().optional().allow('', null),
            clinic_description: Joi.string().optional().allow('', null),
            org_number: Joi.string().optional().allow('', null),
            street_address: Joi.string().optional().allow('', null),
            city: Joi.string().optional().allow('', null),
            state: Joi.string().optional().allow('', null),
            zip_code: Joi.string().optional().allow('', null),
            latitude: Joi.string().optional().allow('', null),
            longitude: Joi.string().optional().allow('', null),
            mobile_number: Joi.string().optional().allow('', null),
            website_url: Joi.string().optional().allow(null),
            address: Joi.string().optional().allow('', null),
            is_onboarded: Joi.number().integer().optional(),
            ivo_registration_number: Joi.string().optional().allow('', null),
            hsa_id: Joi.string().optional().allow('', null),
            form_stage: Joi.string().optional().allow('', null),
            education: Joi.array().items(Joi.object({
                institute: Joi.string().required(),
                degree: Joi.string().required(),
                start_year: Joi.string().required(),
                end_year: Joi.string().required()
            })).optional().allow(null),   // will be JSON
            experience: Joi.array().items(
                Joi.object({
                    organization: Joi.string().required(),
                    designation: Joi.string().required(),
                    start_date: Joi.string().required(),
                    end_date: Joi.string().required()
                })
            ).optional().allow(null),
            fee_per_session: Joi.number().positive().optional(),
            currency: Joi.string().min(1).max(10).default('USD').optional(),
            session_duration: Joi.string().optional(),
            fee_range: Joi.string().optional().allow('', null),
            availability: Joi.array().items(
                Joi.object({
                    day_of_week: Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday').required(),
                    start_time: Joi.string().required().allow(''),
                    end_time: Joi.string().required().allow(''),
                    closed: Joi.number().integer().required()
                })
            ).optional(),
            treatments: Joi.array().items(
                Joi.object({
                    treatment_id: Joi.string().required(),
                    price: Joi.number().optional(),
                    sub_treatments: Joi.array().items(
                        Joi.object({
                            sub_treatment_id: Joi.string().required(),
                            sub_treatment_price: Joi.number().required()
                        })
                    ).optional()
                })
            ).optional(),

            skin_type_ids: Joi.string().allow(null).optional(),
            // skin_condition_ids: Joi.string().allow("", null).optional(),
            surgery_ids: Joi.string().allow(null).optional(),

            // UPDATED: device ids instead of aesthetic devices
            device_ids: Joi.string().allow(null).optional()
        });

        if (typeof req.body.treatments === "string") {
            try {
                req.body.treatments = JSON.parse(req.body.treatments);
            } catch (err) {
                return handleError(res, 400, "en", "INVALID_JSON_FOR_TREATMENTS");
            }
        }

        if (typeof req.body.education === "string") {
            try {
                req.body.education = JSON.parse(req.body.education);
            } catch (err) {
                return handleError(res, 400, "en", "INVALID_JSON_FOR_EDUCATION");
            }
        }

        if (typeof req.body.experience === "string") {
            try {
                req.body.experience = JSON.parse(req.body.experience);
            } catch (err) {
                return handleError(res, 400, "en", "INVALID_JSON_FOR_EXPERIENCE");
            }
        }

        if (typeof req.body.availability === "string") {
            try {
                req.body.availability = JSON.parse(req.body.availability);
            } catch (err) {
                return handleError(res, 400, "en", "INVALID_JSON_FOR_AVAILABILITY");
            }
        }

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const {
            email,
            name,
            last_name,
            age,
            gender,
            clinic_name,
            clinic_description,
            org_number,
            street_address,
            city,
            state,
            zip_code,
            latitude,
            longitude,
            mobile_number,
            website_url,
            address,
            education,
            experience,
            treatments,
            fee_per_session,
            currency,
            session_duration,
            availability,
            skin_type_ids,
            surgery_ids,
            device_ids,
            is_onboarded,
            ivo_registration_number,
            hsa_id,
            fee_range,
            form_stage
        } = value;


        let language = req.user.language || "en";

        const existingUser = await adminModels.findClinicEmail(email);
        if (existingUser?.length > 0) {
            return handleError(res, 409, 'en', "Email already exists", {
                email: email
            });
        }

        const findRole = await adminModels.findRole('SOLO_DOCTOR');
        if (!findRole) return handleError(res, 404, 'en', "Role 'SOLO_DOCTOR' not found");

        const roleId = findRole.id;
        const password = await generatePassword(email);
        const hashedPassword = await bcrypt.hash(password, 10);

        await adminModels.addZynqUsers({ email, role_id: roleId, password: hashedPassword, show_password: password });

        const [newUser] = await adminModels.findClinicEmail(email);

        let zynq_user_id = newUser.id;

        language = language || "en";

        const clinic_logo = req?.files?.logo ? req?.files?.logo[0]?.filename : null

        const clinicData = {
            zynq_user_id:
                zynq_user_id === "" ? null : zynq_user_id,
            clinic_name:
                clinic_name === "" ? null : clinic_name,
            org_number:
                org_number === "" ? null : org_number,
            email: email === "" ? null : email,
            // email: email === "" ? null : email || clinic_data.email,
            mobile_number:
                mobile_number === ""
                    ? null
                    : mobile_number,
            address: address === "" ? null : address,
            fee_range: fee_range === "" ? null : fee_range,
            website_url: website_url === "" ? null : website_url,
            clinic_description: clinic_description === "" ? null : clinic_description,
            language: language === "" ? null : language,
            clinic_logo: clinic_logo === "" ? null : clinic_logo,
            form_stage: form_stage === "" ? null : form_stage,
            ivo_registration_number: ivo_registration_number === "" ? null : ivo_registration_number,
            hsa_id: hsa_id === "" ? null : hsa_id,
            is_onboarded:  0 ,
            city: city === "" ? null : city,
            state: state === "" ? null : state,
        };

        delete clinicData.city;
        delete clinicData.state;

        let profile_status = "ONBOARDING";

        if (!isEmpty(form_stage)) {
            clinicData.profile_status = profile_status;
        }

        const clinicDataV2 = buildClinicData(clinicData);

        delete clinicDataV2.city;
        delete clinicDataV2.state;

        await clinicModels.insertClinicData(clinicDataV2);


        const [clinic] = await dbOperations.getSelectedColumn(
            "clinic_id",
            "tbl_clinics",
            `WHERE zynq_user_id='${zynq_user_id}'`
        );

        const clinic_id = clinic?.clinic_id;


        const [clinicLocation] = await clinicModels.getClinicLocation(clinic_id);
        if (clinicLocation) {
            const update_data = {
                clinic_id: clinic_id,
                street_address:
                    street_address === ""
                        ? null
                        : street_address || clinicLocation.street_address,
                city: city === "" ? null : city || clinicLocation.city,
                state: state === "" ? null : state || clinicLocation.state,
                zip_code: zip_code === "" ? null : zip_code || clinicLocation.zip_code,
                latitude: latitude || clinicLocation.latitude,
                longitude: longitude || clinicLocation.longitude,
            };

            await clinicModels.updateClinicLocation(update_data, clinic_id);
        } else {
            const insert_data = {
                clinic_id: clinic_id,
                street_address: street_address,
                city: city,
                state: state,
                zip_code: zip_code,
                latitude: latitude,
                longitude: longitude,
            };
            await clinicModels.insertClinicLocation(insert_data);
        }



        await dbOperations.insertData("tbl_doctors", {
            zynq_user_id: zynq_user_id,
            name,
            last_name,
            gender: gender,
            age: age,
            biography: clinic_description,
            profile_image: req?.files?.profile ? req?.files?.profile[0]?.filename : null,
            phone: mobile_number,
            address: address,
            fee_per_session: fee_per_session,
            currency: currency,
            session_duration: session_duration
        });


        const [doctor] = await dbOperations.getSelectedColumn(
            "doctor_id",
            "tbl_doctors",
            `WHERE zynq_user_id='${zynq_user_id}'`
        );

        const doctorId = doctor.doctor_id;



        if (doctor && clinic) {
            await dbOperations.insertData("tbl_doctor_clinic_map", {
                doctor_id: doctorId,
                clinic_id: clinic_id,
            });
        }

        const uploadedFiles = req.files || {};
        const clinicImageFiles = [];

        if (Array.isArray(uploadedFiles.files) && uploadedFiles.files.length > 0) {
            for (const file of uploadedFiles.files) {
                const fileName = file.filename;
                clinicImageFiles.push(fileName);
            }

            if (clinicImageFiles.length > 0) {
                await clinicModels.insertClinicImages(clinic_id, clinicImageFiles);
            }
        }



        const files = req.files;
        if (Object.keys(files).length > 0) { // Only process if new files are actually uploaded
            for (const key in files) { // 'key' is like 'medical_council', 'deramatology_board', etc.
                const certTypeFromDb = await doctorModels.get_certification_type_by_filename(key);

                if (certTypeFromDb.length > 0) {
                    const certification_type_id = certTypeFromDb[0].certification_type_id;

                    for (const file of files[key]) { // Loop through potential multiple files for the same field name
                        const newUploadPath = file.filename; // This is the new path

                        // Check if this certification type already exists for the doctor
                        const existingCert = await doctorModels.get_doctor_certification_by_type(doctorId, certification_type_id);

                        if (existingCert.length > 0) {
                            // Certification already exists, update its file path
                            await doctorModels.update_certification_upload_path(doctorId, certification_type_id, newUploadPath);

                        } else {
                            // Certification does not exist, add it
                            await doctorModels.add_certification(doctorId, certification_type_id, newUploadPath); // Add other metadata if available from req.body

                        }
                    }
                } else {
                    console.warn(`Certification type with filename key '${key}' not found in tbl_certification_type. Skipping file processing.`);
                }
            }
        }

        const eduArray = Array.isArray(education) ? education : [];
        const expArray = Array.isArray(experience) ? experience : [];

        if (eduArray.length > 0) {
            await doctorModels.delete_all_education(doctorId);
            for (let edu of eduArray) {
                await doctorModels.add_education(doctorId, edu.institute, edu.degree, edu.start_year, edu.end_year);
            }
        }

        if (expArray.length > 0) {
            await doctorModels.delete_all_experience(doctorId);
            for (let exp of expArray) {
                await doctorModels.add_experience(doctorId, exp.organization, exp.designation, exp.start_date, exp.end_date);
            }
        }

        if (availability?.length > 0) {
            await doctorModels.update_availability(doctorId, availability);
        }

        // Convert CSV strings into arrays
        const skinTypeIds = skin_type_ids ? skin_type_ids.split(',').map(id => id.trim()) : [];
        const surgeryIds = surgery_ids ? surgery_ids.split(',').map(id => id.trim()) : [];
        const deviceIds = device_ids ? device_ids.split(',').map(id => id.trim()) : [];

        // Save expertis
        if (Array.isArray(treatments) && treatments.length > 0) {
            const mappedTreatments = mapTreatmentsForClinic(treatments);

            const treatmentsData =
                await clinicModels.createClinicMappedTreatments(
                    clinic_id,
                    mappedTreatments
                );

            await doctorModels.update_doctor_treatments(doctorId, treatments);
        }

        if (skinTypeIds.length > 0) {
            await doctorModels.update_doctor_skin_types(doctorId, skinTypeIds);
        }
        if (surgeryIds.length > 0) {
            await doctorModels.update_doctor_surgery(doctorId, surgeryIds);
        }

        // NEW: Save treatment → user → device mapping
        if (deviceIds.length > 0 && Array.isArray(treatments)) {
            await doctorModels.update_doctor_treatment_devices(
                zynq_user_id,       // zynq_user_id
                treatments, // treatments array
                deviceIds         // device ids
            );
        };


        const updatedEmailCount = 1;

        await adminModels.updateClinicCountAndEmailSent(
            clinic_id,
            updatedEmailCount,
            moment().format('YYYY-MM-DD HH:mm:ss')
        );
        const is_subscribed = clinic_id;

        const html = await ejs.renderFile(
            path.join(__dirname, "../../views/invitation-mail.ejs"),
            {
                clinic_name: clinic_name || "#N/A",
                organization_number: org_number || "#N/A",
                email: email,
                phone: mobile_number || "#N/A",
                city: city || "#N/A",
                postal_code: zip_code || "#N/A",
                address: address || "#N/A",
                password: password,
                logo: image_logo,
                invitationLink: `${APP_URL}admin/subscribed/${is_subscribed}`,
            }
        );

        await sendEmail({
            to: email,
            subject: "You're One Step Away from Joining ZYNQ – Accept Your Invite",
            html,
        });



        return handleSuccess(res, 200, language, "INVITATION_SENT_SUCCESSFULLY");

    } catch (error) {
        console.error("Error sending doctor invitation:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};