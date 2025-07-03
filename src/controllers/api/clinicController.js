import Joi from "joi";
import ejs from 'ejs';
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken"
import * as clinicModels from "../../models/clinic.js";
import * as apiModels from "../../models/api.js";
import { sendEmail } from "../../services/send_email.js";
import { generateAccessToken, generatePassword, generateVerificationLink } from "../../utils/user_helper.js";
import { handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import { fileURLToPath } from 'url';
import { splitIDs } from "../../utils/user_helper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const APP_URL = process.env.APP_URL;
const image_logo = process.env.LOGO_URL;


export const get_all_clinics = async (req, res) => {
    try {
        const { limit = 100, page = 1 } = req.query;
        const schema = Joi.object({
            treatment_ids: Joi.string().optional().allow(''),
            skin_condition_ids: Joi.string().optional().allow(''),
            aesthetic_device_ids: Joi.string().optional().allow(''),
            skin_type_ids: Joi.string().optional().allow(''),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const treatment_ids = splitIDs(value.treatment_ids);
        const skin_condition_ids = splitIDs(value.skin_condition_ids);
        const aesthetic_device_ids = splitIDs(value.aesthetic_device_ids);
        const skin_type_ids = splitIDs(value.skin_type_ids);

        const language = req.user.language || 'en';

        const offset = (page - 1) * limit;

        console.log("limit", limit, "page", page, "offset", offset);

        const clinics = await apiModels.getAllClinicsForUser({ treatment_ids, skin_condition_ids, aesthetic_device_ids, limit, offset });

        if (!clinics || clinics.length === 0) {
            return handleError(res, 404, language, "NO_CLINICS_FOUND");
        }

        const clinicIds = clinics.map(c => c.clinic_id);

        const allTreatments = await clinicModels.getClinicTreatmentsBulk(clinicIds);

        const allOperationHours = await clinicModels.getClinicOperationHoursBulk(clinicIds);

        const allSkinTypes = await clinicModels.getClinicSkinTypesBulk(clinicIds);

        const allSkinCondition = await clinicModels.getClinicSkinConditionBulk(clinicIds);

        const allSurgery = await clinicModels.getClinicSurgeryBulk(clinicIds);

        const allAstheticDevices = await clinicModels.getClinicAstheticDevicesBulk(clinicIds);

        const allLocations = await clinicModels.getClinicLocationsBulk(clinicIds);

        const processedClinics = clinics.map(clinic => {

            return {
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
            };
        });


        return handleSuccess(res, 200, language, "CLINIC_PROFILE_FETCHED", processedClinics);


    } catch (error) {
        console.error("Error fetching doctors:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};
