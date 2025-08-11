import { getProductsByCartId, getProductsData, insertPayment, insertProductPurchase, updateCartPurchasedStatus, updateProductsStock, updateProductsStockBulk } from "../../models/payment.js";
import {
    createKlarnaSession,
    getKlarnaWebhookResponse,
    processKlarnaMetadata,
} from "../../services/payments/klarna.js";
import { createStripeSession, processStripeMetadata } from "../../services/payments/stripe.js";
import {
    asyncHandler,
    handleError,
    handleSuccess,
} from "../../utils/responseHandler.js";
import { v4 as uuidv4 } from "uuid";

const process_earnings = async (metadata, user_id, products, cart_id, productDetails) => {
    try {
        const total_price = products.reduce((acc, item) => acc + Number(item.unit_price || 0), 0);
        const admin_earning_percentage = parseFloat(process.env.ADMIN_EARNING_PERCENTAGE || "3");

        const admin_earnings = parseFloat(((total_price * admin_earning_percentage) / 100).toFixed(2));
        const clinic_earnings = parseFloat((total_price - admin_earnings).toFixed(2));
        productDetails = JSON.stringify(productDetails);
        if (isNaN(total_price) || isNaN(admin_earnings) || isNaN(clinic_earnings)) {
            throw new Error("Computed earnings contain NaN values");
        }

        await insertProductPurchase(
            user_id,
            cart_id,
            total_price,
            admin_earnings,
            clinic_earnings,
            productDetails
        );

        return { status: "SUCCESS", message: "Earnings processed successfully" };
    } catch (error) {
        return {
            status: "FAILED",
            message: `Error in process_earnings - ${error.message || "Unknown error"}`
        };
    }
};

const check_cart_stock = async (metadata) => {
    const [cart_id] = metadata.type_data.map((item) => item.type_id);
    const products = await getProductsData(cart_id);
    const productDetails = await getProductsByCartId(cart_id);

    for (const product of products) {
        if (product.stock < product.cart_quantity) {
            return {
                status: "FAILED",
                message: `${product.name} is out of stock.`,
            };
        }
    }

    return { status: "SUCCESS", products, cart_id, productDetails };
};

export const initiatePayment = asyncHandler(async (req, res) => {
    let {
        payment_gateway,
        currency,
        metadata,
        doctor_id,
        clinic_id
    } = req.body;

    const { user_id, language = "en" } = req.user;

    metadata.user_id = user_id;
    metadata.doctor_id = doctor_id;
    metadata.clinic_id = clinic_id;

    let result = { status: "SUCCESS", message: "Payment initiated successfully" };
    const payment_id = uuidv4();
    if (metadata.type === "CART") {
        const stockCheck = await check_cart_stock(metadata);
        if (stockCheck.status === "FAILED") return handleError(res, 400, language, stockCheck.message);

        const { products, cart_id } = stockCheck;

        const earningResult = await process_earnings(metadata, user_id, products, cart_id, stockCheck.productDetails);

        if (earningResult.status === "FAILED") return handleError(res, 500, language, earningResult.message);

        await Promise.all([
            updateProductsStockBulk(products),
            updateCartPurchasedStatus(cart_id),
        ]);

        result = earningResult
    }
    let session;

    // switch (payment_gateway) {
    //     case "KLARNA":
    //         metadata = await processKlarnaMetadata(metadata);
    //         session = await createKlarnaSession({ payment_id: payment_id, currency: currency, metadata: metadata, });
    //         break;

    //     case "SWISH":
    //         break;

    //     case "STRIPE":
    //         metadata = await processStripeMetadata(metadata);
    //         session = await createStripeSession({ payment_id, currency, metadata });
    //         break;

    //     default:
    //         break;
    // }

    // await insertPayment(
    //     payment_id,
    //     user_id,
    //     doctor_id,
    //     clinic_id,
    //     payment_gateway, // provider
    //     metadata.order_amount,
    //     currency,
    //     session.session_id, // provider_reference_id
    //     session.client_token,
    //     metadata
    // );



    return handleSuccess(res, 200, language, "Product Purchase Successfully", result);
});

export const klarnaWebhookHandler = asyncHandler(async (req, res) => {
    const { order_id } = req.query;

    const klarnaResponse = await getKlarnaWebhookResponse(order_id);
    console.log("klarnaResponse", klarnaResponse);

    const klarnaStatus = klarnaResponse?.data?.status;

    const statusMap = {
        AUTHORIZED: "COMPLETED",
        CANCELLED: "CANCELLED",
    };

    const newStatus = statusMap[klarnaStatus] || "PENDING";


    await updatePaymentStatus(order_id, newStatus);

    return handleSuccess(res, 200, "en", "PAYMENT_STATUS_UPDATED_SUCCESSFULLY");
});
