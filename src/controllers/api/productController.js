import Joi from "joi";
import ejs from 'ejs';
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken"
import * as apiModels from "../../models/api.js";
import { sendEmail } from "../../services/send_email.js";
import { generateAccessToken, generatePassword, generateVerificationLink, splitIDs } from "../../utils/user_helper.js";
import { handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import { fileURLToPath } from 'url';
import { getTreatmentIDsByUserID } from "../../utils/misc.util.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const APP_URL = process.env.APP_URL;
const image_logo = process.env.LOGO_URL;


 
export const getAllProducts = async (req, res) => {
    try {
        const language = req?.user?.language || 'en';
 
        const {
            filters = {},
            pagination = { page: 1, limit: 20 }
        } = req.body;
 
        const {
            treatment_ids = [],
            concern_ids = []
        } = filters;
 
        const { page, limit } = pagination;
        const offset = (page - 1) * limit;
 
        let finalTreatmentIds = [...treatment_ids];
 
        if (concern_ids.length > 0) {
            const fromConcerns = await apiModels.getTreatmentIdsByConcernIds(concern_ids);
            if (Array.isArray(fromConcerns) && fromConcerns.length > 0) {
                finalTreatmentIds = finalTreatmentIds.concat(fromConcerns);
            }
        }
 
        if (finalTreatmentIds.length === 0) {
            const fallbackTreatmentIds = await getTreatmentIDsByUserID(req.user.user_id);
            finalTreatmentIds = fallbackTreatmentIds || [];
        }
 
        let products = await apiModels.get_all_products_for_user({
            treatment_ids: finalTreatmentIds,
            limit,
            offset
        });
 
        if (!products || products.length === 0) {
            return handleSuccess(res, 200, language, "PRODUCTS_FETCHED_SUCCESSFULLY", []);
        }
 
        products = await Promise.all(products.map(async (product) => {
            const productImages = await apiModels.get_product_images(product.product_id);
            product.product_images = productImages.map((image) => {
                if (image.image && !image.image.startsWith('http')) {
                    image.image = `${APP_URL}clinic/product_image/${image.image}`;
                }
                return image;
            });
            return product;
        }));
 
        return handleSuccess(res, 200, language, "PRODUCTS_FETCHED_SUCCESSFULLY", products);
    } catch (error) {
        console.error("Error in getAllProducts:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};
 