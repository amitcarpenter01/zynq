import Joi from "joi";
import ejs from 'ejs';
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken"
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import * as clinicModels from "../../models/clinic.js";
import * as webModels from "../../models/web_user.js";
import { sendEmail } from "../../services/send_email.js";
import { asyncHandler, handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import { generateAccessToken, generatePassword, generateVerificationLink } from "../../utils/user_helper.js";
import { generateProductsEmbeddingsV2 } from "../api/embeddingsController.js";


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

        const cover_image = req?.files?.find(file => file.fieldname === 'cover_image')?.filename || null;
        let product_id = uuidv4();
        const productData = {
            cover_image,
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
                if (file.fieldname === 'product_image') {
                    let data = {
                        product_id: product_id,
                        image: file.filename,
                    }
                    await clinicModels.insertProductImage(data);
                }
            }));
        }

        await generateProductsEmbeddingsV2(product_id);

        return handleSuccess(res, 201, "en", "PRODUCT_ADDED_SUCCESSFULLY");

    } catch (error) {
        console.error("Error in addProduct:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const getAllProducts = async (req, res) => {
    try {
        const [clinic] = await clinicModels.get_clinic_by_zynq_user_id(req.user.id);
        if (!clinic) {
            return handleError(res, 404, "en", "CLINIC_NOT_FOUND");
        }

        let products = await clinicModels.get_all_products(clinic.clinic_id);

        if (products.length === 0) {
            return handleSuccess(res, 200, "en", "PRODUCTS_FETCHED_SUCCESSFULLY", []);
        }

        products = await Promise.all(products.map(async (product) => {
            product.cover_image = product.cover_image ? APP_URL + 'clinic/cover_image/' + product.cover_image : null;
            const productImages = await clinicModels.get_product_images(product.product_id);
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

export const getProductById = async (req, res) => {
    try {
        const schema = Joi.object({
            product_id: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const [product] = await clinicModels.get_product_by_id(value.product_id);
        if (!product) {
            return handleError(res, 404, "en", "PRODUCT_NOT_FOUND");
        }

        const productImages = await clinicModels.get_product_images(product.product_id);
        product.cover_image = product.cover_image ? APP_URL + 'clinic/cover_image/' + product.cover_image : null;
        product.product_images = productImages.map((image) => {
            if (image.image && !image.image.startsWith('http')) {
                image.image = APP_URL + 'clinic/product_image/' + image.image;
            }
            return image;
        });
        return handleSuccess(res, 200, "en", "PRODUCT_FETCHED_SUCCESSFULLY", product);
    } catch (error) {
        console.error("Error in getProductById:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
}

export const updateProduct = async (req, res) => {
    try {
        const schema = Joi.object({
            product_id: Joi.string().required(),
            name: Joi.string().optional().allow('', null),
            price: Joi.number().optional().allow('', null),
            short_description: Joi.string().optional().allow('', null),
            full_description: Joi.string().optional().allow('', null),
            feature_text: Joi.string().optional().allow('', null),
            size_label: Joi.string().optional().allow('', null),
            benefit_text: Joi.string().optional().allow('', null),
            how_to_use: Joi.string().optional().allow('', null),
            ingredients: Joi.string().optional().allow('', null),
            treatment_ids: Joi.string().optional().allow('', null),
            stock: Joi.number().optional().allow('', null),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);


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

        const [product] = await clinicModels.get_product_by_id(value.product_id);

        if (!product) {
            return handleError(res, 404, "en", "PRODUCT_NOT_FOUND");
        }

        if (req.files.length > 0) {
            await Promise.all(req.files.map(async (file) => {
                if (file.fieldname === 'product_image') {
                    await clinicModels.insertProductImage({
                        product_id: product.product_id,
                        image: file.filename,
                    });
                }
            }));
        }

        const cover_image = req.files.find(file => file.fieldname === 'cover_image')?.filename || product.cover_image
        const data = {
            ...value,
            cover_image

        }
        await clinicModels.updateProduct(data, product.product_id);
        await clinicModels.updateProductTreatments(treatment_ids_array, product.product_id);
        await generateProductsEmbeddingsV2(product.product_id);
        return handleSuccess(res, 200, "en", "PRODUCT_UPDATED_SUCCESSFULLY");
    } catch (error) {
        console.error("Error in updateProduct:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const deleteProductImage = async (req, res) => {
    try {
        const schema = Joi.object({
            product_image_id: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.params);
        if (error) return joiErrorHandle(res, error);
        const { product_image_id } = value;

        const [productImage] = await clinicModels.get_product_image_by_id(product_image_id);
        if (!productImage) {
            return handleError(res, 404, "en", "PRODUCT_IMAGE_NOT_FOUND");
        }

        await clinicModels.deleteProductImage(product_image_id);

        return handleSuccess(res, 200, "en", "PRODUCT_IMAGE_DELETED_SUCCESSFULLY");
    } catch (error) {
        console.error("Error in deleteProductImage:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
}

export const deleteProduct = async (req, res) => {
    try {
        const schema = Joi.object({
            product_id: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.params);
        if (error) return joiErrorHandle(res, error);

        const [clinic] = await clinicModels.get_clinic_by_zynq_user_id(req.user.id);
        if (!clinic) {
            return handleError(res, 404, "en", "CLINIC_NOT_FOUND");
        }

        const [product] = await clinicModels.get_product_by_id(value.product_id);
        if (!product) {
            return handleError(res, 404, "en", "PRODUCT_NOT_FOUND");
        }

        await clinicModels.deleteProductImageByProductId(value.product_id);
        await clinicModels.deleteProduct(value.product_id);
        await clinicModels.deleteProductTreatments(value.product_id);

        return handleSuccess(res, 200, "en", "PRODUCT_DELETED_SUCCESSFULLY");

    } catch (error) {

    }
}

export const toggleHideProduct = asyncHandler(async (req, res) => {
    const { product_id } = req.params;
    const { language = "en" } = req.user;
    const clinic_id = req.user.clinicData.clinic_id;

    const [productData] = await clinicModels.getProductByProductAndClinicId(product_id, clinic_id);

    if (!productData) {
        return handleError(res, 404, language, "PRODUCT_NOT_FOUND");
    }

    const newIsHidden = !productData.is_hidden;

    await clinicModels.updateProduct({ is_hidden: newIsHidden }, product_id);

    const response_message = newIsHidden
        ? "PRODUCT_HIDDEN_SUCCESSFULLY"
        : "PRODUCT_UNHIDDEN_SUCCESSFULLY";

    return handleSuccess(res, 200, language, response_message);
});
