import { createPaymentSession, getProductsByCartId, getProductsData, insertPayment, insertProductPurchase, processPaymentMetadata, updateCartPurchasedStatus, updateLatestAddress, updatePaymentStatus, updatePaymentStatusModel, updateProductsStock, updateProductsStockBulk, updateShipmentStatusModel } from "../../models/payment.js";
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

const process_earnings = async (metadata, user_id, products, cart_id, productDetails, PRODUCT_COMMISSION) => {
    try {
        const total_price = products.reduce((acc, item) => acc + Number(item.total_price || 0), 0);
        const admin_earning_percentage = parseFloat(PRODUCT_COMMISSION || 3);

        const admin_earnings = parseFloat(((total_price * admin_earning_percentage) / 100).toFixed(2));
        const clinic_earnings = parseFloat((total_price - admin_earnings).toFixed(2));
        productDetails = JSON.stringify(productDetails);
        if (isNaN(total_price) || isNaN(admin_earnings) || isNaN(clinic_earnings)) {
            throw new Error("Computed earnings contain NaN values");
        }

        const { insertId: purchase_id } = await insertProductPurchase(
            user_id,
            cart_id,
            total_price,
            admin_earnings,
            clinic_earnings,
            productDetails,
            metadata.address_id
        );

        return { status: "SUCCESS", message: "Earnings processed successfully", purchase_id, total_price };
    } catch (error) {
        return {
            status: "FAILED",
            message: `Error in process_earnings - ${error.message || "Unknown error"}`
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
    let {
        payment_gateway,
        metadata,
        address_id
    } = req.body;

    const { user_id, language = "en" } = req.user;

    metadata.user_id = user_id;
    metadata.address_id = address_id;


    let result = { status: "SUCCESS", message: "Payment initiated successfully" };

    if (metadata.type === "CART") {
        const stockCheck = await check_cart_stock(metadata);
        if (stockCheck.status === "FAILED") return handleError(res, 400, language, stockCheck.message);

        const { products, cart_id } = stockCheck;

        const earningResult = await process_earnings(metadata, user_id, products, cart_id, stockCheck.productDetails, stockCheck.PRODUCT_COMMISSION);

        if (earningResult.status === "FAILED") return handleError(res, 500, language, earningResult.message);

        let pro = []
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
            customerName: req?.user?.full_name || "Customer",
            totalAmount: earningResult.total_price,
            products: pro,
            logoUrl: process.env.LOGO_URL, // Optional - defaults to logo_2.png
            bannerImageUrl: "https://51.21.123.99:4000/product_main.png",
            customerAddress: stockCheck.address_data?.address || "Not provided",
            customerState: stockCheck.address_data?.state || "Not provided",
            customerCity: stockCheck.address_data?.city || "Not provided",
            customerzipCode: stockCheck.address_data?.zip_code || "Not provided",
            customerPhoneNumber: stockCheck.address_data?.phone_number || "Not provided",
            clinicName: products[0].clinic_name || "Clinic",
            clinicAddress: products[0].clinic_address || "Clinic Address",
        };


        const emailTemplate = orderConfirmationTemplate(emailData);
        const emailClinicTemlate = orderConfirmationTemplateClinic(emailData);

        const promises = [
            updateProductsStockBulk(products),
            updateCartPurchasedStatus(cart_id),
            sendEmail({
                to: req.user.email,
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
                userData: req.user,
                type: "PURCHASE",
                type_id: `${earningResult.purchase_id}`,
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
                type_id: `${earningResult.purchase_id}`,
                notification_type: NOTIFICATION_MESSAGES.cart_purchased_user,
                receiver_id: user_id,
                receiver_type: "USER",
                system: true
            }),
        ];

        if (address_id) {
            promises.push(updateLatestAddress(user_id, address_id));
        }

        await Promise.all(promises);


        result = earningResult
    }



    // const processedMetadata = await processPaymentMetadata({ payment_gateway, metadata });
    // const session = await createPaymentSession({ payment_gateway, metadata: processedMetadata });

    // await insertPayment(metadata.order_amount, "PURCHASE", metadata.purchase_id, session.id, processedMetadata);

    return handleSuccess(res, 200, language, "Product Purchase Successfully", result);
});

export const updateShipmentStatus = asyncHandler(async (req, res) => {
    const { purchase_id, shipment_status } = req.body;
    const userData = req.user;
    await updateShipmentStatusModel(purchase_id, shipment_status, userData);
    return handleSuccess(res, 200, "en", "SHIPMENT_STATUS_UPDATED_SUCCESSFULLY");
});

export const stripeWebhookHandler = asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];

    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    console.log(event)

    // await updatePaymentStatusModel(session_id, "PAID");
    return handleSuccess(res, 200, "en", "PAYMENT_STATUS_UPDATED_SUCCESSFULLY");
});

export const stripeSuccessHandler = asyncHandler(async (req, res) => {
    const { session_id } = req.query;
    // await updatePaymentStatusModel(session_id, "CANCELLED");
    const data = {
        status: "SUCCESS",
        session_id
    }
    return handleSuccess(res, 200, "en", "PAYMENT_STATUS_UPDATED_SUCCESSFULLY", data);
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