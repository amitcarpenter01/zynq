import Joi from "joi";

import dotenv from "dotenv";
import * as userModels from "../../models/api.js";
import * as clinicModels from "../../models/clinic.js";
import * as doctorModels from "../../models/doctor.js";
import { asyncHandler, handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import { sendEmail } from "../../services/send_email.js";
import { formatImagePath, generateAccessToken, generatePassword, generateVerificationLink } from "../../utils/user_helper.js";
import { fileURLToPath } from 'url';
import { fetchChatById, getChatBetweenUsers } from "../../models/chat.js";


dotenv.config();

const APP_URL = process.env.APP_URL;

const toMap = (obj) => new Map(Object.entries(obj || {}));

const formatCertifications = (certs) =>
    (certs || []).map(cert => ({
        ...cert,
        upload_path: formatImagePath(cert.upload_path, 'doctors/certifications')
    }));
 


export const get_all_doctors = async (req, res) => {
    try {

        const doctors = await userModels.getAllDoctors();
        if (!doctors || doctors.length === 0) {
            return handleError(res, 404, 'en', "NO_DOCTORS_FOUND");
        }

        for (const doctor of doctors) {
            const availability = await userModels.getDoctorAvailability(doctor.doctor_id);
            doctor.availability = availability || null;

            const certifications = await userModels.getDoctorCertifications(doctor.doctor_id);
            certifications.forEach(certification => {
                if (certification.upload_path && !certification.upload_path.startsWith('http')) {
                    certification.upload_path = `${APP_URL}doctors/certifications/${certification.upload_path}`;
                }
            });
            doctor.certifications = certifications || [];

            const education = await userModels.getDoctorEducation(doctor.doctor_id);
            doctor.education = education || [];

            const experience = await userModels.getDoctorExperience(doctor.doctor_id);
            doctor.experience = experience || [];

            const reviews = await userModels.getDoctorReviews(doctor.doctor_id);
            doctor.reviews = reviews || [];

            const severityLevels = await userModels.getDoctorSeverityLevels(doctor.doctor_id);
            doctor.severity_levels = severityLevels || [];

            const skinTypes = await userModels.getDoctorSkinTypes(doctor.doctor_id);
            doctor.skin_types = skinTypes || [];

            const treatments = await userModels.getDoctorTreatments(doctor.doctor_id);
            doctor.treatments = treatments || [];
        }
        doctors.forEach(doctor => {
            if (doctor.profile_image && !doctor.profile_image.startsWith('http')) {
                doctor.profile_image = `${APP_URL}doctor/profile_images/${doctor.profile_image}`;
            }
        });

        return handleSuccess(res, 200, 'en', "DOCTORS_FETCHED_SUCCESSFULLY", doctors);

    } catch (error) {
        console.error("Error fetching doctors:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const get_all_doctors_by_clinic_id = async (req, res) => {
    try {
        const { user_id } = req.user;


        const schema = Joi.object({
            clinic_id: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        let { clinic_id } = value;
        const doctors = await clinicModels.get_all_doctors_by_clinic_id(clinic_id);
        if (!doctors || doctors.length === 0) {
            return handleSuccess(res, 200, 'en', "DOCTORS_FETCHED_SUCCESSFULLY", []);
        }

        const doctorIds = doctors.map(doc => doc.doctor_id);

        const [allCertificates, allEducation, allExperience, allSkinTypes, allTreatments, allSkinCondition, allSurgery, allAstheticDevices] = await Promise.all([
            clinicModels.getDoctorCertificationsBulk(doctorIds),
            clinicModels.getDoctorEducationBulk(doctorIds),
            clinicModels.getDoctorExperienceBulk(doctorIds),
            clinicModels.getDoctorSkinTypesBulk(doctorIds),
            clinicModels.getDoctorTreatmentsBulk(doctorIds),
            clinicModels.getDoctorSkinConditionBulk(doctorIds),
            clinicModels.getDoctorSurgeryBulk(doctorIds),
            clinicModels.getDoctorAstheticDevicesBulk(doctorIds)
        ]);

        const processedDoctors = await Promise.all(doctors.map(async (doctor) => {
            let chatId = await getChatBetweenUsers(user_id, doctor.zynq_user_id);
            doctor.chatId = chatId.length > 0 ? chatId[0].id : null;
            return {
                ...doctor,
                treatments: allTreatments[doctor.doctor_id] || [],
                skin_types: allSkinTypes[doctor.doctor_id] || [],
                allSkinCondition: allSkinCondition[doctor.doctor_id] || [],
                allSurgery: allSurgery[doctor.doctor_id] || [],
                allAstheticDevices: allAstheticDevices[doctor.doctor_id] || [],
                allEducation: allEducation[doctor.doctor_id] || [],
                allExperience: allExperience[doctor.doctor_id] || [],
                allCertificates: allCertificates[doctor.doctor_id] || [],
                doctor_logo: doctor.profile_image && !doctor.profile_image.startsWith('http')
                    ? `${APP_URL}doctor/profile_images/${doctor.profile_image}`
                    : doctor.profile_image
            };
        }));

        processedDoctors.forEach(doctor => {
            doctor.allCertificates.forEach(certification => {
                if (certification.upload_path && !certification.upload_path.startsWith('http')) {
                    certification.upload_path = `${APP_URL}doctor/certifications/${certification.upload_path}`;
                }
                return certification;
            });
            return doctor
        })

        return handleSuccess(res, 200, 'en', "DOCTORS_FETCHED_SUCCESSFULLY", processedDoctors);

    } catch (error) {
        console.error("Error fetching doctors:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};


export const get_all_doctors_in_app_side = asyncHandler(async (req, res) => {
    const { user_id } = req.user;

    const {
        filters = {},
        sort = { by: 'default', order: 'desc' },
        pagination = { page: 1, limit: 10 }
    } = req.body;

    const {
        treatment_ids = [],
        skin_condition_ids = [],
        aesthetic_device_ids = [],
        skin_type_ids = [],
        surgery_ids = [],
        min_rating = null
    } = filters;

    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const doctors = await userModels.getAllDoctors({
        treatment_ids,
        skin_condition_ids,
        aesthetic_device_ids,
        skin_type_ids,
        surgery_ids,
        min_rating,
        sort,
        limit,
        offset
    });

    if (!doctors?.length) {
        return handleError(res, 404, 'en', "NO_DOCTORS_FOUND");
    }

    const doctorIds = doctors.map(doc => doc.doctor_id);

    const [
        allAvailability,
        allCertificates,
        allEducation,
        allExperience,
        allReviews,
        allSeverityLevels,
        allSkinTypes,
        allTreatments,
        allChats
    ] = await Promise.all([
        clinicModels.getDoctorAvailabilityBulk?.(doctorIds),
        clinicModels.getDoctorCertificationsBulk(doctorIds),
        clinicModels.getDoctorEducationBulk(doctorIds),
        clinicModels.getDoctorExperienceBulk(doctorIds),
        clinicModels.getDoctorReviewsBulk?.(doctorIds),
        clinicModels.getDoctorSeverityLevelsBulk?.(doctorIds),
        clinicModels.getDoctorSkinTypesBulk(doctorIds),
        clinicModels.getDoctorTreatmentsBulk(doctorIds),
        clinicModels.getChatsBetweenUserAndDoctors(user_id, doctorIds) // 🆕 optimized bulk chat
    ]);

    // Mapify all result sets
    const availabilityMap = toMap(allAvailability);
    const certMap = toMap(allCertificates);
    const eduMap = toMap(allEducation);
    const expMap = toMap(allExperience);
    const reviewsMap = toMap(allReviews);
    const severityMap = toMap(allSeverityLevels);
    const skinTypeMap = toMap(allSkinTypes);
    const treatmentMap = toMap(allTreatments);

    // Mapify chats by doctor zynq_user_id
    const chatMap = new Map();
    (allChats || []).forEach(chat => {
        const doctorUserId = chat.other_user_id; // or chat.doctor_user_id depending on schema
        chatMap.set(doctorUserId, chat);
    });

    const enrichedDoctors = doctors.map((doctor) => {
        return {
            ...doctor,
            chatId: chatMap.get(doctor.zynq_user_id)?.id || null,
            profile_image: formatImagePath(doctor.profile_image, 'doctor/profile_images'),
            availability: availabilityMap.get(doctor.doctor_id) || [],
            certifications: formatCertifications(certMap.get(doctor.doctor_id)),
            education: eduMap.get(doctor.doctor_id) || [],
            experience: expMap.get(doctor.doctor_id) || [],
            reviews: reviewsMap.get(doctor.doctor_id) || [],
            severity_levels: severityMap.get(doctor.doctor_id) || [],
            skin_types: skinTypeMap.get(doctor.doctor_id) || [],
            treatments: treatmentMap.get(doctor.doctor_id) || []
        };
    });

    return handleSuccess(res, 200, 'en', "DOCTORS_FETCHED_SUCCESSFULLY", enrichedDoctors);
});

export const get_recommended_doctors = asyncHandler(async (req, res) => {
    const { user_id } = req.user;

    const {
        filters = {},
        sort = { by: 'default', order: 'desc' },
        pagination = { page: 1, limit: 10 }
    } = req.body;
 
    let {
        treatment_ids = [],
        skin_condition_ids = [],
        aesthetic_device_ids = [],
        skin_type_ids = [],
        surgery_ids = [],
        concern_ids = [],
        min_rating = null
    } = filters;
 
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;
 
    if (concern_ids.length > 0) {
        const treatment_ids_from_concern = await userModels.getTreatmentIdsByConcernIds(concern_ids);
        if (Array.isArray(treatment_ids_from_concern) && treatment_ids_from_concern.length > 0) {
            treatment_ids = treatment_ids.concat(treatment_ids_from_concern);
        }
    }
 
    // 👇 Check if all filters are empty, then fallback to user-specific treatments
    const areAllFiltersEmpty =
        treatment_ids.length === 0 &&
        skin_condition_ids.length === 0 &&
        aesthetic_device_ids.length === 0 &&
        skin_type_ids.length === 0 &&
        surgery_ids.length === 0 &&
        !min_rating;
 
    if (areAllFiltersEmpty) {
        const fallbackTreatmentIds = await getTreatmentIDsByUserID(user_id);
        treatment_ids = fallbackTreatmentIds || [];
    }
 
    const doctors = await userModels.getAllRecommendedDoctors({
        treatment_ids,
        skin_condition_ids,
        aesthetic_device_ids,
        skin_type_ids,
        surgery_ids,
        min_rating,
        sort,
        limit,
        offset
    });
 
    if (!doctors?.length) {
       return handleSuccess(res, 200, language || 'en', "DOCTORS_FETCHED_SUCCESSFULLY", doctors);
    }
 
    const doctorIds = doctors.map(doc => doc.doctor_id);
 
    const [
        allAvailability,
        allCertificates,
        allEducation,
        allExperience,
        allReviews,
        allSeverityLevels,
        allSkinTypes,
        allTreatments,
        allChats
    ] = await Promise.all([
        clinicModels.getDoctorAvailabilityBulk?.(doctorIds),
        clinicModels.getDoctorCertificationsBulk(doctorIds),
        clinicModels.getDoctorEducationBulk(doctorIds),
        clinicModels.getDoctorExperienceBulk(doctorIds),
        clinicModels.getDoctorReviewsBulk?.(doctorIds),
        clinicModels.getDoctorSeverityLevelsBulk?.(doctorIds),
        clinicModels.getDoctorSkinTypesBulk(doctorIds),
        clinicModels.getDoctorTreatmentsBulk(doctorIds),
        clinicModels.getChatsBetweenUserAndDoctors(user_id, doctorIds)
    ]);
 
    const availabilityMap = toMap(allAvailability);
    const certMap = toMap(allCertificates);
    const eduMap = toMap(allEducation);
    const expMap = toMap(allExperience);
    const reviewsMap = toMap(allReviews);
    const severityMap = toMap(allSeverityLevels);
    const skinTypeMap = toMap(allSkinTypes);
    const treatmentMap = toMap(allTreatments);
 
    const chatMap = new Map();
    (allChats || []).forEach(chat => {
        const doctorUserId = chat.other_user_id;
        chatMap.set(doctorUserId, chat);
    });
 
    const enrichedDoctors = doctors.map((doctor) => ({
        ...doctor,
        chatId: chatMap.get(doctor.zynq_user_id)?.id || null,
        profile_image: formatImagePath(doctor.profile_image, 'doctor/profile_images'),
        availability: availabilityMap.get(doctor.doctor_id) || [],
        certifications: formatCertifications(certMap.get(doctor.doctor_id)),
        education: eduMap.get(doctor.doctor_id) || [],
        experience: expMap.get(doctor.doctor_id) || [],
        reviews: reviewsMap.get(doctor.doctor_id) || [],
        severity_levels: severityMap.get(doctor.doctor_id) || [],
        skin_types: skinTypeMap.get(doctor.doctor_id) || [],
        treatments: treatmentMap.get(doctor.doctor_id) || []
    }));
 
    return handleSuccess(res, 200, language || 'en', "DOCTORS_FETCHED_SUCCESSFULLY", enrichedDoctors);
});

export const getSingleDoctor = asyncHandler(async (req, res) => {
    const { doctor_id } = req.params;
    const { user_id } = req.user;

    const doctorResult = await doctorModels.getDoctorByDoctorID(doctor_id);
    const doctor = doctorResult?.[0];

    if (!doctor) {
        return handleSuccess(res, 200, 'en', "DOCTOR_NOT_FOUND", null);
    }

    const [
        allCertificates, allEducation, allExperience,
        allSkinTypes, allTreatments, allSkinCondition,
        allSurgery, allAstheticDevices
    ] = await Promise.all([
        clinicModels.getDoctorCertificationsBulk([doctor_id]),
        clinicModels.getDoctorEducationBulk([doctor_id]),
        clinicModels.getDoctorExperienceBulk([doctor_id]),
        clinicModels.getDoctorSkinTypesBulk([doctor_id]),
        clinicModels.getDoctorTreatmentsBulk([doctor_id]),
        clinicModels.getDoctorSkinConditionBulk([doctor_id]),
        clinicModels.getDoctorSurgeryBulk([doctor_id]),
        clinicModels.getDoctorAstheticDevicesBulk([doctor_id])
    ]);
 
    const chat = await getChatBetweenUsers(user_id, doctor.zynq_user_id);
    const images = await clinicModels.getClinicImages(doctor.clinic_id);
    doctor.images = images
        .filter(img => img?.image_url)
        .map(img => ({
            clinic_image_id: img.clinic_image_id,
            url: formatImagePath(img.image_url, 'clinic/files'),
        }));
 
    const processedDoctor = {
        latitude: null,
        longitude: null,
        ...doctor,
        chatId: chat?.[0]?.id || null,
        treatments: allTreatments[doctor_id] || [],
        skin_types: allSkinTypes[doctor_id] || [],
        allSkinCondition: allSkinCondition[doctor_id] || [],
        allSurgery: allSurgery[doctor_id] || [],
        allAstheticDevices: allAstheticDevices[doctor_id] || [],
        allEducation: allEducation[doctor_id] || [],
        allExperience: allExperience[doctor_id] || [],
        allCertificates: (allCertificates[doctor_id] || []).map(cert => ({
            ...cert,
            upload_path: cert.upload_path
                ? (cert.upload_path.startsWith('http')
                    ? cert.upload_path
                    : `${APP_URL}doctor/certifications/${cert.upload_path}`)
                : null
        })),
        doctor_logo: doctor.profile_image
            ? (doctor.profile_image.startsWith('http')
                ? doctor.profile_image
                : `${APP_URL}doctor/profile_images/${doctor.profile_image}`)
            : null
    };
 
    return handleSuccess(res, 200, 'en', "DOCTOR_FETCHED_SUCCESSFULLY", processedDoctor);
});
