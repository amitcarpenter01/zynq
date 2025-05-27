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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const APP_URL = process.env.APP_URL;
const image_logo = process.env.LOGO_URL;


export const get_all_clinics = async (req, res) => {
    try {
        const language = req.user.language || 'en';
        const clinics = await apiModels.getAllClinicsForUser();

            
        if (!clinics || clinics.length === 0) {
            return handleError(res, 404, language, "NO_CLINICS_FOUND");
        }

        const processedClinics = await Promise.all(clinics.map(async (clinic) => {
            const [clinicLocation] = await clinicModels.getClinicLocation(clinic.clinic_id);
            
            const [
                treatments,
                operationHours, 
                equipments,
                skinTypes,
                severityLevels,
                documents
            ] = await Promise.all([
                clinicModels.getClinicTreatments(clinic.clinic_id),
                clinicModels.getClinicOperationHours(clinic.clinic_id),
                clinicModels.getClinicEquipments(clinic.clinic_id),
                clinicModels.getClinicSkinTypes(clinic.clinic_id),
                clinicModels.getClinicSeverityLevels(clinic.clinic_id),
                clinicModels.getClinicDocuments(clinic.clinic_id)
            ]);

            const processedDocuments = documents.map(doc => ({
                ...doc,
                file_url: doc.file_url && !doc.file_url.startsWith("http") 
                    ? `${APP_URL}${doc.file_url}`
                    : doc.file_url
            }));

            return {
                ...clinic,
                location: clinicLocation || null,
                treatments: treatments || [],
                operation_hours: operationHours || [],
                equipments: equipments || [], 
                skin_types: skinTypes || [],
                severity_levels: severityLevels || [],
                documents: processedDocuments || [],
                clinic_logo: clinic.clinic_logo && !clinic.clinic_logo.startsWith("http")
                    ? `${APP_URL}clinic/logo/${clinic.clinic_logo}`
                    : clinic.clinic_logo
            };
        }));

        return handleSuccess(res, 200, language, "CLINIC_PROFILE_FETCHED", processedClinics);
      

    } catch (error) {
        console.error("Error fetching doctors:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};
