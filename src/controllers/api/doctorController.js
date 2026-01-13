import Joi from "joi";

import dotenv from "dotenv";
dotenv.config();
import * as userModels from "../../models/api.js";
import * as clinicModels from "../../models/clinic.js";
import * as doctorModels from "../../models/doctor.js";
import * as apiModels from "../../models/api.js";
import { asyncHandler, handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import { sendEmail } from "../../services/send_email.js";
import { formatImagePath, generateAccessToken, generatePassword, generateVerificationLink } from "../../utils/user_helper.js";
import { fileURLToPath } from 'url';
import { fetchChatById, getChatBetweenUsers } from "../../models/chat.js";
import { formatBenefitsUnified, getTreatmentIDsByUserID } from "../../utils/misc.util.js";
import { openai } from "../../../app.js";
import { translator } from "../../utils/misc.util.js";


/**
 * Detects gibberish / random / keyboard-smash text
 * Returns true if text looks like nonsense.
 */
export function isGibberishText(text = "") {
    if (!text) return true;

    const clean = text.trim().toLowerCase();
    if (!clean) return true;

    // Relaxed whitelist
    const whitelist = [
        "wallstrom", "wallström", "clinic", "laser", "botox", "fillers", "wrinkles",
        "hollywood", "pigmentation", "acne", "asclepius", "quadrostar", "fotona",
        "lumenis", "cutera", "alma", "hydrafacial", "restylane", "juvederm", "belotero",
        "thermage", "ultherapy", "emsculpt", "morpheus", "dermalux", "ipl"
    ];

    if (whitelist.some(w => clean.includes(w))) return false;

    // Allow short searches always
    if (clean.length <= 3) return false;

    // Allow Swedish/European letters
    const lettersOnly = clean.replace(/[^a-z\u00C0-\u017F\s]/gi, "");

    // Allow if it has at least 1 vowel (Swedish also ok)
    const vowels = "aeiouyåäöéèáàüö";
    const vowelCount = (lettersOnly.match(new RegExp(`[${vowels}]`, "gi")) || []).length;

    if (vowelCount >= 1) return false;

    // If no vowels AND contains weird characters — likely gibberish
    if (vowelCount === 0 && /[^a-z\u00C0-\u017F\s]/i.test(clean)) {
        return true;
    }

    // Reject if mostly symbols
    const symbolCount = (clean.match(/[^a-z\u00C0-\u017F\d\s]/gi) || []).length;
    if (symbolCount > clean.length * 0.4) return true;

    // Reject obvious keyboard smash (but very relaxed)
    if (/^[zxqwv]{5,}$/i.test(lettersOnly)) return true;

    // Otherwise treat as valid
    return false;
}



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
        min_rating = null,
        search = ''
    } = filters;

    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const doctors = await userModels.getAllDoctors({
        search,
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
        return handleSuccess(res, 200, 'en', "DOCTORS_FETCHED_SUCCESSFULLY", []);
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
    let { user_id, latitude: userLatitude, longitude: userLongitude, language = 'en' } = req.user;

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
        distance = {},
        price = {},
        search = '',
        min_rating = null
    } = filters;

    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    if (concern_ids.length > 0) {
        const treatment_ids_from_concern = await userModels.getTreatmentIdsByConcernIds(concern_ids);
        if (Array.isArray(treatment_ids_from_concern) && treatment_ids_from_concern.length > 0) {
            treatment_ids = [...new Set([...treatment_ids, ...treatment_ids_from_concern])];
        }
    }

    const areAllFiltersEmpty =
        treatment_ids.length === 0 &&
        skin_condition_ids.length === 0 &&
        aesthetic_device_ids.length === 0 &&
        skin_type_ids.length === 0 &&
        surgery_ids.length === 0 &&
        search.length === 0 &&
        Object.keys(distance).length === 0 &&
        Object.keys(price).length === 0 &&
        !min_rating;

    if (areAllFiltersEmpty) {
        const fallbackTreatmentIds = await getTreatmentIDsByUserID(user_id);
        treatment_ids = fallbackTreatmentIds || [];
    }
    // userLatitude = 22.72481320
    // userLongitude = 75.88707720

    let effectiveSort = { ...sort };
    const sortRequiresLocation = effectiveSort.by === 'nearest';
    const hasLocation = userLatitude != null && userLongitude != null;

    if (sortRequiresLocation && !hasLocation) {
        console.warn("User requested 'nearest' sort but location unavailable, defaulting sort.");
        effectiveSort = { by: 'default', order: 'desc' };
    }

    const queryFilters = {
        treatment_ids,
        skin_condition_ids,
        aesthetic_device_ids,
        skin_type_ids,
        surgery_ids,
        distance,
        price,
        search,
        min_rating,
        sort: effectiveSort,
        userLatitude,
        userLongitude,
        limit,
        offset
    };

    const doctors = await userModels.getAllRecommendedDoctors(queryFilters);

    if (!doctors?.length) {
        return handleSuccess(res, 200, language, "DOCTORS_FETCHED_SUCCESSFULLY", []);
    }
    const doctorIds = doctors.map(doc => doc.doctor_id);

    const [
        allSkinTypes,
    ] = await Promise.all([
        clinicModels.getDoctorSkinTypesBulk(doctorIds),

    ]);

    const skinTypeMap = toMap(allSkinTypes);

    const enrichedDoctors = doctors.map((doctor) => ({
        ...doctor,
        skin_types: (skinTypeMap.get(doctor.doctor_id) || []).map(st => st?.name || null),
        profile_image: formatImagePath(doctor.profile_image, 'doctor/profile_images')

    }));

    return handleSuccess(res, 200, language, "DOCTORS_FETCHED_SUCCESSFULLY", enrichedDoctors);
});


