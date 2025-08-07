import axios from "axios";
import dotenv from "dotenv";
import {
    getAppointmentsData,
    getProductsData,
    getTreatmentsData,
} from "../../models/payment.js";
dotenv.config();

const APP_URL = process.env.APP_URL;
const KLARNA_USERNAME = process.env.KLARNA_USERNAME;
const KLARNA_PASSWORD = process.env.KLARNA_PASSWORD;
const KLARNA_API_URL = process.env.KLARNA_API_URL;
// Klarna redirect URLs with token placeholders
const KLARNA_CONFIRMATION_URL = `${APP_URL}/api/payments/klarna/confirmation?order_id={order.id}`;
const KLARNA_PUSH_URL = `${APP_URL}/api/payments/klarna/push?order_id={order.id}`;
const KLARNA_TERMS_URL = `${APP_URL}/api/payments/klarna/terms`;
const KLARNA_CHECKOUT_URL = `${APP_URL}/api/payments/klarna/checkout`;

const formatKlarnaLineItem = (
    item,
    referenceKey,
    quantityMap,
    klarnaType = "digital"
) => {
    const quantity = quantityMap[item[referenceKey]] || 1;
    const unit_price = Math.round(item.unit_price * 100); // convert to minor units

    return {
        type: klarnaType,
        reference: item[referenceKey],
        name: item.name,
        quantity,
        unit_price,
        tax_rate: 0,
        total_amount: unit_price * quantity,
        total_tax_amount: 0,
    };
};

export const processKlarnaMetadata = async (metadata) => {
    if (!Array.isArray(metadata?.type_data) || metadata.type_data.length === 0) {
        throw new Error("Invalid or missing type_data in metadata");
    }

    const type_ids = metadata.type_data.map((item) => item.type_id);
    const quantityMap = {};
    metadata.type_data.forEach((item) => {
        quantityMap[item.type_id] = item.quantity || 1;
    });

    let order_lines = [];

    switch (metadata?.type) {
        case "APPOINTMENT": {
            const appointmentsData = await getAppointmentsData(type_ids);
            order_lines = appointmentsData.map((item) =>
                formatKlarnaLineItem(item, "appointment_id", quantityMap)
            );
            break;
        }

        case "TREATMENT": {
            const treatmentData = await getTreatmentsData(type_ids, doctor_id);
            order_lines = treatmentData.map((item) =>
                formatKlarnaLineItem(item, "treatment_id", quantityMap)
            );
            break;
        }

        case "CART": {
            const productsData = await getProductsData(type_ids);
            order_lines = productsData.map((item) =>
                formatKlarnaLineItem(item, "product_id", quantityMap, "physical")
            );
            break;
        }

        default:
            throw new Error("Unsupported metadata type");
    }

    const order_amount_minor = order_lines.reduce(
        (sum, item) => sum + item.total_amount,
        0
    );

    const order_amount = order_amount_minor / 100;

    return {
        ...metadata,
        order_lines,
        order_amount, // major units for DB clarity
        order_amount_minor, // minor units for Klarna
    };
};

export const createKlarnaSession = async ({ payment_id, currency = "SEK", metadata, }) => {
    try {
        const klarnaPayload = {
            purchase_country: "SE",
            purchase_currency: currency,
            locale: "en-SE",
            order_amount: metadata.order_amount_minor, // minor units
            order_tax_amount: 0,
            order_lines: metadata.order_lines,
            merchant_urls: {
                confirmation: KLARNA_CONFIRMATION_URL,
                push: KLARNA_PUSH_URL,
                terms: KLARNA_TERMS_URL,
                checkout: KLARNA_CHECKOUT_URL,
            },
            merchant_reference1: payment_id,
            intent: "buy"
        };
        const authToken = Buffer.from(
            `${KLARNA_USERNAME}:${KLARNA_PASSWORD}`
        ).toString("base64");

        const response = await axios.post(
            `${KLARNA_API_URL}/payments/v1/sessions`,
            klarnaPayload,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Basic ${authToken}`,
                },
            }
        );
        return {
            session_id: response.data.session_id,
            payment_method_categories: response.data.payment_method_categories,
            client_token: response.data.client_token,
        };
    } catch (err) {
        console.error(
            "Klarna payment initiation failed",
            err?.response?.data || err
        );
        throw new Error("KLARNA_PAYMENT_FAILED");
    }
};

export const getKlarnaWebhookResponse = async (authorization) => {
    const response = await axios.post(`${KLARNA_API_URL}/payments/v1/authorizations/${authorization}/order`, {
        auth: {
            username: KLARNA_USERNAME,
            password: KLARNA_PASSWORD
        }
    });

    return response;
};