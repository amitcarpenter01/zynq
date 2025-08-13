import Joi from "joi";
import dotenv from "dotenv";
import * as doctorModels from "../../models/doctor.js";
import { asyncHandler, handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import { get_web_user_by_id, getUserDataByRole, update_onboarding_status } from "../../models/web_user.js";
import { createChat, fetchChatById, insertChatUsersActive, toActivateUsers } from "../../models/chat.js";
import { getIO, getUserSockets } from '../../utils/socketManager.js';
import dbOperations from '../../models/common.js';
import { get_product_images_by_product_ids } from "../../models/api.js";
dotenv.config();

//const APP_URL = process.env.APP_URL;
const APP_URL = process.env.LOCAL_APP_URL;
const image_logo = process.env.LOGO_URL;







export const addPersonalInformation = async (req, res) => {
    try {
        const schema = Joi.object({
            name: Joi.string().max(255).required(),
            phone: Joi.string().max(255).required(),
            age: Joi.string().max(255).required(),
            address: Joi.string().max(255).required(),
            gender: Joi.string().max(255).required(),
            biography: Joi.string().optional().allow('')
        });

        let language = req?.user?.language || 'en';

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        let filename = '';
        if (req.file) {
            filename = req.file.filename
        }
        console.log("req.user", req.user)
        const zynqUserId = req.user.id

        console.log("value", value)

        const result = await doctorModels.add_personal_details(zynqUserId, value.name, value.phone, value.age, value.address, value.gender, filename, value.biography);
        console.log("result", result)
        if (result.affectedRows) {
            await update_onboarding_status(1, zynqUserId)
            return handleSuccess(res, 201, language, "DOCTOR_PERSONAL_DETAILS_ADDED", result.affectedRows);
        } else {
            return handleError(res, 500, language, 'FAILED_TO_ADD_PERSONAL_DETAILS');
        }
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

        let language = req?.user?.language || 'en';

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
                            console.log(`Updated certification for doctor ${doctorId}, type ${certification_type_id} with new file ${newUploadPath}`);
                        } else {
                            // Certification does not exist, add it
                            await doctorModels.add_certification(doctorId, certification_type_id, newUploadPath); // Add other metadata if available from req.body
                            console.log(`Added new certification for doctor ${doctorId}, type ${certification_type_id} with file ${newUploadPath}`);
                        }
                    }
                } else {
                    console.warn(`Certification type with filename key '${key}' not found in tbl_certification_type. Skipping file processing.`);
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
        await update_onboarding_status(2, zynqUserId)
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
            // severity_levels_ids: Joi.string().required(), // if needed in future
        });

        let language = req?.user?.language || 'en';
        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const doctorId = req.user.doctorData.doctor_id;

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


        const zynqUserId = req.user.id
        await update_onboarding_status(3, zynqUserId);
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
            clinic_id: Joi.string().required(),
            availability: Joi.array().items(
                Joi.object({
                    day_of_week: Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday').required(),
                    start_time: Joi.string().required().allow(''),
                    end_time: Joi.string().required().allow(''),
                    closed: Joi.number().integer().optional(),
                    fee_per_session: Joi.number().positive().optional(),
                })
            ).optional(),
        });
        let language = req?.user?.language || 'en';
        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);
        const doctorId = req.user.doctorData.doctor_id;
        // await doctorModels.update_consultation_fee(doctorId, value.fee_per_session, "USD", value.session_duration);
        if (value.availability?.length > 0) {
            await doctorModels.update_availability(doctorId, value.availability, clinic_id);
        }

        const zynqUserId = req.user.id
        await update_onboarding_status(4, zynqUserId)
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
        const expertiseCategories = ['treatments', 'skinTypes', 'severityLevels', 'skinCondition', 'surgery', 'aestheticDevices'];
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
        console.log("profileData.certifications", profileData.certifications)

        if (profileData.certifications && Array.isArray(profileData.certifications)) {
            profileData.certifications.forEach(certification => {
                if (certification.upload_path && !certification.upload_path.startsWith("http")) {
                    certification.upload_path = `${APP_URL}doctor/certifications/${certification.upload_path}`;
                }
            });
        }

        return handleSuccess(res, 200, language, "DOCTOR_PROFILE_RETRIEVED", { ...profileData, completionPercentage });
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const editPersonalInformation = async (req, res) => {
    try {
        const schema = Joi.object({
            name: Joi.string().max(255).optional(),
            phone: Joi.string().max(255).optional(),
            age: Joi.string().max(255).optional(),
            address: Joi.string().max(255).optional(),
            gender: Joi.string().max(255).optional(),
            biography: Joi.string().optional().allow('')
        });
        let language = req?.user?.language || 'en';

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        console.log("value", value)


        const zynqUserId = req.user.id;
        const [doctorData] = await doctorModels.get_doctor_by_zynquser_id(zynqUserId);

        if (!doctorData) {
            return handleError(res, 404, language, "DOCTOR_NOT_FOUND");
        }
        let filename = doctorData.profile_image;
        if (req.file) {
            filename = req.file.filename
        }

        const result = await doctorModels.add_personal_details(zynqUserId, value.name, value.phone, value.age, value.address, value.gender, filename, value.biography);

        if (result.affectedRows > 0) {
            return handleSuccess(res, 200, language, "DOCTOR_PERSONAL_DETAILS_UPDATED", result.affectedRows);
        } else if (result.affectedRows === 0) {
            return handleSuccess(res, 200, language, "NO_CHANGES_MADE", {});
        } else {
            return handleError(res, 500, language, 'FAILED_TO_UPDATE_PERSONAL_DETAILS');
        }
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const addEducation = async (req, res) => {
    try {
        const schema = Joi.object({
            education: Joi.string().required(),   // will be JSON
        });

        let language = req?.user?.language || 'en';

        const payload = {
            education: req.body.education,
        };

        const { error, value } = schema.validate(payload);
        if (error) return joiErrorHandle(res, error);

        const doctorId = req.user.doctorData.doctor_id;

        const educationList = JSON.parse(value.education);

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

        return handleSuccess(res, 201, language, "EDUCATION_ADDED", {});
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const editEducation = async (req, res) => {
    try {
        const schema = Joi.object({
            education_id: Joi.string().uuid().required(),
            institute: Joi.string().min(3).max(255).optional(),
            degree: Joi.string().min(2).max(255).optional(),
            start_year: Joi.string().optional(),
            end_year: Joi.string().optional(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        let language = req?.user?.language || 'en';

        const result = await doctorModels.update_education(
            value.education_id,
            value.institute,
            value.degree,
            value.start_year,
            value.end_year
        );

        if (result.affectedRows > 0) {
            return handleSuccess(res, 200, language, "EDUCATION_UPDATED_SUCCESSFULLY", result.affectedRows);
        } else {
            return handleSuccess(res, 200, language, "NO_CHANGES_MADE", {});
        }
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const deleteEducation = async (req, res) => {
    try {
        console.log("req.params>>", req.params)
        const schema = Joi.object({
            education_id: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.params);
        if (error) return joiErrorHandle(res, error);

        console.log("req.params>>", req.params);

        let language = req?.user?.language || 'en';

        const result = await doctorModels.delete_education(value.education_id);

        if (result.affectedRows > 0) {
            return handleSuccess(res, 200, language, "EDUCATION_DELETED", result.affectedRows);
        } else {
            return handleError(res, 500, language, 'EDUCATION_NOT_FOUND');
        }
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const addExperince = async (req, res) => {
    try {
        const schema = Joi.object({
            experience: Joi.string().required(), // will be JSON
        });

        let language = req?.user?.language || 'en';

        const payload = {
            experience: req.body.experience
        };

        const { error, value } = schema.validate(payload);
        if (error) return joiErrorHandle(res, error);

        const doctorId = req.user.doctorData.doctor_id;
        const experienceList = JSON.parse(value.experience);

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
        return handleSuccess(res, 201, language, "EXPERIENCE_ADDED", {});
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const editExperience = async (req, res) => {
    try {
        const schema = Joi.object({
            experience_id: Joi.string().uuid().required(),
            organization: Joi.string().min(3).max(255).optional(),
            designation: Joi.string().min(2).max(255).optional(),
            start_date: Joi.string().optional(),
            end_date: Joi.string().optional(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const result = await doctorModels.update_experience(
            value.experience_id,
            value.organization,
            value.designation,
            value.start_date,
            value.end_date
        );

        let language = req?.user?.language || 'en';

        if (result.affectedRows > 0) {
            return handleSuccess(res, 200, language, "EXPERIENCE_UPDATED", result.affectedRows);
        } else {
            return handleSuccess(res, 200, language, "NO_CHANGES_MADE", {});
        }
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const deleteExperience = async (req, res) => {
    try {
        const schema = Joi.object({
            experience_id: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.params);
        if (error) return joiErrorHandle(res, error);

        const result = await doctorModels.delete_experience(value.experience_id);
        let language = req?.user?.language || 'en';
        if (result.affectedRows > 0) {
            return handleSuccess(res, 200, language, "EXPERIENCE_DELETED", result.affectedRows);
        } else {
            return handleError(res, 500, language, 'EXPERIENCE_NOT_FOUND');
        }
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const editExpertise = async (req, res) => {
    try {
        const schema = Joi.object({
            treatments: Joi.array().items(
                Joi.object({
                    treatment_id: Joi.string().required(),
                    price: Joi.number().required(),
                    add_notes: Joi.string().allow('', null), // optional
                    session_duration: Joi.number().allow(null) // optional
                })
            ).optional(),
            skin_type_ids: Joi.string().optional(),
            severity_levels_ids: Joi.string().optional(),
            skin_condition_ids: Joi.string().optional(),
            surgery_ids: Joi.string().optional(),
            aesthetic_devices_ids: Joi.string().optional(),
        });

        let language = req?.user?.language || 'en';
        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const doctorId = req.user.doctorData.doctor_id;

        if (value.treatments !== undefined) {
            // const treatmentIds = value.treatment_ids.split(',').map(id => id.trim());
            await doctorModels.update_doctor_treatments(doctorId, value.treatments);
        }
        if (value.skin_type_ids !== undefined) {
            const skinTypeIds = value.skin_type_ids.split(',').map(id => id.trim());
            await doctorModels.update_doctor_skin_types(doctorId, skinTypeIds);
        }
        if (value.severity_levels_ids !== undefined) {
            const severityLevelIds = value.severity_levels_ids.split(',').map(id => id.trim());
            await doctorModels.update_doctor_severity_levels(doctorId, severityLevelIds);
        }
        if (value.skin_condition_ids !== undefined) {
            const skinConditionIds = value.skin_condition_ids.split(',').map(id => id.trim());
            await doctorModels.update_doctor_skin_conditions(doctorId, skinConditionIds)
        }
        if (value.surgery_ids !== undefined) {
            const surgeryIds = value.surgery_ids.split(',').map(id => id.trim());
            await doctorModels.update_doctor_surgery(doctorId, surgeryIds)
        }
        if (value.aesthetic_devices_ids !== undefined) {
            const aestheticDevicesIds = value.aesthetic_devices_ids.split(',').map(id => id.trim());
            await doctorModels.update_doctor_aesthetic_devices(doctorId, aestheticDevicesIds)
        }

        return handleSuccess(res, 200, language, "DOCTOR_PERSONAL_DETAILS_UPDATED", {});
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const addCertifications = async (req, res) => {
    try {

        let language = req?.user?.language || 'en';

        const doctorId = req.user.doctorData.doctor_id;

        const files = req.files;

        for (const key in files) {
            const certType = await doctorModels.get_certification_type_by_filename(key)

            if (certType.length > 0) {
                const certification_type_id = certType[0].certification_type_id;

                for (const file of files[key]) {
                    console.log("file>>>>>>>", file)
                    await doctorModels.add_certification(doctorId, certification_type_id, file.filename)
                }
            }
        }

        return handleSuccess(res, 201, language, "CERTIFICATION_ADDED", {});
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const editCertification = async (req, res) => {
    try {
        const schema = Joi.object({
            doctor_certification_id: Joi.string().uuid().required(),
        });
        let language = req?.user?.language || 'en';
        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const result = await doctorModels.update_certification(req.file.filename, value.doctor_certification_id);

        if (result.affectedRows > 0) {
            return handleSuccess(res, 200, language, "CERTIFICATION_UPDATED", result.affectedRows);
        } else {
            return handleSuccess(res, 200, language, "NO_CHANGES_MADE", {});
        }
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const deleteCertification = async (req, res) => {
    try {
        const schema = Joi.object({
            doctor_certification_id: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.params);
        if (error) return joiErrorHandle(res, error);

        const result = await doctorModels.delete_certification(value.doctor_certification_id);
        let language = req?.user?.language || 'en';
        if (result.affectedRows > 0) {
            return handleSuccess(res, 200, language, "CERTIFICATION_DELETED", result.affectedRows);
        } else {
            return handleError(res, 500, language, 'CERTIFICATION_NOT_FOUND');
        }
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const editConsultationFeeAndAvailability = async (req, res) => {
    try {
        // const schema = Joi.object({
        //     fee_per_session: Joi.number().positive().optional(),
        //     currency: Joi.string().min(1).max(10).default('USD').optional(),
        //     session_duration: Joi.string().optional(),
        //     availability: Joi.array().items(
        //         Joi.object({
        //             day_of_week: Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday').required(),

        //             start_time: Joi.string().required().allow(''),
        //             end_time: Joi.string().required().allow(''),
        //             closed: Joi.number().integer().required()
        //         })
        //     ).optional(),
        // });
        let language = req?.user?.language || 'en';
        // const { error, value } = schema.validate(req.body);
        // if (error) return joiErrorHandle(res, error);
        // const doctorId = req.user.doctorData.doctor_id;
        let { doctor_availability_id } = req.params;

        // await doctorModels.update_consultation_fee(doctorId, value.fee_per_session, "USD", value.session_duration);
        // await doctorModels.update_docter_availability(doctorId, value.availability);
        await doctorModels.update_docter_availability(req.body, doctor_availability_id);
        return handleSuccess(res, 200, language, "DOCTOR_PERSONAL_DETAILS_UPDATED", {});
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const getLinkedClinics = async (req, res) => {
    try {
        const language = 'en';
        const doctorId = req.user.doctorData.doctor_id; // Assuming doctorId is available in req.user

        const profileData = await doctorModels.get_clinics_data_by_doctor_id(doctorId);

        return handleSuccess(res, 200, language, "DOCTOR_PROFILE_RETRIEVED", profileData);
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const calculateProfileCompletionPercentageByDoctorId = async (doctorId) => {
    try {
        const profileData = await doctorModels.get_doctor_profile(doctorId);
        if (!profileData) {
            return 0; // No profile found
        }

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

        // Expertise (Expanded to include surgeries, aestheticDevices, skinConditions)
        const expertiseCategories = [
            'treatments',
            'skinTypes',
            'severityLevels',
            'surgeries',
            'aestheticDevices',
            'skinConditions'
        ];
        totalFieldsCount += expertiseCategories.length;
        expertiseCategories.forEach(category => {
            if (profileData[category] && profileData[category].length > 0) filledFieldsCount++;
        });

        // Fee & Availability
        totalFieldsCount += 2;
        if (profileData.consultationFee && profileData.consultationFee.fee_per_session) filledFieldsCount++;
        if (profileData.availability && profileData.availability.length > 0) filledFieldsCount++;

        return totalFieldsCount > 0 ? Math.round((filledFieldsCount / totalFieldsCount) * 100) : 0;

    } catch (error) {
        console.error("Error calculating profile completion:", error);
        return 0;
    }
};

export const editEducationAndExperienceInformation = async (req, res) => {
    try {
        const schema = Joi.object({
            education: Joi.string().optional(),
            experience: Joi.string().optional(),
        });

        let language = req?.user?.language || 'en';

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
                            console.log(`Updated certification for doctor ${doctorId}, type ${certification_type_id} with new file ${newUploadPath}`);
                        } else {
                            // Certification does not exist, add it
                            await doctorModels.add_certification(doctorId, certification_type_id, newUploadPath); // Add other metadata if available from req.body
                            console.log(`Added new certification for doctor ${doctorId}, type ${certification_type_id} with file ${newUploadPath}`);
                        }
                    }
                } else {
                    console.warn(`Certification type with filename key '${key}' not found in tbl_certification_type. Skipping file processing.`);
                }
            }
        }

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
        return handleSuccess(res, 201, language, "DOCTOR_PERSONAL_DETAILS_UPDATED", {});
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const deleteProfileImage = async (req, res) => {
    try {
        const doctorId = req.user.doctorData.doctor_id;
        const result = await doctorModels.delete_profile_image(doctorId);
        const language = req?.user?.language || 'en';
        if (result.affectedRows > 0) {
            return handleSuccess(res, 200, language, "PROFILE_IMAGE_DELETED", result.affectedRows);
        } else {
            return handleError(res, 500, language, 'CERTIFICATION_NOT_FOUND');
        }
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};


export const getDoctorCertificatesWithPath = async (req, res) => {
    try {
        const language = 'en';
        const doctorId = req.user.doctorData.doctor_id; // Assuming doctorId is available in req.user

        const profileData = await doctorModels.getCertificationsWithUploadPathByDoctorId(doctorId);

        return handleSuccess(res, 200, language, "DOCTOR_PROFILE_RETRIEVED", profileData);
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

// ======================================chat sections==========================================================//

export const createUsersChat = async (req, res) => {
    try {
        const language = 'en';
        const doctorId = req.user.doctorData.zynq_user_id
        const { userId } = req.body;
        let chatCreatedSuccessfully = await createChat(doctorId, userId);
        if (!chatCreatedSuccessfully.insertId) {
            return handleError(res, 400, 'en', "Failed To Create a chat");
        }
        let doctorUser = { chat_id: chatCreatedSuccessfully.insertId, userId: doctorId, isActive: 1 }
        await insertChatUsersActive(doctorUser)
        let user = { chat_id: chatCreatedSuccessfully.insertId, userId: userId, isActive: 0 }
        await insertChatUsersActive(user)
        return handleSuccess(res, 200, language, 'CHAT_CREATED_SUCCESSFULLY');
    } catch (error) {
        console.error('Error in addMembersInGroup:', error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const fetchDocterAvibility = async (req, res) => {
    try {
        const language = 'en';
        const doctorId = req.user.doctorData.doctor_id;
        const listOfDocterAvibility = await doctorModels.fetchDocterAvibilityById(doctorId);
        return handleSuccess(res, 200, language, "DOCTOR_AVIBILITY_FETCH_SUCCESSFULLY", listOfDocterAvibility);
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const getDoctorProfileById = async (req, res) => {
    try {
        const language = 'en';
        const doctorId = req.query.doctor_id;
        let listOfDocterAvibility = await doctorModels.get_doctor_by_zynquser_id(doctorId);
        if (listOfDocterAvibility.length == 0) {
            return handleError(res, 400, language, "DOCTOR_FETCH_SUCCESSFULLY", {});
        }
        if (listOfDocterAvibility[0].profile_image !== null || '') {
            listOfDocterAvibility[0].profile_image = `${APP_URL}doctor/profile_images/${listOfDocterAvibility[0].profile_image}`;
        }
        return handleSuccess(res, 200, language, "DOCTOR_FETCH_SUCCESSFULLY", listOfDocterAvibility[0]);
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const isDocterOfflineOrOnline = async (req, res) => {
    try {
        const doctorId = req.user.doctorData.zynq_user_id;
        const language = 'en';
        let { isOnline } = req.body
        // const io = getIO();
        await doctorModels.update_doctor_is_online(doctorId, isOnline);
        // await toActivateUsers(isOnline, chat_id, doctorId);
        // io.to(doctorId).emit('isUsersOnlineOrOffline', isOnline);

        return handleSuccess(res, 200, language, `DOCTOR ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

    } catch (error) {
        console.error('error', error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};



// -------------------------------------slot managment------------------------------------------------//

export const createDoctorAvailability = async (req, res) => {
    try {
        const doctor_id = req.user.doctorData.doctor_id;
        const { days, fee_per_session, dr_type } = req.body;
        const language = req?.user?.language || 'en';
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
                            start_time_utc: slot.start_time_utc,
                            end_time_utc: slot.end_time_utc,
                            repeat: "weekly",
                        };
                        await doctorModels.insertDoctorAvailabilityModel(availability);
                    })
                );
            })
        );
        const zynqUserId = req.user.id
        // -------------------1 for solo doctor and 2 for doctor
        if (dr_type == 1) {
            await update_onboarding_status(5, zynqUserId);
        } else {
            await update_onboarding_status(4, zynqUserId);
        }
        await dbOperations.updateData('tbl_clinics', { is_onboarded: 1 }, `WHERE zynq_user_id = '${zynqUserId}' `);
        return handleSuccess(res, 200, language, 'AVAILABILITY_CREATED_SUCCESSFULLY');
    } catch (err) {
        console.error('Error creating availability:', err);
        return handleError(res, 500, 'Failed to insert availability');
    }
};


export const updateDoctorAvailability = async (req, res) => {
    try {
        const doctor_id = req.user.doctorData.doctor_id;
        const language = req?.user?.language || 'en';
        const { days, fee_per_session, dr_type } = req.body;

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
                            start_time_utc: slot.start_time_utc,
                            end_time_utc: slot.end_time_utc,
                            repeat: "weekly",
                        };
                        await doctorModels.insertDoctorAvailabilityModel(availability);
                    })
                );
            })
        );
        const zynqUserId = req.user.id
        if (dr_type == 1) {
            await update_onboarding_status(5, zynqUserId);
        } else {
            await update_onboarding_status(4, zynqUserId);
        }
        await dbOperations.updateData('tbl_clinics', { is_onboarded: 1 }, `WHERE zynq_user_id = '${zynqUserId}' `);
        return handleSuccess(res, 200, language, 'UPDATE_DOCTOR_AVAILABILITY_SUCCESSFULLY');

    } catch (err) {
        console.error('Error updating availability:', err);
        return handleError(res, 500, 'Failed to update availability');
    }
};


export const get_docter_profile = async (req, res) => {
    try {
        const language = 'en';
        const doctorId = req.user.doctorData.zynq_user_id;

        // let profileData = await get_web_user_by_id(doctorId);
        // if (profileData && profileData.profile_image && !profileData.profile_image.startsWith("http")) {
        //     profileData.profile_image = `${APP_URL}doctor/profile_images/${profileData.profile_image}`;
        // }
        let data = {
            id: doctorId,
        }
        return handleSuccess(res, 200, language, "DOCTOR_PROFILE_RETRIEVED", data);
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const create_call_log_doctor = async (req, res) => {
    try {
        const {
            call_id,
            receiver_user_id,
            status,
            started_at // <-- New field from frontend
        } = req.body;

        const { role_name, doctorData } = req.user;

        const language = req?.user?.language || 'en';

        if (role_name !== 'DOCTOR') {
            return handleError(res, 403, language, "Only doctors can access this endpoint");
        }

        if (!call_id || !status || !receiver_user_id || !started_at) {
            return handleError(res, 400, language, "Missing required fields");
        }

        const sender_doctor_id = doctorData?.doctor_id;

        await doctorModels.createOrUpdateCallLog({
            call_id,
            sender_user_id: null,
            sender_doctor_id,
            receiver_user_id,
            receiver_doctor_id: null,
            status,
            started_at // Pass to model
        });

        return handleSuccess(res, 200, language, "CALL_LOG_CREATED_SUCCESSFULLY");
    } catch (error) {
        console.error("Error in create_call_log_doctor:", error);
        return handleError(res, 500, 'en', error.message);
    }
}

export const getDashboard = asyncHandler(async (req, res) => {
    const dashboardData = await doctorModels.getDashboardData(req.user);
    return handleSuccess(res, 200, 'en', 'DASHBOARD_DATA', dashboardData);
})


export const getClinicPurchasedProducts = asyncHandler(async (req, res) => {
    const language = req?.user?.language || 'en';
    const clinic_id = req.user.clinicData.clinic_id
    const products = await doctorModels.getClinicPurchasedProductModel(clinic_id);
    const carts = await doctorModels.getClinicCartProductModel(clinic_id);

    const {
        total_clinic_earnings,
        total_admin_earnings,
        total_carts_earnings
    } = carts.reduce(
        (acc, cart) => {
            const clinicEarning = Number(cart.clinic_earnings) || 0;
            const adminEarning = Number(cart.admin_earnings) || 0;
            const cartEarning = Number(cart.total_price) || 0;

            acc.total_clinic_earnings += clinicEarning;
            acc.total_admin_earnings += adminEarning;
            acc.total_carts_earnings += cartEarning;

            return acc;
        },
        {
            total_clinic_earnings: 0,
            total_admin_earnings: 0,
            total_carts_earnings: 0
        }
    );

    const data = {
        total_clinic_earnings: Number(total_clinic_earnings.toFixed(2)),
        total_admin_earnings: Number(total_admin_earnings.toFixed(2)),
        total_carts_earnings: Number(total_carts_earnings.toFixed(2)),
        products: products,
    }
    return handleSuccess(res, 200, language, "PURCHASED_PRODUCTS_FETCHED", data);
});

export const getSingleClinicPurchasedProducts = asyncHandler(async (req, res) => {
    const language = req?.user?.language || 'en';
    const clinic_id = req.user.clinicData.clinic_id
    const purchase_id = req.params.purchase_id
    const products = await doctorModels.getSingleClinicPurchasedProductModel(clinic_id, purchase_id);
    const carts = await doctorModels.getSingleClinicCartProductModel(clinic_id, purchase_id);

    const {
        total_clinic_earnings,
        total_admin_earnings,
        total_carts_earnings
    } = carts.reduce(
        (acc, cart) => {
            const clinicEarning = Number(cart.clinic_earnings) || 0;
            const adminEarning = Number(cart.admin_earnings) || 0;
            const cartEarning = Number(cart.total_price) || 0;

            acc.total_clinic_earnings += clinicEarning;
            acc.total_admin_earnings += adminEarning;
            acc.total_carts_earnings += cartEarning;

            return acc;
        },
        {
            total_clinic_earnings: 0,
            total_admin_earnings: 0,
            total_carts_earnings: 0
        }
    );

    const data = {
        total_clinic_earnings: Number(total_clinic_earnings.toFixed(2)),
        total_admin_earnings: Number(total_admin_earnings.toFixed(2)),
        total_carts_earnings: Number(total_carts_earnings.toFixed(2)),
        products: products,
    }
    return handleSuccess(res, 200, language, "PURCHASED_PRODUCTS_FETCHED", data);
});