// export const getSingleDoctor = asyncHandler(async (req, res) => {
//     const { doctor_id, clinic_id, treatment_search } = req.body;
//     const { user_id, language = 'en' } = req.user;
// console.log('doctor_id=>',doctor_id)
//     const doctorResult = await doctorModels.getDoctorByDoctorID(doctor_id, clinic_id);
//     let doctor = doctorResult?.[0];

//     if (!doctor) {
//         return handleSuccess(res, 200, 'en', "DOCTOR_NOT_FOUND", null);
//     }

//     const [
//         allCertificates,
//         allEducation,
//         allExperience,
//         allSkinTypes,
//         allTreatments,
//         allSkinCondition,
//         allSurgery,
//         // allAstheticDevices,
//         allDevices,
//         allRatings
//     ] = await Promise.all([
//         clinicModels.getDoctorCertificationsBulkV2([doctor_id], language),
//         clinicModels.getDoctorEducationBulk([doctor_id]),
//         clinicModels.getDoctorExperienceBulk([doctor_id]),
//         clinicModels.getDoctorSkinTypesBulkV2([doctor_id], language),
//         clinicModels.getDoctorTreatmentsBulkV3(doctor_id, language, treatment_search),
//         clinicModels.getDoctorSkinConditionBulkV2([doctor_id], language),
//         clinicModels.getDoctorSurgeryBulkV2([doctor_id], language),
//         // clinicModels.getDoctorAstheticDevicesBulk([doctor_id]),
//         clinicModels.getDoctorDevicesBulk(doctor.zynq_user_id),
//         clinicModels.getDoctorRatings([doctor_id])
//     ]);

//     const chat = await getChatBetweenUsers(user_id, doctor.zynq_user_id);
//     const images = await clinicModels.getClinicImages(doctor.clinic_id);
//     doctor.images = images
//         .filter(img => img?.image_url)
//         .map(img => ({
//             clinic_image_id: img.clinic_image_id,
//             url: formatImagePath(img.image_url, 'clinic/files'),
//         }));

//     const treatments = allTreatments[doctor_id] || [];
//     // await Promise.all(
//     //     treatments.map(async (t) => {
//     //         t.sub_treatments = await apiModels.getSubTreatmentsByTreatmentId(
//     //             t.treatment_id,
//     //             language
//     //         );
//     //     })
//     // );

