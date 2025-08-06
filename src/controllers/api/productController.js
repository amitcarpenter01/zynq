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
import { asyncHandler, handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
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
        const userId = req?.user?.user_id;

        const {
            filters = {},
            pagination = { page: 1, limit: 20 }
        } = req.body;

        let {
            treatment_ids = [],
            concern_ids = [],
            search = '',
            price = {}
        } = filters;

        const { page, limit } = pagination;
        const offset = (page - 1) * limit;

        let finalTreatmentIds = [...treatment_ids];

        // Expand treatment_ids from concern_ids
        if (concern_ids.length > 0) {
            const fromConcerns = await apiModels.getTreatmentIdsByConcernIds(concern_ids);
            if (Array.isArray(fromConcerns) && fromConcerns.length > 0) {
                finalTreatmentIds = [...new Set([...finalTreatmentIds, ...fromConcerns])];
            }
        }

        // Fallback if no filters provided
        const areAllFiltersEmpty =
            finalTreatmentIds.length === 0 &&
            search.trim().length === 0 &&
            Object.keys(price).length === 0;

        if (areAllFiltersEmpty) {
            const fallbackTreatmentIds = await getTreatmentIDsByUserID(userId);
            // finalTreatmentIds = fallbackTreatmentIds || [];
        }

        const queryFilters = {
            treatment_ids: finalTreatmentIds,
            search,
            price,
            limit,
            offset
        };

        const products = await apiModels.get_all_products_for_user(queryFilters);

        if (!products || products.length === 0) {
            return handleSuccess(res, 200, language, "PRODUCTS_FETCHED_SUCCESSFULLY", []);
        }

        const productIds = products.map(p => p.product_id);
        const imageRows = await apiModels.get_product_images_by_product_ids(productIds);

        // 🧠 Group images by product_id
        const imagesMap = {};
        for (const row of imageRows) {
            if (!imagesMap[row.product_id]) imagesMap[row.product_id] = [];
            imagesMap[row.product_id].push(
                row.image.startsWith('http')
                    ? row.image
                    : `${APP_URL}clinic/product_image/${row.image}`
            );
        }

        for (const product of products) {
            product.product_images = imagesMap[product.product_id] || [];
        }

        return handleSuccess(res, 200, language, "PRODUCTS_FETCHED_SUCCESSFULLY", products);
    } catch (error) {
        console.error("Error in getAllProducts:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const getSingleProduct = async (req, res) => {
    try {
        const language = req?.user?.language || 'en';

        const products = await apiModels.get_single_product_for_user(req.params.product_id);

        if (!products || products.length === 0) {
            return handleSuccess(res, 200, language, "PRODUCTS_FETCHED_SUCCESSFULLY", []);
        }

        const productIds = products.map(p => p.product_id);
        const imageRows = await apiModels.get_product_images_by_product_ids(productIds);

        // 🧠 Group images by product_id
        const imagesMap = {};
        for (const row of imageRows) {
            if (!imagesMap[row.product_id]) imagesMap[row.product_id] = [];
            imagesMap[row.product_id].push(
                row.image.startsWith('http')
                    ? row.image
                    : `${APP_URL}clinic/product_image/${row.image}`
            );
        }

        for (const product of products) {
            product.product_images = imagesMap[product.product_id] || [];
        }

        return handleSuccess(res, 200, language, "PRODUCT_FETCHED_SUCCESSFULLY", products[0]);
    } catch (error) {
        console.error("Error in getAllProducts:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const getUserPurchasedProducts = asyncHandler(async (req, res) => {
    const { language = "en", user_id } = req.user;
    const products = await apiModels.getUserPurchasedProductModel(user_id);
    const carts = await apiModels.getUserCartProductModel(user_id);

    const {
        total_carts_spent
    } = carts.reduce(
        (acc, cart) => {
            const cartSpent = Number(cart.total_price) || 0;
            acc.total_carts_spent += cartSpent;

            return acc;
        },
        {
            total_carts_spent: 0
        }
    );

    const data = {
        total_spent: total_carts_spent,
        products: products,
    }
    return handleSuccess(res, 200, language, "PURCHASED_PRODUCTS_FETCHED", data);
});