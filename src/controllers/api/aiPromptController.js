import Joi from "joi";
import ejs from 'ejs';
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import * as apiModels from "../../models/api.js";
import { generateAccessToken } from "../../utils/user_helper.js";
import { handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";

dotenv.config();

const APP_URL = process.env.APP_URL;
const image_logo = process.env.LOGO_URL;


export const add_and_update_prompt = async (req, res) => {
    try {
        const schema = Joi.object({
            prompt_type: Joi.string().required(),
            prompt: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { prompt_type, prompt } = value;

        let [prompt_data] = await apiModels.get_prompt_data(prompt_type);

        if (!prompt_data) {
            await apiModels.create_prompt(value)
        } else {
            await apiModels.update_prompt(value, prompt_type)
        }

        return handleSuccess(res, 200, 'en', "PROMPT_DATA_UPDATE");
    } catch (error) {
        console.error("internal E", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const get_prompt_data_by_prompt_type = async (req, res) => {
    try {
        const schema = Joi.object({
            prompt_type: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { prompt_type } = value;

        let [prompt_data] = await apiModels.get_prompt_data(prompt_type);

        if (!prompt_data) {
            return handleError(res , 404, "en", "PROMPT_NOT_FOUND")
        } 

        return handleSuccess(res, 200, 'en', "PROMPT_DATA_GET", prompt_data);
    } catch (error) {
        console.error("internal E", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};