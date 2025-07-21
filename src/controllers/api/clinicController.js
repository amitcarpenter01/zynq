import dotenv from "dotenv";
import * as clinicModels from "../../models/clinic.js";
import * as apiModels from "../../models/api.js";
import { asyncHandler, handleError, handleSuccess } from "../../utils/responseHandler.js";

dotenv.config();

const APP_URL = process.env.APP_URL;

export const get_all_clinics = asyncHandler(async (req, res) => {
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
        min_rating,
        sort: effectiveSort,
        userLatitude,
        userLongitude,
        limit,
        offset
    }

    console.log("quer",queryFilters)
 
    const clinics = await apiModels.getAllClinicsForUser(queryFilters);
 
    if (!clinics || clinics.length === 0) {
        return handleSuccess(res, 200, language || 'en', "CLINICS_FETCHED_SUCCESSFULLY", clinics);;
    }
 
    const clinicIds = clinics.map(c => c.clinic_id);
 
    const [
        allTreatments,
        allOperationHours,
        allSkinTypes,
        allSkinCondition,
        allSurgery,
        allAstheticDevices,
        allLocations
    ] = await Promise.all([
        clinicModels.getClinicTreatmentsBulk(clinicIds),
        clinicModels.getClinicOperationHoursBulk(clinicIds),
        clinicModels.getClinicSkinTypesBulk(clinicIds),
        clinicModels.getClinicSkinConditionBulk(clinicIds),
        clinicModels.getClinicSurgeryBulk(clinicIds),
        clinicModels.getClinicAstheticDevicesBulk(clinicIds),
        clinicModels.getClinicLocationsBulk(clinicIds)
    ]);

    const processedClinics = clinics.map(clinic => ({
        ...clinic,
        location: allLocations[clinic.clinic_id] || null,
        treatments: allTreatments[clinic.clinic_id] || [],
        operation_hours: allOperationHours[clinic.clinic_id] || [],
        skin_types: allSkinTypes[clinic.clinic_id] || [],
        allSkinCondition: allSkinCondition[clinic.clinic_id] || [],
        allSurgery: allSurgery[clinic.clinic_id] || [],
        allAstheticDevices: allAstheticDevices[clinic.clinic_id] || [],
        clinic_logo: clinic.clinic_logo && !clinic.clinic_logo.startsWith("http")
            ? `${APP_URL}clinic/logo/${clinic.clinic_logo}`
            : clinic.clinic_logo
    }));

    return handleSuccess(res, 200, language, "CLINICS_FETCHED_SUCCESSFULLY", processedClinics);
});

export const get_nearby_clinics = asyncHandler(async (req, res) => {
    const {
        filters = {},
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

    let {
        latitude: userLatitude = null,
        longitude: userLongitude = null,
        language = 'en'
    } = req.user;

    userLatitude = 22.72266520
    userLongitude = 75.88740870

    console.log("userLatitude", userLatitude, "userLongitude", userLongitude);

    const clinics = await apiModels.getNearbyClinicsForUser({
        treatment_ids,
        skin_condition_ids,
        aesthetic_device_ids,
        skin_type_ids,
        surgery_ids,
        min_rating,
        userLatitude,
        userLongitude,
        limit,
        offset
    });

    if (!clinics || clinics.length === 0) {
        return handleError(res, 404, language, "NO_CLINICS_FOUND");
    }

    const clinicIds = clinics.map(c => c.clinic_id);

    const [
        allTreatments,
        allOperationHours,
        allSkinTypes,
        allSkinCondition,
        allSurgery,
        allAstheticDevices,
        allLocations
    ] = await Promise.all([
        clinicModels.getClinicTreatmentsBulk(clinicIds),
        clinicModels.getClinicOperationHoursBulk(clinicIds),
        clinicModels.getClinicSkinTypesBulk(clinicIds),
        clinicModels.getClinicSkinConditionBulk(clinicIds),
        clinicModels.getClinicSurgeryBulk(clinicIds),
        clinicModels.getClinicAstheticDevicesBulk(clinicIds),
        clinicModels.getClinicLocationsBulk(clinicIds)
    ]);

    const processedClinics = clinics.map(clinic => ({
        ...clinic,
        location: allLocations[clinic.clinic_id] || null,
        treatments: allTreatments[clinic.clinic_id] || [],
        operation_hours: allOperationHours[clinic.clinic_id] || [],
        skin_types: allSkinTypes[clinic.clinic_id] || [],
        allSkinCondition: allSkinCondition[clinic.clinic_id] || [],
        allSurgery: allSurgery[clinic.clinic_id] || [],
        allAstheticDevices: allAstheticDevices[clinic.clinic_id] || [],
        clinic_logo: clinic.clinic_logo && !clinic.clinic_logo.startsWith("http")
            ? `${APP_URL}clinic/logo/${clinic.clinic_logo}`
            : clinic.clinic_logo
    }));

    return handleSuccess(res, 200, language, "CLINICS_FETCHED_SUCCESSFULLY", processedClinics);
});