//     // for (const t of treatments) {
//     //     t.sub_treatments = await apiModels.getSubTreatmentsByTreatmentId(
//     //         t.treatment_id,
//     //         language
//     //     );
//     // }

//     const processedDoctor = {
//         ...doctor,
//         chatId: chat?.[0]?.id || null,
//         ratings: allRatings || [],
//         treatments: formatBenefitsUnified(treatments, 'en') || [],
//         skin_types: allSkinTypes[doctor_id] || [],
//         allSkinCondition: allSkinCondition[doctor_id] || [],
//         allSurgery: allSurgery[doctor_id] || [],
//         // allAstheticDevices: allAstheticDevices[doctor_id] || [],
//         allDevices: allDevices || [],
//         allEducation: allEducation[doctor_id] || [],
//         allExperience: allExperience[doctor_id] || [],
//         allCertificates: (allCertificates[doctor_id] || []).map(cert => ({
//             ...cert,
//             upload_path: cert.upload_path
//                 ? (cert.upload_path.startsWith('http')
//                     ? cert.upload_path
//                     : `${APP_URL}doctor/certifications/${cert.upload_path}`)
//                 : null
//         })),
//         doctor_logo: doctor.profile_image
//             ? (doctor.profile_image.startsWith('http')
//                 ? doctor.profile_image
//                 : `${APP_URL}doctor/profile_images/${doctor.profile_image}`)
//             : null
//         ,
//         clinic_logo: doctor.clinic_logo && !doctor.clinic_logo.startsWith("http")
//             ? `${APP_URL}clinic/logo/${doctor.clinic_logo}`
//             : doctor.clinic_logo
//     };

//     return handleSuccess(res, 200, 'en', "DOCTOR_FETCHED_SUCCESSFULLY", processedDoctor);
// });

const calculateTotalExperienceYears = (experiences = []) => {
    let totalMonths = 0;

    experiences.forEach(exp => {
        if (!exp.start_date) return;

        const start = new Date(exp.start_date);
        const end = exp.end_date ? new Date(exp.end_date) : new Date();

        let months =
            (end.getFullYear() - start.getFullYear()) * 12 +
            (end.getMonth() - start.getMonth());

        // If end day is before start day, subtract 1 month
        if (end.getDate() < start.getDate()) {
            months -= 1;
        }

        if (months > 0) {
            totalMonths += months;
        }
    });

    const years = totalMonths / 12;

    // round to 1 decimal (4.5, 9.5 etc.)
    const roundedYears = Math.round(years * 10) / 10;

    return roundedYears;
};


export const getSingleDoctor = asyncHandler(async (req, res) => {
    const { doctor_id, clinic_id, treatment_search } = req.body;
    const { user_id, language = 'en' } = req.user;

    const doctorResult = await doctorModels.getDoctorByDoctorID(doctor_id, clinic_id);

    const doctorInfo = await doctorModels.getDoctorInfo(doctor_id, clinic_id);
    let doctor = doctorResult?.[0];

    if (!doctor) {
        return handleSuccess(res, 200, 'en', "DOCTOR_NOT_FOUND", null);
    };

    doctor.fee_per_session = doctorInfo?.fee_per_session || null;

    const [
        allCertificates,
        allEducation,
        allExperience,
        allSkinTypes,
        allTreatments,
        allSkinCondition,
        allSurgery,
        allDevices,
        allRatings
    ] = await Promise.all([
        clinicModels.getDoctorCertificationsBulkV2([doctor_id], language),
        clinicModels.getDoctorEducationBulk([doctor_id]),
        clinicModels.getDoctorExperienceBulk([doctor_id]),
        clinicModels.getDoctorSkinTypesBulkV2([doctor_id], language,clinic_id),

        // FIXED: this now returns array directly
        clinicModels.getDoctorTreatmentsBulkV3(doctor_id, clinic_id, language, treatment_search),

        clinicModels.getDoctorSkinConditionBulkV2([doctor_id], language),
        clinicModels.getDoctorSurgeryBulkV2([doctor_id], language,clinic_id),

        // FIXED: Devices always using zynq_user_id
        clinicModels.getDoctorDevicesBulk(doctor.zynq_user_id, clinic_id),
        clinicModels.getDoctorRatings([doctor_id])
    ]);

    const chat = await getChatBetweenUsers(user_id, doctor.zynq_user_id);
    const images = await clinicModels.getClinicImages(doctor.clinic_id);
    doctor.images = images
        .filter(img => img?.image_url)
        .map(img => ({
            clinic_image_id: img.clinic_image_id,
            url: formatImagePath(img.image_url, 'clinic/files'),
        }));
    // 🔥 FIXED: allTreatments is now array, not object
    const treatments = allTreatments || [];

    const processedDoctor = {
        ...doctor,
        chatId: chat?.[0]?.id || null,
        ratings: allRatings || [],
        treatments: formatBenefitsUnified(treatments, 'en') || [],
        skin_types: allSkinTypes[doctor_id] || [],
        allSkinCondition: allSkinCondition[doctor_id] || [],
        allSurgery: allSurgery[doctor_id] || [],
        allDevices: allDevices || [],
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
            : null,
        clinic_logo: doctor.clinic_logo && !doctor.clinic_logo.startsWith("http")
            ? `${APP_URL}clinic/logo/${doctor.clinic_logo}`
            : doctor.clinic_logo
    };

    const experienceList = allExperience[doctor_id] || [];
    const totalExperienceYears = calculateTotalExperienceYears(experienceList);
    processedDoctor.experience_years = totalExperienceYears;

    return handleSuccess(res, 200, 'en', "DOCTOR_FETCHED_SUCCESSFULLY", processedDoctor);
});

