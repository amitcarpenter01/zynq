import Joi from "joi";
import ejs from 'ejs';
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';
import * as apiModels from "../../models/api.js";
import { sendEmail } from "../../services/send_email.js";
import { generateAccessToken } from "../../utils/user_helper.js";
import { asyncHandler, handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import { getUserSkinTypes, getUserTreatments } from "../../models/clinic.js";

dotenv.config();

const APP_URL = process.env.APP_URL;
const image_logo = process.env.LOGO_URL;


export const add_face_scan_result = async (req, res) => {
    try {
        const user = req.user;
        const language = user.language || 'en';

        const schema = Joi.object({
            skin_type: Joi.string().optional().allow("", null),
            skin_concerns: Joi.string().optional().allow("", null),
            details: Joi.any().optional().allow("", null),
            scoreInfo: Joi.any().optional().allow("", null),
            aiAnalysisResult: Joi.string().optional().allow("", null),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { skin_type, skin_concerns, details, scoreInfo, aiAnalysisResult } = value;

        // const face = req.file?.location || '';


        let face = null;
        let pdf = null;

        if (req.files) {
            if (req.files["file"]) face = req.files["file"][0].filename;
            if (req.files["pdf"]) pdf = req.files["pdf"][0].filename;
        }
        const face_scan_result_id = uuidv4(); // Generate UUID

        const new_face_scan_data = {
            user_id: user.user_id,
            face_scan_result_id: face_scan_result_id,
            skin_type,
            skin_concerns,
            details,
            face,
            pdf,
            scoreInfo,
            aiAnalysisResult
        };

        const id = await apiModels.add_face_scan_data(new_face_scan_data);
        console.log("id>>>>>>>>>>>>>>>>", id)
        return handleSuccess(res, 200, language, "SCAN_DATA_ADDED", { id: face_scan_result_id });

    } catch (error) {
        console.error("Internal Error:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const get_face_scan_history = async (req, res) => {
    try {
        let scan_hostory = await apiModels.get_face_scan_history(req.user?.user_id);
        if (!scan_hostory) return handleError(res, 404, 'en', "SCAN_HISTORY_NOT_FOUND");
        scan_hostory.forEach(item => {
            if (item.face && !item.face.startsWith("http")) item.face = `${APP_URL}${item.face}`;
            if (item.pdf && !item.pdf.startsWith("http")) item.pdf = `${APP_URL}${item.pdf}`;
        });
        return handleSuccess(res, 200, 'en', "SCAN_HISTORY_DATA", scan_hostory);
    } catch (error) {
        console.error("internal E", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const get_treatments_by_concern_id = async (req, res) => {
    try {
        const schema = Joi.object({
            concern_id: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        let { concern_id } = value;

        const treatments = await apiModels.getTreatmentsByConcernId(concern_id);

        return handleSuccess(res, 200, "en", "APPOINTMENTS_FETCHED", treatments);
    } catch (error) {
        console.error("Error fetching user appointments:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const get_all_concerns = async (req, res) => {
    try {
        const language = req?.user?.language || 'en';
        const concerns = await apiModels.getAllConcerns(language);

        return handleSuccess(res, 200, "en", "CONCERNS_FETCHED", concerns);
    } catch (error) {
        console.error("Error fetching concerns:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const get_treatments_by_concerns = asyncHandler(async (req, res) => {
    const { concern_ids } = req.body;
    const language = req?.user?.language || 'en';
    const treatments = await apiModels.getTreatmentsByConcernIds(concern_ids, language);
    return handleSuccess(res, 200, "en", "TREATMENTS_FETCHED", treatments);
})

export const get_tips_by_concerns = asyncHandler(async (req, res) => {
    const { concern_ids } = req.body;
    const language = req?.user?.language || 'en';
    const tips = await apiModels.getTipsByConcernIds(concern_ids, language);
    return handleSuccess(res, 200, "en", "TIPS_FETCHED", tips);
})

export const getClinicSkinTypes = async (req, res) => {
    try {
        const language = req?.user?.language || 'sv';
        const skinTypes = await getUserSkinTypes(language);
        return handleSuccess(res, 200, language, "SKIN_TYPES_FETCHED_SUCCESSFULLY", skinTypes);
    }
    catch (error) {
        console.error("Error in getClinicSkinTypes:", error);
        return handleError(res, 500, "en", 'INTERNAL_SERVER_ERROR');
    }
};

export const getTreatments = async (req, res) => {
    try {
        const language = req?.user?.language || 'sv';
        const treatments = await getUserTreatments("en");
        return handleSuccess(res, 200, language, "TREATMENTS_FETCHED_SUCCESSFULLY", treatments);
    }
    catch (error) {
        console.error("Error in getTreatments:", error);
        return handleError(res, 500, "en", 'INTERNAL_SERVER_ERROR');
    }
};