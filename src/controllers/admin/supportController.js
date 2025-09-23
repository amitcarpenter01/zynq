import Joi from "joi";
import ejs from 'ejs';
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken"
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import * as adminModels from "../../models/admin.js";
import { handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import { NOTIFICATION_MESSAGES, sendNotification } from "../../services/notifications.service.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config();

const APP_URL = process.env.APP_URL;
const image_logo = process.env.LOGO_URL;


export const get_all_support_tickets = async (req, res) => {
    try {
        const supportTickets = await adminModels.get_all_support_tickets();
        let finalData = [];
        for (let ticket of supportTickets) {
            const [clinic] = await adminModels.get_clinic_by_id(ticket.clinic_id);
            const [doctor] = await adminModels.get_doctor_by_id(ticket.doctor_id);
            const [user] = await adminModels.get_user_by_id(ticket.user_id);

            if (clinic && clinic.clinic_logo) {
                clinic.clinic_logo = `${APP_URL}clinics/logo/${clinic.clinic_logo}`;
            }

            if (doctor && doctor.profile_image) {
                doctor.profile_image = `${APP_URL}doctors/profile_images/${doctor.profile_image}`;
            }

            if (user && user.profile_image) {
                user.profile_image = `${APP_URL}${user.profile_image}`;
            }

            finalData.push({
                ...ticket,
                clinic: clinic,
                doctor: doctor,
                user: user,
            });
        }
        return handleSuccess(res, 200, "en", "SUPPORT_TICKETS_FETCHED_SUCCESSFULLY", finalData);
    } catch (error) {
        console.error("Error in get_all_support_tickets:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
}

export const admin_response_to_support_ticket = async (req, res) => {
    try {
        const schema = Joi.object({
            support_ticket_id: Joi.string().required(),
            response: Joi.string().required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);
        const { support_ticket_id, response } = value;
        const [ticket] = await adminModels.get_support_ticket_by_id_v2(support_ticket_id);

        if (!ticket) return handleError(res, 404, "en", "SUPPORT_TICKET_NOT_FOUND");

        const receiver_type = ticket?.user_id
            ? "USER"
            : ticket?.role === "SOLO_DOCTOR"
                ? "SOLO_DOCTOR"
                : ticket?.doctor_id
                    ? "DOCTOR"
                    : ticket?.clinic_id
                        ? "CLINIC"
                        : null;

        const receiver_id = ticket?.user_id
            || (ticket?.role === "SOLO_DOCTOR" && ticket.doctor_id)
            || ticket?.doctor_id
            || ticket?.clinic_id
            || null;

        await Promise.all([
            sendNotification({
                userData: req.user,
                type: "TICKET",
                type_id: support_ticket_id,
                notification_type: NOTIFICATION_MESSAGES.support_ticket_response,
                receiver_id: receiver_id,
                receiver_type: receiver_type,
            }),
            adminModels.update_support_ticket(support_ticket_id, { response })
        ])

        return handleSuccess(res, 200, "en", "RESPONSE_SENT_SUCCESSFULLY");
    } catch (error) {
        console.error("Error in admin_response_to_support_ticket:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
}