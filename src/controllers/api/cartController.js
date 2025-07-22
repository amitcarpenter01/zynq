import { addOrGetUserCart, addProductToUserCart, deleteCartByCartId, deleteProductFromUserCart, get_product_images_by_product_ids, getSingleCartByCartId, getUserCarts } from "../../models/api.js";
import { asyncHandler, handleError, handleSuccess, } from "../../utils/responseHandler.js";
import { formatImagePath, isEmpty } from "../../utils/user_helper.js";

export const addProductToCart = asyncHandler(async (req, res) => {
    const { clinic_id, product_id, quantity } = req.body;
    const { user_id, language = "en" } = req.user

    const cartData = await addOrGetUserCart(clinic_id, user_id);
    const productData = await addProductToUserCart(cartData.cart_id, product_id, quantity);
    return handleSuccess(res, 200, language, "CART_UPDATED_SUCCESSFULLY");
});

export const deleteProductFromCart = asyncHandler(async (req, res) => {
    const { product_id } = req.params;
    const { user_id, language = "en" } = req.user;
    await deleteProductFromUserCart(user_id, product_id);
    return handleSuccess(res, 200, language, "PRODUCT_DELETED_SUCCESSFULLY");
});

export const deleteCart = asyncHandler(async (req, res) => {
    const { cart_id } = req.params;
    const { language = "en" } = req.user;
    await deleteCartByCartId(cart_id);
    return handleSuccess(res, 200, language, "CART_DELETED_SUCCESSFULLY");
});

export const processedCartsData = async (cartsData = []) => {
    const cartMap = new Map();
    const productIdsSet = new Set();

    for (const row of cartsData) {
        let {
            cart_id,
            clinic_id,
            clinic_name,
            clinic_logo,
            user_id,
            product_id,
            product_name,
            short_description,
            stock,
            quantity,
            price,

        } = row;

        price = Number(price) || 0;

        if (!cartMap.has(cart_id)) {
            cartMap.set(cart_id, {
                cart_id,
                clinic_id,
                clinic_name,
                clinic_logo: formatImagePath(clinic_logo || "", "clinic/logo"),
                user_id,
                products: [],
                total_cart_price: 0
            });
        }

        if (product_id) {
            productIdsSet.add(product_id);

            const total_product_price = quantity * price;

            cartMap.get(cart_id).products.push({
                product_id,
                product_name,
                short_description,
                stock,
                quantity,
                price,
                total_product_price
            });

            cartMap.get(cart_id).total_cart_price += total_product_price;
        }
    }

    const productIds = Array.from(productIdsSet);
    const imageRows = await get_product_images_by_product_ids(productIds);

    const imagesMap = {};
    for (const row of imageRows) {
        if (!imagesMap[row.product_id]) imagesMap[row.product_id] = [];

        imagesMap[row.product_id].push(
            formatImagePath(row.image, "clinic/product_image")
        );
    }

    for (const cart of cartMap.values()) {
        for (const product of cart.products) {
            product.product_images = imagesMap[product.product_id] || [];
        }
    }

    return Array.from(cartMap.values());
};

export const getCarts = asyncHandler(async (req, res) => {
    const { user_id, language = "en" } = req.user;

    const cartsData = await getUserCarts(user_id);

    if (isEmpty(cartsData)) return handleSuccess(res, 200, language, "CARTS_FETCHED_SUCCESSFULLY", []);

    const processedCartData = await processedCartsData(cartsData);

    return handleSuccess(res, 200, language, "CARTS_FETCHED_SUCCESSFULLY", processedCartData);
});

export const getSingleCart = asyncHandler(async (req, res) => {
    const { language = "en" } = req.user;
    const { cart_id } = req.params;

    const cartsData = await getSingleCartByCartId(cart_id);

    if (isEmpty(cartsData)) return handleSuccess(res, 200, language, "CARTS_FETCHED_SUCCESSFULLY", []);

    const processedCartData = await processedCartsData(cartsData);

    return handleSuccess(res, 200, language, "CART_FETCHED_SUCCESSFULLY", processedCartData[0]);
});



