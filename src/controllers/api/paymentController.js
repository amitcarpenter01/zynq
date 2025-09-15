import { createPaymentSession, getCartMetadataAndStatusByCartId, getProductsByCartId, getProductsData, insertPayment, insertProductPurchase, processPaymentMetadata, updateCartMetadata, updateCartPurchasedStatus, updateLatestAddress, updatePaymentStatus, updatePaymentStatusModel, updateProductsStock, updateProductsStockBulk, updateShipmentStatusModel } from "../../models/payment.js";
import { NOTIFICATION_MESSAGES, sendNotification } from "../../services/notifications.service.js";
import {
    asyncHandler,
    handleError,
    handleSuccess,
} from "../../utils/responseHandler.js";
import { v4 as uuidv4 } from "uuid";
import { isEmpty } from "../../utils/user_helper.js";
import { orderConfirmationTemplate, orderConfirmationTemplateClinic } from "../../utils/templates.js";
import { sendEmail } from "../../services/send_email.js";
import dayjs from 'dayjs';
import { getSingleAddressByAddressId } from "../../models/address.js";
import { getAdminCommissionRatesModel } from "../../models/admin.js";
import { stripe } from "../../../app.js";

const process_earnings = async (
    metadata,
    user_id,
    products,
    cart_id,
    productDetails,
    PRODUCT_COMMISSION
) => {
    try {
        const total_price = products.reduce(
            (acc, item) => acc + Number(item.total_price || 0),
            0
        );

        // Normalize commission
        const admin_earning_percentage = Number(PRODUCT_COMMISSION) || 3;

        const admin_earnings = Number(((total_price * admin_earning_percentage) / 100).toFixed(2));
        const clinic_earnings = Number((total_price - admin_earnings).toFixed(2));

        if (isNaN(total_price) || isNaN(admin_earnings) || isNaN(clinic_earnings)) {
            throw new Error("Computed earnings contain NaN values");
        }

        // Return a **new enriched metadata object**
        const enrichedMetadata = {
            ...metadata, // keep original fields
            user_id,
            cart_id,
            total_price,
            admin_earnings,
            clinic_earnings,
            products: JSON.stringify(products),
            product_details: JSON.stringify(productDetails),
            order_amount: total_price,
        };

        return {
            status: "SUCCESS",
            message: "Earnings processed successfully",
            total_price,
            metadata: enrichedMetadata,
        };
    } catch (error) {
        return {
            status: "FAILED",
            message: `Error in process_earnings - ${error.message || "Unknown error"}`,
        };
    }
};

const check_cart_stock = async (metadata) => {
    const [cart_id] = metadata.type_data.map((item) => item.type_id);

    const [products, productDetails, address_data, [{ PRODUCT_COMMISSION }]] = await Promise.all([
        getProductsData(cart_id),
        getProductsByCartId(cart_id),
        getSingleAddressByAddressId(metadata.address_id),
        getAdminCommissionRatesModel()
    ]);

    if (!products || products.length === 0) {
        return {
            status: "FAILED",
            message: "No products found in cart.",
        };
    }

    for (const product of products) {
        if (product.cart_status === "PURCHASED") {
            return {
                status: "FAILED",
                message: `Cart has already been purchased.`,
            }
        }

        if (product.stock < product.cart_quantity) {
            return {
                status: "FAILED",
                message: `${product.name} is out of stock.`,
            };
        }
    }

    return { status: "SUCCESS", products, cart_id, productDetails, address_data, PRODUCT_COMMISSION };
};

export const initiatePayment = asyncHandler(async (req, res) => {
    let { payment_gateway, metadata, address_id, redirect_url, cancel_url } = req.body;
    const { user_id, language = "en" } = req.user;
    metadata.address_id = address_id;

    const stockCheck = await check_cart_stock(metadata);
    if (stockCheck.status === "FAILED") {
        return handleError(res, 400, language, stockCheck.message);
    }

    const { products, cart_id, productDetails, PRODUCT_COMMISSION } = stockCheck;
    metadata.address_data = stockCheck.address_data[0];
    metadata.userData = req.user;
    metadata.products = products;

    const earningResult = await process_earnings(
        metadata,
        user_id,
        products,
        cart_id,
        productDetails,
        PRODUCT_COMMISSION
    );

    if (earningResult.status === "FAILED") {
        return handleError(res, 500, language, earningResult.message);
    }

    const processedMetadata = processPaymentMetadata({
        payment_gateway,
        metadata: earningResult.metadata,
    });

    const [session, cart] = await Promise.all([
        createPaymentSession({
            payment_gateway,
            metadata: processedMetadata,
            redirect_url,
            cancel_url
        }),
        updateCartMetadata(cart_id, processedMetadata),
    ])

    return handleSuccess(res, 200, language, "Payment initiated successfully", {
        status: earningResult.status,
        message: earningResult.message,
        url: session.url
    });

});

