import Joi from "joi";
import ejs from 'ejs';
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken"
import * as userModels from "../../models/api.js";
import * as clinicModels from "../../models/clinic.js";
import * as doctorModels from "../../models/doctor.js";
import { sendEmail } from "../../services/send_email.js";
import { generateAccessToken, generatePassword, generateVerificationLink } from "../../utils/user_helper.js";
import { asyncHandler, handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import { fileURLToPath } from 'url';
import { fetchChatById, getChatBetweenUsers } from "../../models/chat.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const APP_URL = process.env.APP_URL;
const image_logo = process.env.LOGO_URL;


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
        sort = { by: 'nearest', order: 'asc' },
        pagination = { page: 1, limit: 20 }
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

    const {
        latitude: userLatitude = null,
        longitude: userLongitude = null,
        language = 'en'
    } = req.user;

    let effectiveSort = { ...sort };

    if (effectiveSort.by === 'nearest' && (!userLatitude || !userLongitude)) {
        console.warn("User selected 'nearest' but no location found, falling back to default sort.");
        effectiveSort = { by: 'default', order: 'desc' };
    }

    const doctors = await userModels.getAllDoctors({
        treatment_ids,
        skin_condition_ids,
        aesthetic_device_ids,
        skin_type_ids,
        surgery_ids,
        min_rating,
        sort: effectiveSort,
        userLatitude,
        userLongitude,
        limit,
        offset
    });
    if (!doctors?.length) {
        return handleError(res, 404, 'en', "NO_DOCTORS_FOUND");
    }
    const doctorIds = doctors.map(doc => doc.doctor_id);

    // Bulk fetch all related data
    const [
        allAvailability,
        allCertificates,
        allEducation,
        allExperience,
        allReviews,
        allSeverityLevels,
        allSkinTypes,
        allTreatments
    ] = await Promise.all([
        clinicModels.getDoctorAvailabilityBulk?.(doctorIds),  // add this if not present
        clinicModels.getDoctorCertificationsBulk(doctorIds),
        clinicModels.getDoctorEducationBulk(doctorIds),
        clinicModels.getDoctorExperienceBulk(doctorIds),
        clinicModels.getDoctorReviewsBulk?.(doctorIds),       // optional - implement if needed
        clinicModels.getDoctorSeverityLevelsBulk?.(doctorIds),// optional - implement if needed
        clinicModels.getDoctorSkinTypesBulk(doctorIds),
        clinicModels.getDoctorTreatmentsBulk(doctorIds)
    ]);

    const enrichedDoctors = await Promise.all(doctors.map(async (doctor) => {
        const chat = await getChatBetweenUsers(user_id, doctor.zynq_user_id);

        const certifications = allCertificates[doctor.doctor_id] || [];
        certifications.forEach(cert => {
            if (cert.upload_path && !cert.upload_path.startsWith('http')) {
                cert.upload_path = `${APP_URL}doctors/certifications/${cert.upload_path}`;
            }
        });

        if (doctor.profile_image && !doctor.profile_image.startsWith('http')) {
            doctor.profile_image = `${APP_URL}doctor/profile_images/${doctor.profile_image}`;
        }

        return {
            ...doctor,
            chatId: chat?.[0]?.id || null,
            availability: allAvailability?.[doctor.doctor_id] || [],
            certifications,
            education: allEducation[doctor.doctor_id] || [],
            experience: allExperience[doctor.doctor_id] || [],
            reviews: allReviews?.[doctor.doctor_id] || [],
            severity_levels: allSeverityLevels?.[doctor.doctor_id] || [],
            skin_types: allSkinTypes[doctor.doctor_id] || [],
            treatments: allTreatments[doctor.doctor_id] || []
        };
    }));


    return handleSuccess(res, 200, 'en', "DOCTORS_FETCHED_SUCCESSFULLY", enrichedDoctors);
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
