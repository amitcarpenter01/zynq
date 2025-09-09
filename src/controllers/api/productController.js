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

export const addProduct = async (req, res) => {
    try {
        const schema = Joi.object({
            name: Joi.string().required(),
            price: Joi.number().required(),
            short_description: Joi.string().optional().allow('', null),
            full_description: Joi.string().optional().allow('', null),
            feature_text: Joi.string().optional().allow('', null),
            size_label: Joi.string().optional().allow('', null),
            benefit_text: Joi.string().optional().allow('', null),
            how_to_use: Joi.string().optional().allow('', null),
            ingredients: Joi.string().optional().allow('', null),
            stock: Joi.number().optional().allow('', null),
            treatment_ids: Joi.string().optional().allow('', null),
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return joiErrorHandle(res, error);
        }

        const [clinic] = await clinicModels.get_clinic_by_zynq_user_id(req.user.id);
        if (!clinic) {
            return handleError(res, 404, "en", "CLINIC_NOT_FOUND");
        }

        const { treatment_ids } = value;
        delete value.treatment_ids;

        let treatment_ids_array = []
        if (treatment_ids) {
            treatment_ids_array = treatment_ids.split(',')
        }

        let product_id = uuidv4();
        const productData = {
            product_id: product_id,
            clinic_id: clinic.clinic_id,
            ...value
        };

        await clinicModels.insertProduct(productData);

        const [product] = await clinicModels.get_product_by_id(product_id);
        if (!product) {
            return handleError(res, 404, "en", "PRODUCT_NOT_FOUND");
        }

        if (treatment_ids_array.length > 0) {
            await clinicModels.insertProductTreatments(treatment_ids_array, product.product_id);
        }


        if (req.files.length > 0) {
            await Promise.all(req.files.map(async (file) => {
                let data = {
                    product_id: product_id,
                    image: file.filename,
                }
                await clinicModels.insertProductImage(data);
            }));
        }

        return handleSuccess(res, 201, "en", "PRODUCT_ADDED_SUCCESSFULLY");

    } catch (error) {
        console.error("Error in addProduct:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const getAllProducts = async (req, res) => {
    try {
        const language = req?.user?.language || 'en';
        const userId = req?.user?.user_id;

        const {
            filters = {},
            sort = { by: 'latest', order: 'desc' },
            pagination = { page: 1, limit: 20 }
        } = req.body;

        let {
            treatment_ids = [],
            concern_ids = [],
            search = '',
            price = {},
            recommended = true
        } = filters;

        const { page, limit } = pagination;
        const offset = (page - 1) * limit;

        let finalTreatmentIds = [...treatment_ids];

        if (concern_ids.length > 0) {
            const fromConcerns = await apiModels.getTreatmentIdsByConcernIds(concern_ids);
            if (Array.isArray(fromConcerns) && fromConcerns.length > 0) {
                finalTreatmentIds = [...new Set([...finalTreatmentIds, ...fromConcerns])];
            }
        }
        if (recommended && userId) {
            const fallbackTreatmentIds = await getTreatmentIDsByUserID(userId);
            finalTreatmentIds = fallbackTreatmentIds || [];
        }

        const queryFilters = {
            user_id: userId,
            treatment_ids: finalTreatmentIds,
            search,
            price,
            sort,
            limit,
            offset
        };

        let products = await apiModels.get_all_products_for_user(queryFilters);

        if (userId) {
            const userCartProducts = await apiModels.getUserCartProduct(userId);

            if (userCartProducts.length === 0) {
                products = products.map(item => ({ ...item, added_in_cart: 0 }));
            } else {
                const cartProductIds = new Set(userCartProducts.map(p => p.product_id));
                products = products.map(item => ({
                    ...item,
                    added_in_cart: cartProductIds.has(item.product_id) ? 1 : 0
                }));
            }
        } else {
            products = products.map(item => ({ ...item, added_in_cart: 0 }));
        }

        if (!products || products.length === 0) {
            return handleSuccess(res, 200, language, "PRODUCTS_FETCHED_SUCCESSFULLY", []);
        }

        const productIds = products.map(p => p.product_id);
        const imageRows = await apiModels.get_product_images_by_product_ids(productIds);

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
        const user_id = req?.user?.user_id
        const products = await apiModels.get_single_product_for_user(req.params.product_id, user_id);

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

export const groupProductsByCartAndClinic = (products = []) => {
    const groupedMap = {};

    for (const product of products) {
        const key = `${product.cart_id}_${product.clinic_id}_${product.clinic_name}`;

        if (!groupedMap[key]) {
            groupedMap[key] = {
                cart_id: product.cart_id,
                clinic_id: product.clinic_id,
                name: product.name,
                shipment_status: product.shipment_status,
                products: []
            };
        }

        groupedMap[key].products.push(product);
    }

    return Object.values(groupedMap);
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
        total_spent: Number(total_carts_spent.toFixed(2)),
        purchases: products,
    }
    return handleSuccess(res, 200, language, "PURCHASED_PRODUCTS_FETCHED", data);
});

export const getSingleUserPurchasedProducts = asyncHandler(async (req, res) => {
    const { language = "en", user_id } = req.user;
    const purchase_id = req.params.purchase_id;
    const products = await apiModels.getSingleUserPurchasedProductModel(user_id, purchase_id);
    const carts = await apiModels.getSingleUserCartProductModel(user_id, purchase_id);

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
        total_spent: Number(total_carts_spent.toFixed(2)),
        purchases: products,
    }
    return handleSuccess(res, 200, language, "PURCHASED_PRODUCTS_FETCHED", data);
});