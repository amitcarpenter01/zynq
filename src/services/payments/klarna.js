import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import dotenv from "dotenv";
import { getAppointmentsData, getProductsData, getTreatmentsData } from '../../models/payment.js';
dotenv.config();

const APP_URL = process.env.APP_URL;
const KLARNA_USERNAME = process.env.KLARNA_USERNAME;
const KLARNA_PASSWORD = process.env.KLARNA_PASSWORD;
const KLARNA_API_URL = process.env.KLARNA_API_URL;

// Klarna redirect URLs with token placeholders
const KLARNA_CONFIRMATION_URL = `${APP_URL}/checkout/success?order_id={checkout.order.id}`;
const KLARNA_PUSH_URL = `${APP_URL}/webhook/klarna?order_id={checkout.order.id}`;

export const createKlarnaSession = async ({ payment_id, currency = "SEK", metadata }) => {
    try {
        const orderId = payment_id;

        const klarnaPayload = {
            purchase_country: "SE",
            purchase_currency: currency,
            locale: "en-SE",
            order_amount: Math.round(metadata.order_amount * 100), // amount in öre
            order_tax_amount: 0,
            order_lines: metadata?.order_lines,
            merchant_urls: {
                confirmation: KLARNA_CONFIRMATION_URL,
                push: KLARNA_PUSH_URL
            },
            merchant_reference1: orderId
        };

        const response = await axios.post(
            `${KLARNA_API_URL}/checkout/v3/orders`,
            klarnaPayload,
            {
                auth: {
                    username: KLARNA_USERNAME,
                    password: KLARNA_PASSWORD
                },
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        return {
            id: response.data.order_id,             // Klarna's reference
            redirect_url: response.data.redirect_url, // for frontend redirect
            order_id: orderId                        // your own internal reference
        };

    } catch (err) {
        console.error("Klarna payment initiation failed", err?.response?.data || err);
        throw new Error("KLARNA_PAYMENT_FAILED");
    }
};

const formatKlarnaLineItem = (item, referenceKey, quantityMap, klarnaType = "digital") => {
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
        total_tax_amount: 0
    };
};

export const processKlarnaMetadata = async (metadata, doctor_id, clinic_id) => {
    metadata.doctor_id = doctor_id;
    metadata.clinic_id = clinic_id;

    const type_ids = metadata?.type_data.map(item => item.type_id);
    const quantityMap = {};
    metadata.type_data.forEach(item => {
        quantityMap[item.id] = item.quantity || 1;
    });

    let order_lines = [];

    switch (metadata?.type) {
        case "APPOINTMENT": {
            const appointmentsData = await getAppointmentsData(type_ids);
            order_lines = appointmentsData.map(item =>
                formatKlarnaLineItem(item, "appointment_id", quantityMap)
            );
            break;
        }

        case "TREATMENT": {
            const treatmentData = await getTreatmentsData(type_ids, doctor_id);
            order_lines = treatmentData.map(item =>
                formatKlarnaLineItem(item, "treatment_id", quantityMap)
            );
            break;
        }

        case "CART": {
            const productsData = await getProductsData(type_ids);
            order_lines = productsData.map(item =>
                formatKlarnaLineItem(item, "product_id", quantityMap, "physical")
            );
            break;
        }

        default:
            throw new Error("Unsupported metadata type");
    }

    metadata.order_lines = order_lines;
    metadata.order_amount = order_lines.reduce((sum, item) => sum + item.total_amount, 0) / 100;
    return metadata;
};