import { get_product_images_by_product_ids, getLegalDocumentsForUsers, getWishlistForUser, toggleWishlistProductForUser, updateLegalDocumentsService } from "../../models/api.js";
import { asyncHandler, handleError, handleSuccess, } from "../../utils/responseHandler.js";
import { formatImagePath } from "../../utils/user_helper.js";

export const getWishlists = asyncHandler(async (req, res) => {
    const wishlistData = await getWishlistForUser(req.user.user_id);

    if (!wishlistData || wishlistData.length === 0) {
        return handleSuccess(res, 200, language, "WISHLIST_FETCHED_SUCCESSFULLY", []);
    }

    const productIds = wishlistData.map(w => w.product_id);
    const imageRows = await get_product_images_by_product_ids(productIds);

    const imagesMap = {};
    for (const row of imageRows) {
        if (!imagesMap[row.product_id]) {
            imagesMap[row.product_id] = [];
        }
        imagesMap[row.product_id].push(formatImagePath(row.image, "clinic/product_image"));
    }

    for (const product of wishlistData) {
        product.product_images = imagesMap[product.product_id] || [];
    }
    return handleSuccess(res, 200, 'en', "WISHLIST_FETCHED_SUCCESSFULLY", wishlistData);
});

export const toggleWishlistProduct = asyncHandler(async (req, res) => {
    const { product_id } = req.params;
    const user_id = req?.user?.user_id;
    const result = await toggleWishlistProductForUser(product_id, user_id);
    return handleSuccess(res, 200, 'en', "PRODUCT_UPDATED_SUCCESSFULLY");
});
