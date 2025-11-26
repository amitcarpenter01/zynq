import dotenv from "dotenv";
import * as clinicModels from "../../models/clinic.js";
import * as apiModels from "../../models/api.js";
import { asyncHandler, handleError, handleSuccess } from "../../utils/responseHandler.js";
import { getTreatmentIDsByUserID } from "../../utils/misc.util.js";
import { formatImagePath } from "../../utils/user_helper.js";

dotenv.config();

const APP_URL = process.env.APP_URL;


export const get_all_clinics = asyncHandler(async (req, res) => {
    const {
        filters = {},
        sort = { by: 'nearest', order: 'asc' },
        pagination = { page: 1, limit: 20 }
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

    let {
        latitude: userLatitude = null,
        longitude: userLongitude = null,
        language = 'en'
    } = req?.user || {};

    // userLatitude = 22.72481320
    // userLongitude = 75.88707720

    let effectiveSort = { ...sort };
    if (effectiveSort.by === 'nearest' && (!userLatitude || !userLongitude)) {
        console.warn("User selected 'nearest' but no location found, falling back to default sort.");
        effectiveSort = { by: 'default', order: 'desc' };
    }

    if (concern_ids.length > 0) {
        const treatment_ids_from_concern = await apiModels.getTreatmentIdsByConcernIds(concern_ids);
        if (Array.isArray(treatment_ids_from_concern) && treatment_ids_from_concern.length > 0) {
            treatment_ids = treatment_ids.concat(treatment_ids_from_concern);
        }
    }

    // 👉 If all filters are empty, fallback to user-based treatment IDs
    const areAllFiltersEmpty =
        treatment_ids.length === 0 &&
        skin_condition_ids.length === 0 &&
        aesthetic_device_ids.length === 0 &&
        skin_type_ids.length === 0 &&
        concern_ids.length === 0 &&
        surgery_ids.length === 0 &&
        search.length === 0 &&
        distance.min === null &&
        price.min === null &&
        !min_rating;

    if (areAllFiltersEmpty) {
        const userTreatmentIds = await getTreatmentIDsByUserID(req.user.user_id);
        treatment_ids = userTreatmentIds || [];
    }

    const queryFilters = {
        treatment_ids,
        skin_condition_ids,
        aesthetic_device_ids,
        skin_type_ids,
        surgery_ids,
        search,
        distance,
        price,
        min_rating,
        sort: effectiveSort,
        userLatitude,
        userLongitude,
        limit,
        offset
    }

    const clinics = await apiModels.getAllClinicsForUser(queryFilters);

    if (!clinics || clinics.length === 0) {
        return handleSuccess(res, 200, language || 'en', "CLINICS_FETCHED_SUCCESSFULLY", clinics);
    }

    const clinicIds = clinics.map(c => c.clinic_id);

    const [
        allTreatments,
        //     allOperationHours,
        //     allSkinTypes,
        //     allSkinCondition,
        //     allSurgery,
        //     allAstheticDevices,
        //     allLocations
    ] = await Promise.all([
        clinicModels.getClinicTreatmentsBulk(clinicIds),
        //     clinicModels.getClinicOperationHoursBulk(clinicIds),
        //     clinicModels.getClinicSkinTypesBulk(clinicIds),
        //     clinicModels.getClinicSkinConditionBulk(clinicIds),
        //     clinicModels.getClinicSurgeryBulk(clinicIds),
        //     clinicModels.getClinicAstheticDevicesBulk(clinicIds),
        //     clinicModels.getClinicLocationsBulk(clinicIds)
    ]);

    const processedClinics = clinics.map(clinic => ({
        ...clinic,
        // location: allLocations[clinic.clinic_id] || null,
        treatments: (allTreatments[clinic.clinic_id] || []).map(t => t.name),
        // operation_hours: allOperationHours[clinic.clinic_id] || [],
        // skin_types: allSkinTypes[clinic.clinic_id] || [],
        // allSkinCondition: allSkinCondition[clinic.clinic_id] || [],
        // allSurgery: allSurgery[clinic.clinic_id] || [],
        // allAstheticDevices: allAstheticDevices[clinic.clinic_id] || [],
        clinic_logo: clinic.clinic_logo && !clinic.clinic_logo.startsWith("http")
            ? `${APP_URL}clinic/logo/${clinic.clinic_logo}`
            : clinic.clinic_logo
    }));

    return handleSuccess(res, 200, language || 'en', "CLINICS_FETCHED_SUCCESSFULLY", processedClinics);
});

export const get_nearby_clinics = asyncHandler(async (req, res) => {
    const {
        filters = {},
        sort = { by: 'nearest', order: 'asc' },
        pagination = { page: 1, limit: 20 }
    } = req.body;

    let {
        treatment_ids = [],
        skin_condition_ids = [],
        aesthetic_device_ids = [],
        skin_type_ids = [],
        surgery_ids = [],
        concern_ids = [],
        search = '',
        distance = {},
        price = {},
        min_rating = null
    } = filters;

    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    let {
        latitude: userLatitude = null,
        longitude: userLongitude = null,
        language = 'en',
        user_id
    } = req.user;

    // userLatitude = 22.72481320
    // userLongitude = 75.88707720

    // 🔁 Smart fallback if sorting by nearest but no coordinates
    let effectiveSort = { ...sort };
    if (effectiveSort.by === 'nearest' && (!userLatitude || !userLongitude)) {
        console.warn("User selected 'nearest' but no location found. Falling back to default sort.");
        effectiveSort = { by: 'default', order: 'desc' };
    }

    // 🎯 Map concerns → treatment_ids
    if (concern_ids.length > 0) {
        const concernTreatmentIds = await apiModels.getTreatmentIdsByConcernIds(concern_ids);
        if (Array.isArray(concernTreatmentIds) && concernTreatmentIds.length > 0) {
            treatment_ids = [...treatment_ids, ...concernTreatmentIds];
        }
    }

    // 🧼 Check if all filters are empty
    const areAllFiltersEmpty = (
        treatment_ids.length === 0 &&
        skin_condition_ids.length === 0 &&
        aesthetic_device_ids.length === 0 &&
        skin_type_ids.length === 0 &&
        surgery_ids.length === 0 &&
        concern_ids.length === 0 &&
        search.trim().length === 0 &&
        distance.min == null &&
        price.min == null &&
        !min_rating
    );

    // 🧠 Apply user treatment fallback
    if (areAllFiltersEmpty) {
        const userTreatmentIds = await getTreatmentIDsByUserID(user_id);
        treatment_ids = userTreatmentIds || [];
    }

    const clinics = await apiModels.getNearbyClinicsForUser({
        treatment_ids,
        skin_condition_ids,
        aesthetic_device_ids,
        skin_type_ids,
        surgery_ids,
        search,
        distance,
        price,
        min_rating,
        sort: effectiveSort,
        userLatitude,
        userLongitude,
        limit,
        offset
    });

    if (!clinics || clinics.length === 0) {
        return handleSuccess(res, 200, language, "CLINICS_FETCHED_SUCCESSFULLY", []);
    }

    // ✅ Fetch treatment names for clinic enrichment
    const clinicIds = clinics.map(c => c.clinic_id);
    const allTreatments = await clinicModels.getClinicTreatmentsBulk(clinicIds);

    const processedClinics = clinics.map(clinic => ({
        ...clinic,
        treatments: (allTreatments[clinic.clinic_id] || []).map(t => t.name),
        clinic_logo: clinic.clinic_logo && !clinic.clinic_logo.startsWith("http")
            ? `${APP_URL}clinic/logo/${clinic.clinic_logo}`
            : clinic.clinic_logo
    }));

    return handleSuccess(res, 200, language, "CLINICS_FETCHED_SUCCESSFULLY", processedClinics);
});

export const getSingleClinic = asyncHandler(async (req, res) => {
    const { clinic_id } = req.params;
    const { language = 'en' } = req.user;
    const clinics = await apiModels.getSingleClinicForUser(clinic_id);
    if (!clinics || clinics.length === 0) return handleSuccess(res, 200, language || 'en', "CLINIC_FETCHED_SUCCESSFULLY", clinics);

    const clinicIds = clinics.map(c => c.clinic_id);
    const images = await clinicModels.getClinicImages(clinic_id);

    const [
        allTreatments,
        allOperationHours,
        allSkinTypes,
        allSkinCondition,
        allSurgery,
        // allAstheticDevices,
        allLocations,
        allDoctors
    ] = await Promise.all([
        clinicModels.getClinicTreatmentsBulkV2(clinicIds, language),
        clinicModels.getClinicOperationHoursBulk(clinicIds),
        clinicModels.getClinicSkinTypesBulk(clinicIds),
        clinicModels.getClinicSkinConditionBulk(clinicIds),
        clinicModels.getClinicSurgeryBulk(clinicIds),
        // clinicModels.getClinicAstheticDevicesBulk(clinicIds),
        clinicModels.getClinicLocationsBulk(clinicIds),
        clinicModels.getClinicDoctorsBulk(clinicIds)
    ]);

    await Promise.all(
        clinicIds.map(async (cid) => {
            const treatments = allTreatments[cid] || [];
            await Promise.all(
                treatments.map(async (t) => {
                    t.sub_treatments =
                        await apiModels.getSubTreatmentsByTreatmentId(
                            t.treatment_id,
                            language
                        );
                })
            );
        })
    );

    const processedClinics = clinics.map(clinic => ({
        ...clinic,
        images: images.filter(img => img?.image_url).map(img => ({
            clinic_image_id: img.clinic_image_id,
            url: formatImagePath(img.image_url, 'clinic/files'),
        })),
        location: allLocations[clinic.clinic_id] || null,
        treatments: allTreatments[clinic.clinic_id] || [],
        operation_hours: allOperationHours[clinic.clinic_id] || [],
        skin_types: allSkinTypes[clinic.clinic_id] || [],
        allSkinCondition: allSkinCondition[clinic.clinic_id] || [],
        allSurgery: allSurgery[clinic.clinic_id] || [],
        // allAstheticDevices: allAstheticDevices[clinic.clinic_id] || [],
        allDoctors: allDoctors[clinic.clinic_id] || [],
        clinic_logo: clinic.clinic_logo && !clinic.clinic_logo.startsWith("http")
            ? `${APP_URL}clinic/logo/${clinic.clinic_logo}`
            : clinic.clinic_logo
    }));

    return handleSuccess(res, 200, language || 'en', "CLINICS_FETCHED_SUCCESSFULLY", processedClinics[0]);
});