export const getSingleDoctorRatings = asyncHandler(async (req, res) => {
    const { doctor_id } = req.params;
    const lang = req?.user?.language || "en";

    const allRatings = await clinicModels.getDoctorRatings(doctor_id)

    return handleSuccess(res, 200, lang, "DOCTOR_RATINGS_FETCHED_SUCCESSFULLY", allRatings);
});


export const search_home_entities = asyncHandler(async (req, res) => {
    const { language = 'en' } = req.user || {};

    let { filters = {}, page, limit } = req.body || {};

    const search = filters.search?.trim() || "";

    if (!search) {
        return handleError(res, 400, language, "EMPTY_SEARCH_QUERY");
    }

    try {
        var normalized_search;
        if (search.length <= 3) {
            console.log("Short query, returning default valid_medical");
            normalized_search = search
        } else {
            console.log("Long query, translating to english");
            normalized_search = await translator(search, 'en');
        }
        // 🧠 Detect if the translated text is gibberish
        const gibberish = isGibberishText(normalized_search);

        if (gibberish) {
            return handleError(res, 200, language, "Invalid Search", []);
        }

        // 1️⃣ Detect search intent ranking
        const intentRanking = await detectSearchIntent(normalized_search);
        if (intentRanking.type === "gibberish") {
            return handleSuccess(res, 200, "en", "No Data Found", []);
        }
        console.log("Search Intent Ranking:", intentRanking);

        // 2️⃣ Run all searches (as you already do)
        const [doctors, clinics, devices, treatments] = await Promise.all([

            userModels.getDoctorsByFirstNameSearchOnly({ search: normalized_search, page, limit }),
            userModels.getClinicsByNameSearchOnly({ search: normalized_search, page, limit }),
            userModels.getDevicesByNameSearchOnly({ search: normalized_search, page, limit }),
            // userModels.getProductsByNameSearchOnly({ search: normalized_search, page, limit }),
            userModels.getTreatmentsBySearchOnly({ search: normalized_search, language, page, limit, actualSearch: search })
        ]);


        // 3️⃣ Enrich images (same as your code)
        const enrichedDoctors = doctors.map(doctor => ({
            ...doctor,
            profile_image: formatImagePath(doctor.profile_image, 'doctor/profile_images')
        }));

        const enrichedClinics = clinics.map(clinic => ({
            ...clinic,
            clinic_logo: formatImagePath(clinic.clinic_logo, 'clinic/logo')
        }));

        let enrichedProducts = [];
        // if (products?.length) {
        //     const productIds = products.map(p => p.product_id);
        //     const imageRows = await userModels.get_product_images_by_product_ids(productIds);

        //     const imagesMap = {};
        //     for (const row of imageRows) {
        //         if (!imagesMap[row.product_id]) imagesMap[row.product_id] = [];
        //         imagesMap[row.product_id].push(
        //             row.image.startsWith('http')
        //                 ? row.image
        //                 : `${APP_URL}clinic/product_image/${row.image}`
        //         );
        //     }

        //     enrichedProducts = products.map(product => ({
        //         ...product,
        //         product_images: imagesMap[product.product_id] || [],
        //         image: formatImagePath(product.image, 'clinic/product_image')
        //     }));
        // }

        // 4️⃣ Reorder results based on AI ranking
        const rankedResults = {};
        for (const entity of intentRanking.ranking) {
            const key = entity.toLowerCase();
            if (key === "doctor") rankedResults.doctors = enrichedDoctors;
            if (key === "clinic") rankedResults.clinics = enrichedClinics;
            if (key === "devices") rankedResults.devices = devices;
            // if (key === "product") rankedResults.products = enrichedProducts;
            if (key === "treatment") rankedResults.treatments = treatments;
        }

        // 5️⃣ Return ranked response
        return handleSuccess(res, 200, language, 'SEARCH_RESULTS_FETCHED', rankedResults);

    } catch (error) {
        console.error("Search Home Error:", error);
        return handleError(res, 500, language, "INTERNAL_SERVER_ERROR");
    }
});

