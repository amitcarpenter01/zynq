import Joi from "joi";
import dotenv from "dotenv";
import * as doctorModels from "../../models/doctor.js";
import * as clinicModels from "../../models/clinic.js";

import { handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import { update_onboarding_status } from "../../models/web_user.js";
import dbOperations from '../../models/common.js';
import { fetchZynqUserByUserId } from "../../models/api.js";
import { generateDoctorsEmbeddingsV2 } from "../api/embeddingsController.js";

dotenv.config();

//const APP_URL = process.env.APP_URL;
const APP_URL = process.env.LOCAL_APP_URL;
const image_logo = process.env.LOGO_URL;

export const addPersonalInformation = async (req, res) => {
    try {

        const schema = Joi.object({
            name: Joi.string().max(255).required(),
            age: Joi.string().max(255).required(),
            gender: Joi.string().max(255).required(),
            clinic_name: Joi.string().optional().allow('', null),
            clinic_description: Joi.string().optional().allow('', null),
            language: Joi.string().valid('en', 'sv').optional().allow('', null),
            form_stage: Joi.number().optional().allow('', null),
            ivo_registration_number: Joi.string().optional().allow('', null),
            hsa_id: Joi.string().optional().allow('', null),
            org_number: Joi.string().optional().allow('', null),
        });
        let language = 'en';

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const zynqUserId = req.user.id

        const doctorData = {
            name: value.name,
            gender: value.gender,
            age: value.age,
            biography: value.clinic_description,
        };
        if (req.files.profile) {
            doctorData.profile_image = req.files.profile[0].filename
        }

        const clinicData = {
            clinic_name: value.clinic_name,
            clinic_description: value.clinic_description === "" ? null : value.clinic_description,
            language: value.language === "" ? null : value.language,
            form_stage: value.form_stage === "" ? null : value.form_stage,
            ivo_registration_number: value.ivo_registration_number === "" ? null : value.ivo_registration_number,
            hsa_id: value.hsa_id === "" ? null : value.hsa_id
        }
        if (req.files.logo) {
            clinicData.clinic_logo = req.files.logo[0].filename
        }

        const uploadedFiles = req.files || {};
        const clinicImageFiles = [];

        if (Array.isArray(uploadedFiles.files) && uploadedFiles.files.length > 0) {
            for (const file of uploadedFiles.files) {
                const fileName = file.filename;
                clinicImageFiles.push(fileName);
            }

            if (clinicImageFiles.length > 0) {
                await clinicModels.insertClinicImages(req?.user?.clinicData?.clinic_id, clinicImageFiles);
            }
        }




        const doctorResult = await dbOperations.getData('tbl_doctors', `where zynq_user_id = '${zynqUserId}' `);

        const getClinicData = await dbOperations.getData('tbl_clinics', `WHERE zynq_user_id = '${zynqUserId}' `);
        if (getClinicData.length == 0) {
            return handleError(res, 401, 'en', "CLINIC_NOT_FOUND");
        } else {
            console.log("getClinicData[0]?.profile_status - ", getClinicData[0]?.profile_status)
            if (getClinicData[0]?.profile_status === "CLAIMED") {
                clinicData.profile_status = "ONBOARDING";
            }
            var updatClinic = await dbOperations.updateData('tbl_clinics', clinicData, `WHERE zynq_user_id = '${zynqUserId}' `);
        }
        if (doctorResult.length > 0) {
            if (doctorResult[0].profile_status === "CLAIMED") {
                doctorData.profile_status = "ONBOARDING";
            }
            var update_doctor = await dbOperations.updateData('tbl_doctors', doctorData, `WHERE zynq_user_id = '${zynqUserId}' `);
            await generateDoctorsEmbeddingsV2(zynqUserId)
        } else {
            return handleError(res, 401, 'en', "CLINIC_NOT_FOUND");
        }
        if (update_doctor.affectedRows > 0 && updatClinic.affectedRows > 0) {
            await update_onboarding_status(1, zynqUserId)
            return handleSuccess(res, 201, language, "PERSONAL_DETAILS_ADDED", '');

        } else {
            return handleError(res, 400, 'en', "PERSONAL_DETAILS_NOT_ADDED");
        }

    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const addContactInformation = async (req, res) => {
    try {
        const schema = Joi.object({
            street_address: Joi.string().required(),
            city: Joi.string().required(),
            state: Joi.string().required(),
            zip_code: Joi.string().required(),
            latitude: Joi.number().required(),
            longitude: Joi.number().required(),
            mobile_number: Joi.number().required(),
            website_url: Joi.string().optional().allow(null),
            address: Joi.string().required(),


        });

        const { error, value } = schema.validate(req.body);

        if (error) return joiErrorHandle(res, error);

        const zynqUserId = req.user.id
        const clinic_id = req.user.clinicData.clinic_id;

        const clinicData = {
            street_address: value.street_address,
            city: value.city,
            state: value.state,
            zip_code: value.zip_code,
            latitude: value.latitude,
            longitude: value.longitude,
            clinic_id: clinic_id,
        };

        const doctorData = {
            phone: value.mobile_number,
            address: value.street_address,
        }
        const getClinicLocations = await dbOperations.getData('tbl_clinic_locations', `WHERE clinic_id = '${clinic_id}' `);
        if (getClinicLocations.length == 0) {
            const insertClinicLocations = await dbOperations.insertData('tbl_clinic_locations', clinicData);
            const updateClinicAddress = await dbOperations.updateData('tbl_clinics', { address: value.address, mobile_number: value.mobile_number, website_url: value.website_url }, `WHERE clinic_id  = '${clinic_id}' `);
        } else {
            const updateClinic = await dbOperations.updateData('tbl_clinic_locations', clinicData, `WHERE clinic_id = '${clinic_id}' `);
            const updateClinicAddress = await dbOperations.updateData('tbl_clinics', { address: value.address, mobile_number: value.mobile_number, website_url: value.website_url }, `WHERE clinic_id  = '${clinic_id}' `);
        }
        const updateDoctor = await dbOperations.updateData('tbl_doctors', doctorData, `WHERE zynq_user_id = '${zynqUserId}' `);


        await update_onboarding_status(2, zynqUserId)
        await generateDoctorsEmbeddingsV2(zynqUserId)
        return handleSuccess(res, 201, 'en', "CONTACT_DETAILS_UPDATED", '');

    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const addEducationAndExperienceInformation = async (req, res) => {
    try {
        const schema = Joi.object({
            education: Joi.string().required(),   // will be JSON
            experience: Joi.string().required(), // will be JSON
        });

        let language = 'en';

        const payload = {
            education: req.body.education,
            experience: req.body.experience
        };

        const { error, value } = schema.validate(payload);
        if (error) return joiErrorHandle(res, error);

        const doctorId = req.user.doctorData.doctor_id;

        const educationList = JSON.parse(value.education);
        const experienceList = JSON.parse(value.experience);

        const files = req.files;
        if (Object.keys(files).length > 0) { // Only process if new files are actually uploaded
            for (const key in files) { // 'key' is like 'medical_council', 'dermatology_board', etc.
                const certTypeFromDb = await doctorModels.get_certification_type_by_filename(key);

                if (certTypeFromDb.length > 0) {
                    const certification_type_id = certTypeFromDb[0].certification_type_id;

                    for (const file of files[key]) { // Loop through potential multiple files for the same field name
                        const newUploadPath = file.filename; // This is the new path

                        // Check if this certification type already exists for the doctor
                        const existingCert = await doctorModels.get_doctor_certification_by_type(doctorId, certification_type_id);

                        if (existingCert.length > 0) {
                            // ✅ Certification already exists → update its file path
                            await doctorModels.update_certification_upload_path(doctorId, certification_type_id, newUploadPath);
                        } else {
                            // ✅ Certification does not exist → add a new one
                            await doctorModels.add_certification(doctorId, certification_type_id, newUploadPath);
                        }
                    }
                } else {
                    console.warn(
                        `Certification type with filename key '${key}' not found in tbl_certification_type. Skipping file processing.`
                    );
                }
            }
        }

        // --- END IMPROVED LOGIC ---



        await doctorModels.delete_all_education(doctorId);
        await doctorModels.delete_all_experience(doctorId);

        // Save Education
        for (let edu of educationList) {
            await doctorModels.add_education(
                doctorId,
                edu.institute,
                edu.degree,
                edu.start_year,
                edu.end_year,

            );
        }

        // Save Experience
        for (let exp of experienceList) {
            await doctorModels.add_experience(
                doctorId,
                exp.organization,
                exp.designation,
                exp.start_date,
                exp.end_date
            );
        }
        const zynqUserId = req.user.id
        await update_onboarding_status(3, zynqUserId)
        await generateDoctorsEmbeddingsV2(zynqUserId)
        return handleSuccess(res, 201, language, "DOCTOR_PROFILE_INFO_ADDED", {});
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const addExpertise = async (req, res) => {
    try {
        const schema = Joi.object({
            treatments: Joi.array().items(
                Joi.object({
                    treatment_id: Joi.string().required(),
                    price: Joi.number().required(),
                    add_notes: Joi.string().allow('', null), // optional
                    session_duration: Joi.number().allow(null) // optional
                })
            ).min(1).required(),
            skin_type_ids: Joi.string().required(),
            skin_condition_ids: Joi.string().required(),
            surgery_ids: Joi.string().required(),
            aesthetic_devices_ids: Joi.string().required(),
            //severity_levels_ids: Joi.string().required(),
        });
        // aesthetic_devices_ids
        let language = 'en';
        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const doctorId = req.user.doctorData.doctor_id;
        const clinic_id = req.user.clinicData.clinic_id;

        // const treatmentIds = value.treatment_ids.split(',').map(id => id.trim());
        const skinTypeIds = value.skin_type_ids.split(',').map(id => id.trim());
        const skinConditionIds = value.skin_condition_ids.split(',').map(id => id.trim());
        const surgeryIds = value.surgery_ids.split(',').map(id => id.trim());
        const aestheticDevicesIds = value.aesthetic_devices_ids.split(',').map(id => id.trim());
        //const severityLevelIds = value.severity_levels_ids.split(',').map(id => id.trim());

        // Call model functions to update each expertise
        await doctorModels.update_doctor_treatments(doctorId, value.treatments);
        await doctorModels.update_doctor_skin_types(doctorId, skinTypeIds);
        //await doctorModels.update_doctor_severity_levels(doctorId, severityLevelIds);
        await doctorModels.update_doctor_skin_conditions(doctorId, skinConditionIds);
        await doctorModels.update_doctor_surgery(doctorId, surgeryIds);
        await doctorModels.update_doctor_aesthetic_devices(doctorId, aestheticDevicesIds);
        const treatmentIds = value.treatments.map(item => item.treatment_id);
        if (treatmentIds.length > 0) {
            const treatmentsData = await clinicModels.getClinicTreatments(clinic_id);
            if (treatmentsData) {
                await clinicModels.updateClinicTreatments(treatmentIds, clinic_id);
            } else {
                await clinicModels.insertClinicTreatments(treatmentIds, clinic_id);
            }

        }

        if (surgeryIds.length > 0) {
            const surgeriesData = await clinicModels.getClinicSurgeries(clinic_id);
            if (surgeriesData && surgeriesData.length > 0) {
                await clinicModels.updateClinicSurgeries(surgeryIds, clinic_id);
            } else {
                await clinicModels.insertClinicSurgeries(surgeryIds, clinic_id);
            }
        }

        if (skinConditionIds.length > 0) {
            const skinConditionData = await clinicModels.getClinicSkinConditions(clinic_id);
            if (skinConditionData && skinConditionData.length > 0) {
                await clinicModels.updateClinicSkinConditions(skinConditionIds, clinic_id);
            } else {
                await clinicModels.insertClinicSkinConditions(skinConditionIds, clinic_id);
            }
        }

        if (aestheticDevicesIds.length > 0) {
            const devicesData = await clinicModels.getClinicAestheticDevices(clinic_id);
            if (devicesData && devicesData.length > 0) {
                await clinicModels.updateClinicAestheticDevices(aestheticDevicesIds, clinic_id);
            } else {
                await clinicModels.insertClinicAestheticDevices(aestheticDevicesIds, clinic_id);
            }
        }

        if (skinTypeIds.length > 0) {
            const skinTypesData = await clinicModels.getClinicSkinTypes(clinic_id);
            if (skinTypesData) {
                await clinicModels.updateClinicSkinTypes(skinTypeIds, clinic_id);
            } else {
                await clinicModels.insertClinicSkinTypes(skinTypeIds, clinic_id);
            }
        }

        const zynqUserId = req.user.id
        await update_onboarding_status(4, zynqUserId);
        await generateDoctorsEmbeddingsV2(zynqUserId);
        return handleSuccess(res, 200, language, "EXPERTISE_UPDATED", {});
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const addConsultationFeeAndAvailability = async (req, res) => {
    try {
        const schema = Joi.object({
            fee_per_session: Joi.number().positive().optional(),
            currency: Joi.string().min(1).max(10).default('USD').optional(),
            session_duration: Joi.string().optional(),
            availability: Joi.array().items(
                Joi.object({
                    day_of_week: Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday').required(),
                    start_time: Joi.string().required().allow(''),
                    end_time: Joi.string().required().allow(''),
                    closed: Joi.number().integer().required()
                })
            ).optional(),
        });
        const language = 'en'
        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);
        const doctorId = req.user.doctorData.doctor_id;
        await doctorModels.update_consultation_fee(doctorId, value.fee_per_session, "USD", value.session_duration);
        if (value.availability?.length > 0) {
            await doctorModels.update_availability(doctorId, value.availability);
        }

        const zynqUserId = req.user.id
        await update_onboarding_status(5, zynqUserId)
        await dbOperations.updateData('tbl_clinics', { is_onboarded: 1 }, `WHERE zynq_user_id = '${zynqUserId}' `);
        await generateDoctorsEmbeddingsV2(zynqUserId)
        return handleSuccess(res, 200, language, "FEE_AVAILABILITY_ADDED", {});
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const getDoctorProfile = async (req, res) => {
    try {

        const language = 'en';
        const doctorId = req.user.doctorData.doctor_id;

        const profileData = await doctorModels.get_doctor_profile(doctorId);

        let completionPercentage = 0;
        let filledFieldsCount = 0;
        let totalFieldsCount = 0;

        // Personal Details
        const personalFields = ['name', 'phone', 'age', 'address', 'gender', 'profile_image', 'biography'];
        totalFieldsCount += personalFields.length;
        personalFields.forEach(field => {
            if (profileData[field]) filledFieldsCount++;
        });

        // Education
        totalFieldsCount += 1;
        if (profileData.education && profileData.education.length > 0) filledFieldsCount++;

        // Experience
        totalFieldsCount += 1;
        if (profileData.experience && profileData.experience.length > 0) filledFieldsCount++;

        // Expertise
        const expertiseCategories = ['treatments', 'skinTypes', 'severityLevels'];
        totalFieldsCount += expertiseCategories.length;
        expertiseCategories.forEach(category => {
            if (profileData[category] && profileData[category].length > 0) filledFieldsCount++;
        });

        // Fee & Availability
        totalFieldsCount += 2;
        if (profileData.consultationFee && profileData.consultationFee.fee_per_session) filledFieldsCount++;
        if (profileData.availability && profileData.availability.length > 0) filledFieldsCount++;

        totalFieldsCount += 1;
        if (profileData.certifications && profileData.certifications.length > 0) filledFieldsCount++;

        completionPercentage = totalFieldsCount > 0 ? Math.round((filledFieldsCount / totalFieldsCount) * 100) : 0;



        if (profileData && profileData.profile_image && !profileData.profile_image.startsWith("http")) {
            profileData.profile_image = `${APP_URL}doctor/profile_images/${profileData.profile_image}`;
        }

        if (profileData.certifications && Array.isArray(profileData.certifications)) {
            profileData.certifications.forEach(certification => {
                if (certification.upload_path && !certification.upload_path.startsWith("http")) {
                    certification.upload_path = `${APP_URL}doctor/certifications/${certification.upload_path}`;
                }
            });
        }

        // Get profile for clinic starts 

        const [clinic] = await clinicModels.get_clinic_by_zynq_user_id(req.user.id)
        if (!clinic) {
            return handleError(res, 404, "en", "CLINIC_NOT_FOUND");
        }
        const [clinicLocation] = await clinicModels.getClinicLocation(clinic.clinic_id);
        clinic.location = clinicLocation;

        const treatments = await clinicModels.getClinicTreatments(clinic.clinic_id);
        clinic.treatments = treatments;

        const operationHours = await clinicModels.getClinicOperationHours(clinic.clinic_id);
        clinic.operation_hours = operationHours;

        const equipments = await clinicModels.getClinicEquipments(clinic.clinic_id);
        clinic.equipments = equipments;

        const skinTypes = await clinicModels.getClinicSkinTypes(clinic.clinic_id);
        clinic.skin_types = skinTypes;

        const severityLevels = await clinicModels.getClinicSeverityLevels(clinic.clinic_id);
        clinic.severity_levels = severityLevels;

        const surgeries = await clinicModels.getClinicSurgeriesLevels(clinic.clinic_id);
        clinic.surgeries_level = surgeries;

        const aestheticDevices = await clinicModels.getClinicAestheticDevicesLevel(clinic.clinic_id);

        clinic.aestheticDevices = aestheticDevices;

        const skin_Conditions = await clinicModels.getClinicSkinConditionsLevel(clinic.clinic_id);
        clinic.skin_Conditions = skin_Conditions;


        const documents = await clinicModels.getClinicDocumentsLevel(clinic.clinic_id);
        documents.forEach(document => {
            if (document.file_url && !document.file_url.startsWith("http")) {
                document.file_url = `${APP_URL}${document.file_url}`;
            }
        });
        clinic.documents = documents;

        if (clinic.clinic_logo && !clinic.clinic_logo.startsWith("http")) {
            clinic.clinic_logo = `${APP_URL}clinic/logo/${clinic.clinic_logo}`;
        }

        const images = await clinicModels.getClinicImages(clinic.clinic_id);
        clinic.images = images
            .filter(img => img?.image_url)
            .map(img => ({
                clinic_image_id: img.clinic_image_id,
                url: img.image_url.startsWith('http')
                    ? img.image_url
                    : `${APP_URL}clinic/files/${img.image_url}`,
            }));

        return handleSuccess(res, 200, language, "DOCTOR_PROFILE_RETRIEVED", { ...profileData, clinic, completionPercentage });
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const createDoctorAvailability = async (req, res) => {
    try {
        const doctor_id = req.user.doctorData.doctor_id;
        const { days, fee_per_session } = req.body;

        await doctorModels.update_doctor_fee_per_session(doctor_id, fee_per_session);
        await Promise.all(
            days.map(dayObj => {
                const day = dayObj.day.toLowerCase();
                return Promise.all(
                    dayObj.slots.map(async (slot) => {
                        const availability = {
                            doctor_id,
                            day,
                            start_time: slot.start_time,
                            end_time: slot.end_time,
                            slot_duration: slot.slot_duration,
                            repeat: "weekly",
                        };
                        await doctorModels.insertDoctorAvailabilityModel(availability);
                    })
                );
            })
        );
        const zynqUserId = req.user.id


        await update_onboarding_status(5, zynqUserId);
        await dbOperations.updateData('tbl_clinics', { is_onboarded: 1 }, `WHERE zynq_user_id = '${zynqUserId}' `);
        return handleSuccess(res, 200, 'en', 'Availability_added_successfully');
    } catch (err) {
        console.error('Error creating availability:', err);
        return handleError(res, 500, 'Failed to insert availability');
    }
};


export const updateDoctorAvailability = async (req, res) => {
    try {
        const doctor_id = req.user.doctorData.doctor_id;
        const { days, fee_per_session } = req.body;

        if (fee_per_session) {
            await doctorModels.update_doctor_fee_per_session(doctor_id, fee_per_session);
        }
        await doctorModels.deleteDoctorAvailabilityByDoctorId(doctor_id);
        await Promise.all(
            days.map(dayObj => {
                const day = dayObj.day.toLowerCase();
                return Promise.all(
                    dayObj.slots.map(async (slot) => {
                        const availability = {
                            doctor_id,
                            day,
                            start_time: slot.start_time,
                            end_time: slot.end_time,
                            slot_duration: slot.slot_duration,
                            repeat: "weekly",
                        };
                        await doctorModels.insertDoctorAvailabilityModel(availability);
                    })
                );
            })
        );
        const zynqUserId = req.user.id
        await update_onboarding_status(5, zynqUserId);
        await dbOperations.updateData('tbl_clinics', { is_onboarded: 1 }, `WHERE zynq_user_id = '${zynqUserId}' `);
        return handleSuccess(res, 200, 'en', 'UPDATE_DOCTOR_AVAILABILITY_SUCCESSFULLY');
    } catch (err) {
        console.error('Error updating availability:', err);
        return handleError(res, 500, 'Failed to update availability');
    }
};

export const getDoctorProfileByStatus = async (req, res) => {
    try {
        const status = req.params.status;
        const zynqUserId = req.user.id;

        const language = 'en';
        const doctorId = req.user.doctorData.doctor_id;
        const clinicId = req.user.clinicData.clinic_id;

        let completionPercentage = 0;
        let filledFieldsCount = 0;
        let totalFieldsCount = 0;
        var profileData = {};
        var clinic = {};

        // const profileData = await doctorModels.get_doctor_profile(doctorId);
        // Personal Details
        if (status == 1) {
            [profileData] = await dbOperations.getData('tbl_doctors', `WHERE zynq_user_id = '${zynqUserId}' `);
            var [clinic] = await dbOperations.getSelectedColumn('clinic_logo, clinic_name , clinic_id ,mobile_number,address,clinic_description,ivo_registration_number,hsa_id,address', 'tbl_clinics', `WHERE zynq_user_id = '${zynqUserId}' `);
            if (!clinic) {
                return handleError(res, 404, "en", "CLINIC_NOT_FOUND");
            }
            const personalFields = ['name', 'phone', 'age', 'address', 'gender', 'profile_image', 'biography'];
            totalFieldsCount += personalFields.length;
            personalFields.forEach(field => {
                if (profileData[field]) filledFieldsCount++;
            });
            if (profileData && profileData.profile_image && !profileData.profile_image.startsWith("http")) {
                profileData.profile_image = `${APP_URL}doctor/profile_images/${profileData.profile_image}`;
            }

            if (clinic.clinic_logo && !clinic.clinic_logo.startsWith("http")) {
                clinic.clinic_logo = `${APP_URL}clinic/logo/${clinic.clinic_logo}`;
            }

            const images = await clinicModels.getClinicImages(clinicId);
            clinic.images = images
                .filter(img => img?.image_url)
                .map(img => ({
                    clinic_image_id: img.clinic_image_id,
                    url: img.image_url.startsWith('http')
                        ? img.image_url
                        : `${APP_URL}clinic/files/${img.image_url}`,
                }));

            const zynqUser = await fetchZynqUserByUserId(zynqUserId);
            profileData.on_boarding_status = zynqUser[0].on_boarding_status;

        } else if (status == 2) {
            const clinicData = await dbOperations.getSelectedColumn('address, website_url, mobile_number', 'tbl_clinics', `WHERE zynq_user_id = '${zynqUserId}' `);
            const [clinicLocation] = await clinicModels.getClinicLocation(clinicId);
            clinic = clinicLocation;
            clinic['address'] = clinicData[0].address;
            clinic['website_url'] = clinicData[0].website_url;
            clinic['mobile_number'] = clinicData[0].mobile_number;

            const zynqUser = await fetchZynqUserByUserId(zynqUserId);
            clinic.on_boarding_status = zynqUser[0].on_boarding_status;

        } else if (status == 3) {
            const certifications = await doctorModels.get_doctor_certifications(doctorId);
            const education = await doctorModels.get_doctor_education(doctorId);
            const experience = await doctorModels.get_doctor_experience(doctorId);

            if (certifications && Array.isArray(certifications)) {
                certifications.forEach(certification => {
                    if (certification.upload_path && !certification.upload_path.startsWith("http")) {
                        certification.upload_path = `${APP_URL}doctor/certifications/${certification.upload_path}`;
                    }
                });
            }

            profileData.certifications = certifications || [];
            profileData.education = education || [];
            profileData.experience = experience || [];

            const zynqUser = await fetchZynqUserByUserId(zynqUserId);
            profileData.on_boarding_status = zynqUser[0].on_boarding_status;

        } else if (status == 4) {
            // const treatments = await clinicModels.getClinicTreatments(clinicId);
            //console.log("treatments", treatments);
            const treatments = await doctorModels.get_doctor_treatments(doctorId);
            clinic.treatments = treatments;

            const equipments = await clinicModels.getClinicEquipments(clinicId);
            clinic.equipments = equipments;

            const skinTypes = await clinicModels.getClinicSkinTypes(clinicId);
            clinic.skin_types = skinTypes;

            // const severityLevels = await clinicModels.getClinicSeverityLevels(clinic.clinic_id);
            // clinic.severity_levels = severityLevels;

            const surgeries = await clinicModels.getClinicSurgeriesLevels(clinicId);
            clinic.surgeries_level = surgeries;

            const aestheticDevices = await clinicModels.getClinicAestheticDevicesLevel(clinicId);
            clinic.aestheticDevices = aestheticDevices;

            const skin_Conditions = await clinicModels.getClinicSkinConditionsLevel(clinicId);
            clinic.skin_Conditions = skin_Conditions;

            const zynqUser = await fetchZynqUserByUserId(zynqUserId);
            clinic.on_boarding_status = zynqUser[0].on_boarding_status;

        } else if (status == 5) {
            const operationHours = await dbOperations.getData('tbl_doctor_availability', `WHERE doctor_id = '${doctorId}' `); (clinic.clinic_id);
            const doctorSessions = await dbOperations.getSelectedColumn('fee_per_session, session_duration', 'tbl_doctors', `WHERE doctor_id = '${doctorId}' `);
            clinic.operation_hours = operationHours;
            clinic.doctorSessions = doctorSessions;

            const zynqUser = await fetchZynqUserByUserId(zynqUserId);
            clinic.on_boarding_status = zynqUser[0].on_boarding_status;
        }

        totalFieldsCount += 1;
        if (profileData.certifications && profileData.certifications.length > 0) filledFieldsCount++;

        completionPercentage = totalFieldsCount > 0 ? Math.round((filledFieldsCount / totalFieldsCount) * 100) : 0;






        // Get profile for clinic starts 






        // const documents = await clinicModels.getClinicDocumentsLevel(clinic.clinic_id);
        // documents.forEach(document => {
        //     if (document.file_url && !document.file_url.startsWith("http")) {
        //         document.file_url = `${APP_URL}${document.file_url}`;
        //     }
        // });
        // clinic.documents = documents;



        // Get profile for clinic ends

        return handleSuccess(res, 200, language, "DOCTOR_PROFILE_RETRIEVED", { ...profileData, clinic, completionPercentage });
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const updateOnboardingStatus = async (req, res) => {
    try {
        const { statusId } = req.query;
        await update_onboarding_status(statusId, req.user.id);
        return handleSuccess(res, 200, 'en', "ONBOARDING_STATUS_UPDATED");
    } catch (err) {
        console.error('Error updating availability:', err);
        return handleError(res, 500, 'Failed to update availability');
    }
};






