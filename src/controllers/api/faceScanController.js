import Joi from "joi";
import ejs from 'ejs';
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import * as apiModels from "../../models/api.js";
import { sendEmail } from "../../services/send_email.js";
import { generateAccessToken } from "../../utils/user_helper.js";
import { handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";

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

        const new_face_scan_data = {
            user_id: user.user_id,
            skin_type,
            skin_concerns,
            details,
            face,
            pdf,
            scoreInfo,
            aiAnalysisResult
        };

        const id  = await apiModels.add_face_scan_data(new_face_scan_data);
        console.log("id>>>>>>>>>>>>>>>>",id)
        return handleSuccess(res, 200, language, "SCAN_DATA_ADDED",{id : id.insertId});

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