async function detectSearchIntent(searchQuery) {
    console.log("🔍 Raw search query:", searchQuery);

    const trimmed = (searchQuery || "").trim().toLowerCase();

    // ✅ Special handling for "dr" or similar inputs
    if (["dr", "dr.", "doctor", "daktar"].includes(trimmed)) {
        console.log("⚙️ Detected doctor keyword — prioritizing Doctor ranking");
        return {
            type: "valid_medical",
            ranking: ["Doctor", "Clinic", "Treatment", "Sub Treatment", "Devices",]
        };
    }

    // ✅ Special handling for queries implying expert → prioritize doctors
    if (["expert", "skin expert", "hair expert", "face expert", "derma expert"].includes(trimmed)) {
        console.log("⚙️ Detected expert keyword — prioritizing Doctor ranking");
        return {
            type: "valid_medical",
            ranking: ["Doctor", "Clinic", "Treatment", "Sub Treatment", "Devices"]
        };
    }


    // 🛑 Short queries fallback
    if (trimmed.length <= 3) {
        console.log("⚙️ Skipping AI — short query, returning default valid_medical");
        return {
            type: "valid_medical",
            ranking: ["Treatment", "Sub Treatment", "Doctor", "Clinic", "Devices"]
        };
    }

    const prompt = `
    You are an intelligent and context-aware AI assistant that classifies user search queries for a medical platform.
    
    Your goal is to analyze the query and always output a pure JSON object with exactly these two fields:
    {
      "type": "valid_medical" | "non_medical",
      "ranking": ["Doctor","Clinic","Treatment","Sub Treatment","Devices"] (in the most contextually correct order)
    }
    
    ---
    
    ### RULES & LOGIC
    
    #### 1️⃣ General behavior
    - Always return a valid JSON object — no markdown or explanations.
    - Case-insensitive and tolerant of spelling errors (“wrinckle”, “daktar”, etc.).
    - Use fuzzy understanding to infer intent.
    - Always keep **"Treatment"** next to **"Sub Treatment"**.
    - Always keep **"Devices"** in the last position.
    
    ---
    
    #### 2️⃣ Type classification
    
    **"valid_medical"** → related to doctors, clinics, treatments, symptoms, or medical devices.
    
    Includes:
    - **Doctor names/prefixes**: “dr”, “doctor”, “daktar”, etc.
    - **Clinic/hospital names**: “Apollo”, “Smile Dental”, “Skin Clinic”, etc.
    - **Treatments or conditions**: “wrinkle”, “acne”, “botox”, “laser”, “IPL”, “filler”, “HIFU”, etc.
    - **Devices**: “RF device”, “IPL machine”, “laser machine”, etc.
    
    **"non_medical"** → unrelated meaningful text (e.g., “football”, “laptop”)
    
    ---
    
    #### 3️⃣ Ranking logic (priority order)
    
    | Query Type | Ranking |
    |-------------|----------|
    | Mentions “dr”, “doctor”, “daktar” | ["Doctor","Clinic","Treatment","Sub Treatment","Devices"] |
    | Mentions clinic/hospital name | ["Clinic","Doctor","Treatment","Sub Treatment","Devices"] |
    | Refers to **treatment, symptom, condition, or therapy** (e.g., “laser”, “botox”, “IPL”, “peel”, “scar removal”, “acne”) | ["Treatment", "Sub Treatment","Doctor","Clinic","Devices",] |
    | General health or beauty-related phrases (e.g., “skin glow”, “rejuvenation”) | ["Treatment","Sub Treatment","Doctor","Clinic","Devices"] |
    | Refers to **sub treatment, symptom, condition, or therapy** (e.g., “laser”, “botox”, “IPL”, “peel”, “scar removal”, “acne”) | ["Sub Treatment","Treatment","Doctor","Clinic","Devices"] |
    | Unclear but still medical | ["Treatment","Sub Treatment","Doctor","Clinic","Devices"] |
    
    ---
    
    #### 4️⃣ Consistency rule
    Always keep "Treatment" and "Devices" **adjacent** in ranking.
    
    ---
    
    #### 5️⃣ Multilingual & transliteration tolerance
    Understand words like “aspataal”, “ilaaj”, “davakhana”, “klinikk”, “daktar”, etc.
    
    ---
    
    #### 6️⃣ Output format
    - Output **only JSON**
    - Keys lowercase
    - Always valid JSON
    
    ---
    
    ### ✅ Examples
    
    Input: "dr harshit"  
    → {"type":"valid_medical","ranking":["Doctor","Clinic","Treatment","Sub Treatment","Devices"]}
    
    Input: "apollo clinic"  
    → {"type":"valid_medical","ranking":["Clinic","Doctor","Treatment","Sub Treatment","Devices"]}
    
    Input: "wrinkle"  
    → {"type":"valid_medical","ranking":["Treatment","Sub Treatment","Doctor","Clinic","Devices"]}  
    
    Input: "laser"  
    → {"type":"valid_medical","ranking":["Treatment","Sub Treatment","Doctor","Clinic","Devices"]}
    
    Input: "IPL machine"  
    → {"type":"valid_medical","ranking":["Treatment","Sub Treatment","Doctor","Clinic","Devices"]}
    
    Input: "skin rejuvenation"  
    → {"type":"valid_medical","ranking":["Treatment","Sub Treatment","Doctor","Clinic","Devices"]}
    
    Input: "hello world"  
    → {"type":"non_medical","ranking":["Treatment","Sub Treatment","Doctor","Clinic","Devices"]}
    
    ---
    
    Now classify the following query and return only the JSON:
    "${trimmed}"
    `;


    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
    });

    let content = response.choices[0].message.content.trim();
    console.log("🧠 Raw AI output:", content);

    content = content
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .replace(/[\n\r]/g, "")
        .replace(/“|”/g, '"')
        .trim();

    try {
        const parsed = JSON.parse(content);


        if (
            parsed &&
            typeof parsed === "object" &&
            Array.isArray(parsed.ranking) &&
            parsed.ranking.length === 5
        ) {
            parsed.ranking = parsed.ranking.map(
                (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
            );
            return parsed;
        }

        console.warn("⚠️ Unexpected JSON structure, using fallback");
        return { type: "valid_medical", ranking: ["Treatment", "Sub Treatment", "Doctor", "Clinic", "Devices"] };
    } catch (e) {
        console.error("❌ JSON parse error:", e.message, "\nRaw content:", content);
        return { type: "valid_medical", ranking: ["Treatment", "Sub Treatment", "Doctor", "Clinic", "Devices"] };
    }
}


