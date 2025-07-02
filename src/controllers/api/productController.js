import Joi from "joi";
import ejs from 'ejs';
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken"
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


export const getAllProducts = async (req, res) => {
    try {

        let products = await apiModels.get_all_products_for_user();
        if (products.length === 0) {
            return handleError(res, 404, "en", "NO_PRODUCTS_FOUND");
        }

        products = await Promise.all(products.map(async (product) => {
            const productImages = await apiModels.get_product_images(product.product_id);
            product.product_images = productImages.map((image) => {
                if (image.image && !image.image.startsWith('http')) {
                    image.image = APP_URL + 'clinic/product_image/' + image.image;
                }
                return image;
            });
            return product;
        }));


        return handleSuccess(res, 200, "en", "PRODUCTS_FETCHED_SUCCESSFULLY", products);
    } catch (error) {
        console.error("Error in getAllProducts:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};
