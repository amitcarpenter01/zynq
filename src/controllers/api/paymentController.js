import { getProductsData, insertPayment, insertProductPurchase, updateCartPurchasedStatus, updateProductsStock, updateProductsStockBulk } from "../../models/payment.js";
import {
    createKlarnaSession,
    getKlarnaWebhookResponse,
    processKlarnaMetadata,
} from "../../services/payments/klarna.js";
import {
    asyncHandler,
    handleError,
    handleSuccess,
} from "../../utils/responseHandler.js";
import { v4 as uuidv4 } from "uuid";

const process_earnings = async (metadata, user_id, products, cart_id) => {
    try {
        const total_price = products.reduce((acc, item) => acc + item.unit_price, 0) || 0;
        const admin_earning_percentage = parseFloat(process.env.ADMIN_EARNING_PERCENTAGE || 3);
        const admin_earnings = ((total_price * admin_earning_percentage) / 100).toFixed(2);
        const clinic_earnings = total_price - admin_earnings;

        await insertProductPurchase(
            user_id,
            cart_id,
            total_price,
            admin_earnings,
            clinic_earnings
        );

        return { status: "SUCCESS", message: "Earnings processed successfully" };
    } catch (error) {
        return { status: "FAILED", message: "Error in process_earnings - " + error.message || "Unknown error" };
    }
};

const check_cart_stock = async (metadata) => {
    const [cart_id] = metadata.type_data.map((item) => item.type_id);
    const products = await getProductsData(cart_id);

    for (const product of products) {
        if (product.stock < product.cart_quantity) {
            return {
                status: "FAILED",
                message: `${product.name} is out of stock. Current stock is ${product.stock}`,
            };
        }
    }

    return { status: "SUCCESS", products, cart_id };
};

export const initiatePayment = asyncHandler(async (req, res) => {
    const {
        payment_gateway,
        currency,
        metadata,
    } = req.body;

    const { user_id, language = "en" } = req.user;

    let result = { status: "SUCCESS", message: "Payment initiated successfully" };

    if (metadata.type === "CART") {
        const stockCheck = await check_cart_stock(metadata);

        if (stockCheck.status === "FAILED") {
            return handleError(res, 400, language, stockCheck.message);
        }

        const { products, cart_id } = stockCheck;

        const earningResult = await process_earnings(metadata, user_id, products, cart_id);

        if (earningResult.status === "FAILED") {
            return handleError(res, 500, language, earningResult.message);
        }

        await Promise.all([
            updateProductsStockBulk(products),
            updateCartPurchasedStatus(cart_id),
        ]);


        result = earningResult; // overwrite with earning info
    }

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