export const detectSearchIntentController = asyncHandler(async (req, res) => {
    const { language = 'en' } = req.user || {};

    let { filters = {}, page, limit } = req.body || {};

    const search = filters.search?.trim() || "";

    if (!search) {
        return handleError(res, 400, language, "EMPTY_SEARCH_QUERY");
    }

    try {
        var normalized_search;
        if (search.length <= 3) {
            // console.log("Short query, returning default valid_medical");
            normalized_search = search
        } else {
            // console.log("Long query, translating to english");
            normalized_search = await translator(search, 'en');
        }
        // 🧠 Detect if the translated text is gibberish
        const gibberish = isGibberishText(normalized_search);

        if (gibberish) {
            return handleError(res, 200, language, "Invalid Search", []);
        }

        // 1️⃣ Detect search intent ranking
        const intentRanking = await detectSearchIntent(normalized_search);
        if (intentRanking.type === "gibberish") {
            return handleSuccess(res, 200, "en", "No Data Found", []);
        }


        // 5️⃣ Return ranked response
        return handleSuccess(res, 200, language, 'SEARCH_RESULTS_FETCHED', intentRanking);

    } catch (error) {
        console.error("Search Home Error:", error);
        return handleError(res, 500, language, "INTERNAL_SERVER_ERROR");
    }
});

