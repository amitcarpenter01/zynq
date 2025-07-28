import { insertPayment } from "../../models/payment.js";
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

export const initiatePayment = asyncHandler(async (req, res) => {
    let {
        doctor_id = null,
        clinic_id = null,
        payment_gateway,
        currency,
        metadata,
    } = req.body;
    const { user_id, language = "en" } = req.user;

    const payment_id = uuidv4();
    let session;

    switch (payment_gateway) {
        case "KLARNA":
            metadata = await processKlarnaMetadata(metadata, doctor_id, clinic_id);
            session = await createKlarnaSession({ payment_id: payment_id, currency: currency, metadata: metadata, });
            break;

        case "SWISH":
            break;

        default:
            break;
    }

    await insertPayment(
        payment_id,
        user_id,
        doctor_id,
        clinic_id,
        payment_gateway, // provider
        metadata.order_amount,
        currency,
        session.session_id, // provider_reference_id
        session.client_token,
        metadata
    );

    return handleSuccess(
        res,
        200,
        language,
        "PAYMENT_INITIATED_SUCCESSFULLY",
        session
    );
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
