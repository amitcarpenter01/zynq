import Joi from "joi";
import * as adminModels from "../../models/admin.js";
import { handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";

export const get_products_managment = async (req, res) => {
    try {
        const products = await adminModels.get_products_management();

        if (!products || products.length === 0) {
            return handleSuccess(res, 200, 'en', "No products found", { products: [] });
        }

        const fullProductData = await Promise.all(
            products.map(async (product) => {
                product.total_revenue = 0;
                const findProductImages = await adminModels.get_product_images_by_product_id(product.product_id, process.env.APP_URL + 'clinic/product_image/')
                const treatments = await adminModels.getTreatmentsOfProducts(product.product_id)
                return {
                    ...product,
                    treatments,
                    findProductImages
                };
            })
        );

        return handleSuccess(res, 200, 'en', "Fetch product management successfully", { Products: fullProductData });
    } catch (error) {
        console.error("internal E", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR " + error.message);
    }
};

export const get_single_products_managment = async (req, res) => {
    try {
        const product_id = req.params.product_id
        const products = await adminModels.get_single_product_management(product_id);

        if (!products || products.length === 0) {
            return handleSuccess(res, 200, 'en', "No products found", { products: [] });
        }

        const fullProductData = await Promise.all(
            products.map(async (product) => {
                product.total_revenue = 0;
                const findProductImages = await adminModels.get_product_images_by_product_id(product.product_id, process.env.APP_URL + 'clinic/product_image/')
                const treatments = await adminModels.getTreatmentsOfProducts(product.product_id)
                return {
                    ...product,
                    treatments,
                    findProductImages
                };
            })
        );

        return handleSuccess(res, 200, 'en', "Fetch product management successfully", { Products: fullProductData });
    } catch (error) {
        console.error("internal E", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR " + error.message);
    }
};

export const delete_products_managment = async (req, res) => {
    try {
        const schema = Joi.object({
            product_id: Joi.string().required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { product_id } = value;

        const result = await adminModels.delete_product_by_id(product_id);

        if (result && result.affectedRows === 0) {
            return handleSuccess(res, 404, 'en', "Product not found or already deleted", {});
        }

        return handleSuccess(res, 200, 'en', "Product deleted successfully", result);
    } catch (error) {
        console.error("Delete Clinic Error:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR " + error.message);
    }
};