export const getDoctorsByFirstNameSearchOnlyController = asyncHandler(async (req, res) => {
    const { language = 'en' } = req.user || {};

    let { filters = {}, page, limit } = req.body || {};

    const search = filters.search?.trim() || "";

    if (!search) {
        return handleError(res, 400, language, "EMPTY_SEARCH_QUERY");
    }

    try {
        var normalized_search;
        if (search.length <= 3) {
            console.log("Short query, returning default valid_medical");
            normalized_search = search
        } else {
            console.log("Long query, translating to english");
            normalized_search = await translator(search, 'en');
        }
        // 🧠 Detect if the translated text is gibberish
        const gibberish = isGibberishText(normalized_search);

        if (gibberish) {
            return handleError(res, 200, language, "Invalid Search", []);
        }


        // 2️⃣ Run all searches (as you already do)
        const [doctors] = await Promise.all([

            userModels.getDoctorsByFirstNameSearchOnly({ search: normalized_search, page, limit }),
        ]);


        // 3️⃣ Enrich images (same as your code)
        const enrichedDoctors = doctors.map(({ embeddings, ...doctor }) => ({
            ...doctor,
            profile_image: formatImagePath(doctor.profile_image, 'doctor/profile_images')
        }));


        // 5️⃣ Return ranked response
        return handleSuccess(res, 200, language, 'SEARCH_RESULTS_FETCHED', enrichedDoctors);

    } catch (error) {
        console.error("Search Home Error:", error);
        return handleError(res, 500, language, "INTERNAL_SERVER_ERROR");
    }
});

export const getClinicsByNameSearchOnlyController = asyncHandler(async (req, res) => {
    const { language = 'en' } = req.user || {};

    let { filters = {}, page, limit } = req.body || {};

    const search = filters.search?.trim() || "";

    if (!search) {
        return handleError(res, 400, language, "EMPTY_SEARCH_QUERY");
    }

    try {
        var normalized_search;
        if (search.length <= 3) {
            console.log("Short query, returning default valid_medical");
            normalized_search = search
        } else {
            console.log("Long query, translating to english");
            normalized_search = await translator(search, 'en');
        }
        // 🧠 Detect if the translated text is gibberish
        const gibberish = isGibberishText(normalized_search);

        if (gibberish) {
            return handleError(res, 200, language, "Invalid Search", []);
        }


        // 2️⃣ Run all searches (as you already do)
        const [clinics] = await Promise.all([

            userModels.getClinicsByNameSearchOnly({ search: normalized_search, page, limit })
        ]);


        // 3️⃣ Enrich images (same as your code)
        const enrichedClinics = clinics.map(clinic => ({
            ...clinic,
            clinic_logo: formatImagePath(clinic.clinic_logo, 'clinic/logo')
        }));


        // 5️⃣ Return ranked response
        return handleSuccess(res, 200, language, 'SEARCH_RESULTS_FETCHED', enrichedClinics);

    } catch (error) {
        console.error("Search Home Error:", error);
        return handleError(res, 500, language, "INTERNAL_SERVER_ERROR");
    }
});


