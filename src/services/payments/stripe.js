import axios from "axios";
import dotenv from "dotenv";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";

import { getAppointmentsData, getProductsData, getTreatmentsData } from "../../models/payment.js";
dotenv.config();

const APP_URL = process.env.APP_URL;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16", // or your preferred version
});
export const processStripeMetadata = async (metadata) => {
    if (!Array.isArray(metadata?.type_data) || metadata.type_data.length === 0) {
        throw new Error("Invalid or missing type_data in metadata");
    }

    const type_ids = metadata.type_data.map((item) => item.type_id);
    const quantityMap = {};
    metadata.type_data.forEach((item) => {
        quantityMap[item.type_id] = item.quantity || 1;
    });

    let rawItems = [];

    switch (metadata?.type) {
        case "APPOINTMENT": {
            const appointmentsData = await getAppointmentsData(type_ids);
            rawItems = appointmentsData.map((item) => ({
                price: item.unit_price,
                quantity: quantityMap[item.appointment_id],
            }));
            break;
        }

        case "TREATMENT": {
            const treatmentData = await getTreatmentsData(type_ids, metadata.doctor_id);
            rawItems = treatmentData.map((item) => ({
                price: item.unit_price,
                quantity: quantityMap[item.treatment_id],
            }));
            break;
        }

        case "CART": {
            const productsData = await getProductsData(type_ids);
            rawItems = productsData.map((item) => ({
                price: Number(item.unit_price),
                quantity: Number(item.cart_quantity),
            }));
            break;
        }

        default:
            throw new Error("Unsupported metadata type");
    }
    const order_amount_minor = rawItems.reduce(
        (sum, { price, quantity }) => sum + Math.round(price * 100) * quantity,
        0
    );

    const order_amount = order_amount_minor / 100;
    delete metadata.type_data;
    return {
        ...metadata,
        order_amount,          // major unit (e.g. SEK 499.00)
        order_amount_minor,    // minor unit (e.g. 49900, for Stripe)
        type_ids: JSON.stringify(type_ids),
    };
};

const SUCCESS_URL = `${APP_URL}api/payments/stripe/success?session_id={CHECKOUT_SESSION_ID}`;
const CANCEL_URL = `${APP_URL}api/payments/stripe/cancel?session_id={CHECKOUT_SESSION_ID}`;

export const createStripeSession = async ({ payment_id, currency, metadata }) => {
    if (!metadata?.order_amount) {
        throw new Error("Missing order amount in metadata");
    }

    const amountInCents = Math.round(Number(metadata.order_amount) * 100);

    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
            {
                price_data: {
                    currency,
                    unit_amount: amountInCents,
                    product_data: {
                        name: metadata.product_name || "Zynq Payment",
                        description: metadata.description || "Checkout via Zynq",
                    },
                },
                quantity: 1,
            },
        ],

        payment_intent_data: {
            // amount: amountInCents,
            // currency,
            metadata: {
                ...metadata,
                payment_id,
            },
        },

        success_url: SUCCESS_URL,
        cancel_url: CANCEL_URL,

        client_reference_id: metadata?.user_id?.toString(),
    });

    // console.log(session);
    return session;
};

export const stripeSuccessHandler = async (req, res) => {
    const session_id = req.query.session_id;
    console.log("stripeSuccessHandler", session_id);
    return
};