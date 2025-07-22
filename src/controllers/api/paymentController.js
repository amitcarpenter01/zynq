import { addOrGetUserCart, addProductToUserCart, deleteProductFromUserCart, get_product_images_by_product_ids, getUserCarts } from "../../models/api.js";
import { insertPayment } from "../../models/payment.js";
import { asyncHandler, handleError, handleSuccess, } from "../../utils/responseHandler.js";
import { formatImagePath, isEmpty } from "../../utils/user_helper.js";

export const initiatePayment = asyncHandler(async (req, res) => {
    const {
        user_id,
        doctor_id = null,
        clinic_id = null,
        payment_gateway,
        amount,
        currency,
        metadata,
    } = req.body;

    const { language = 'en' } = req.user;

    const payment_id = uuidv4();
    if (payment_gateway === 'KLARNA') {
        const session = await createKlarnaSession();

    } else if (payment_gateway === 'SWISH') {

    }
    
    await insertPayment(
        payment_id,
        user_id,
        doctor_id,
        clinic_id,
        payment_gateway, // provider
        amount,
        currency,
        session.id,      // provider_reference_id
        metadata
    );

    return handleSuccess(res, 200, language, "PAYMENT_INITIATED_SUCCESSFULLY");
});