export const getDevicesByNameSearchOnlyController = asyncHandler(async (req, res) => {
    const { language = 'en' } = req.user || {};

    let { filters = {}, page, limit } = req.body || {};

    const search = filters.search?.trim() || "";

    if (!search) {
        return handleError(res, 400, language, "EMPTY_SEARCH_QUERY");
    }

    try {
        var normalized_search;
        if (search.length <= 3) {
            console.log("Short query, returning default valid_medical");
            normalized_search = search
        } else {
            console.log("Long query, translating to english");
            normalized_search = await translator(search, 'en');
        }
        // 🧠 Detect if the translated text is gibberish
        const gibberish = isGibberishText(normalized_search);

        if (gibberish) {
            return handleError(res, 200, language, "Invalid Search", []);
        }


        // 2️⃣ Run all searches (as you already do)
        const [devices] = await Promise.all([

            userModels.getDevicesByNameSearchOnly({ search: normalized_search, page, limit }),
        ]);



        // 5️⃣ Return ranked response
        return handleSuccess(res, 200, language, 'SEARCH_RESULTS_FETCHED', devices);

    } catch (error) {
        console.error("Search Home Error:", error);
        return handleError(res, 500, language, "INTERNAL_SERVER_ERROR");
    }
});

export const gettreatmentsBySearchOnlyController = asyncHandler(async (req, res) => {
    const { language = 'en' } = req.user || {};

    let { filters = {}, page, limit } = req.body || {};

    const search = filters.search?.trim() || "";

    if (!search) {
        return handleError(res, 400, language, "EMPTY_SEARCH_QUERY");
    }

    try {
        var normalized_search;
        if (search.length <= 3) {
            console.log("Short query, returning default valid_medical");
            normalized_search = search
        } else {
            console.log("Long query, translating to english");
            normalized_search = await translator(search, 'en');
        }
        // 🧠 Detect if the translated text is gibberish
        const gibberish = isGibberishText(normalized_search);

        if (gibberish) {
            return handleError(res, 200, language, "Invalid Search", []);
        }


        // 2️⃣ Run all searches (as you already do)
        const [treatments] = await Promise.all([

            userModels.getTreatmentsBySearchOnly({ search: normalized_search, language, page, limit, actualSearch: search })
        ]);



        // 5️⃣ Return ranked response
        return handleSuccess(res, 200, language, 'SEARCH_RESULTS_FETCHED', treatments);

    } catch (error) {
        console.error("Search Home Error:", error);
        return handleError(res, 500, language, "INTERNAL_SERVER_ERROR");
    }
});

export const getSubtreatmentsBySearchOnlyController = asyncHandler(async (req, res) => {
    const { language = 'en' } = req.user || {};

    let { filters = {}, page, limit } = req.body || {};

    const search = filters.search?.trim() || "";

    if (!search) {
        return handleError(res, 400, language, "EMPTY_SEARCH_QUERY");
    }

    try {
        var normalized_search;
        if (search.length <= 3) {
            console.log("Short query, returning default valid_medical");
            normalized_search = search
        } else {
            console.log("Long query, translating to english");
            normalized_search = await translator(search, 'en');
        }
        // 🧠 Detect if the translated text is gibberish
        const gibberish = isGibberishText(normalized_search);

        if (gibberish) {
            return handleError(res, 200, language, "Invalid Search", []);
        }


        // 2️⃣ Run all searches (as you already do)
        const [subtreatments] = await Promise.all([

            userModels.getSubTreatmentsBySearchOnly({ search: normalized_search, language, page, limit, actualSearch: search })
        ]);



        // 5️⃣ Return ranked response
        return handleSuccess(res, 200, language, 'SEARCH_RESULTS_FETCHED', subtreatments);

    } catch (error) {
        console.error("Search Home Error:", error);
        return handleError(res, 500, language, "INTERNAL_SERVER_ERROR");
    }
});