export const updateShipmentStatus = asyncHandler(async (req, res) => {
    const { purchase_id, shipment_status } = req.body;
    const language = req?.user?.language || 'en';
    const userData = req.user;
    await updateShipmentStatusModel(purchase_id, shipment_status, userData);
    return handleSuccess(res, 200, language, "SHIPMENT_STATUS_UPDATED_SUCCESSFULLY");
});

export const stripeWebhookHandler = asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];

    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    // await updatePaymentStatusModel(session_id, "PAID");
    return handleSuccess(res, 200, "en", "PAYMENT_STATUS_UPDATED_SUCCESSFULLY");
});

export const stripeSuccessHandler = asyncHandler(async (req, res) => {
    const { session_id } = req.query;

    const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["payment_intent", "line_items"], // expand if needed
    });

    const { metadata, cart_status } = await getCartMetadataAndStatusByCartId(session.metadata.cart_id);

    if (cart_status === "PURCHASED") {
        return handleError(res, 400, "en", "Cart has already been purchased.");

    }

    const { insertId: purchase_id } = await insertProductPurchase(
        metadata.user_id,
        metadata.cart_id,
        metadata.total_price,
        metadata.admin_earnings,
        metadata.clinic_earnings,
        metadata.product_details,
        metadata.address_id
    );

    let pro = []
    const products = JSON.parse(metadata.products);
    products.map((product) => {
        let data = {
            product_id: product.product_id,
            name: product.name,
            price: product.unit_price,
            quantity: product.cart_quantity,
            image_url: product.image_url || "product_img.png",
        }
        pro.push(data);
    });
    const emailData = {
        orderDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        customerName: metadata.userData.full_name || "Customer",
        totalAmount: metadata.total_price,
        products: pro,
        logoUrl: process.env.LOGO_URL, // Optional - defaults to logo_2.png
        bannerImageUrl: "https://51.21.123.99:4000/product_main.png",
        customerAddress: metadata.address_data?.address || "Not provided",
        customerState: metadata.address_data?.state || "Not provided",
        customerCity: metadata.address_data?.city || "Not provided",
        customerzipCode: metadata.address_data?.zip_code || "Not provided",
        customerPhoneNumber: metadata.address_data?.phone_number || "Not provided",
        clinicName: products[0].clinic_name || "Clinic",
        clinicAddress: products[0].clinic_address || "Clinic Address",
    };

    const emailTemplate = orderConfirmationTemplate(emailData);
    const emailClinicTemlate = orderConfirmationTemplateClinic(emailData);

    const promises = [
        updateProductsStockBulk(products),
        updateCartPurchasedStatus(metadata.cart_id),
        sendEmail({
            to: metadata.userData.email,
            subject: emailTemplate.subject,
            html: emailTemplate.body,
        }),

        sendEmail({
            to: products[0].clinic_email,
            subject: emailClinicTemlate.subject,
            html: emailClinicTemlate.body,
        })
        ,
        sendNotification({
            userData: metadata.userData,
            type: "PURCHASE",
            type_id: `${purchase_id}`,
            notification_type: NOTIFICATION_MESSAGES.cart_purchased,
            receiver_id: products[0].clinic_id,
            receiver_type: "CLINIC"
        }),

        sendNotification({
            userData: {
                user_id: products[0]?.clinic_id,
                role: "CLINIC",
                full_name: products[0]?.clinic_name || "Clinic",
                token: products[0]?.token || null
            },
            type: "PURCHASE",
            type_id: `${purchase_id}`,
            notification_type: NOTIFICATION_MESSAGES.cart_purchased_user,
            receiver_id: metadata.user_id,
            receiver_type: "USER",
            system: true
        }),
    ];

    if (metadata.address_id) {
        promises.push(updateLatestAddress(metadata.user_id, metadata.address_id));
    }

    await Promise.all(promises);

    return handleSuccess(res, 200, "en", "PAYMENT_PROCESSED_SUCCESSFULLY", { purchase_id });
});

export const stripeCancelHandler = asyncHandler(async (req, res) => {
    return handleSuccess(res, 200, "en", "PAYMENT_CANCELLED_SUCCESSFULLY");
});

export const testPayment = asyncHandler(async (req, res) => {
    const session = await createPaymentSession(
        {
            payment_gateway: "KLARNA",
            metadata: {
                order_lines: [
                    {
                        name: "Test",
                        quantity: 1,
                        unit_amount: 100 * 100,
                    }]
            }
        });
    return handleSuccess(res, 200, "en", "SESSION_CREATED_SUCCESSFULLY", session);
})