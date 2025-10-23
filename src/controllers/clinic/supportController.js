import Joi from "joi";
import ejs from 'ejs';
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken"
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import * as clinicModels from "../../models/clinic.js";
import * as adminModels from "../../models/admin.js";
import * as webModels from "../../models/web_user.js";
import { sendEmail } from "../../services/send_email.js";
import { handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import { generateAccessToken, generatePassword, generateVerificationLink, generateSupportTicketId } from "../../utils/user_helper.js";
import { NOTIFICATION_MESSAGES, sendNotification } from "../../services/notifications.service.js";
import { supportTicketTemplateEnglish, supportTicketTemplateSwedish } from "../../utils/templates.js";
import configs from "../../config/config.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config();

const APP_URL = process.env.APP_URL;
const image_logo = process.env.LOGO_URL;


export const create_support_ticket = async (req, res) => {
    try {
        const schema = Joi.object({
            issue_title: Joi.string().required(),
            issue_description: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);
        const { issue_title, issue_description } = value;

        const [clinic] = await clinicModels.get_clinic_by_zynq_user_id(req.user.id);
        if (!clinic) return handleError(res, 404, "en", "CLINIC_NOT_FOUND");

        const supportTicketId = generateSupportTicketId();
        const supportTicketData = {
            clinic_id: clinic.clinic_id,
            issue_title: issue_title,
            issue_description: issue_description,
            ticket_id: supportTicketId,
        };

        const data = {
            ticketId: supportTicketId,
            userName: req?.user?.name || "User",
            userEmail: req?.user?.email || "",
            subject: issue_title,
            description: issue_description,
        }
       
        const emailTemplate = req?.user?.language === "sv" ? supportTicketTemplateSwedish : supportTicketTemplateEnglish
         
        const { subject, body } = emailTemplate(data)
        
        await sendEmail({
            to: configs.legalTeamMail,
            subject: subject,
            html: body
        })

        await clinicModels.insertSupportTicket(supportTicketData);
        return handleSuccess(res, 201, "en", "SUPPORT_TICKET_CREATED_SUCCESSFULLY");
    } catch (error) {
        console.error("Error in create_support_ticket:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
}

export const get_support_tickets_by_clinic_id = async (req, res) => {
    try {
        const clinic_id = req.user.clinicData.clinic_id;
        const supportTickets = await clinicModels.get_support_tickets_by_clinic_id(clinic_id);
        return handleSuccess(res, 200, "en", "SUPPORT_TICKETS_FETCHED_SUCCESSFULLY", supportTickets);
    } catch (error) {
        console.error("Error in get_support_tickets_by_clinic_id:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
}

export const get_support_tickets_by_doctor_id_to_clinic = async (req, res) => {
    try {
        const clinic_id = req.user.clinicData.clinic_id;
        const supportTickets = await clinicModels.get_support_tickets_by_doctor_id_to_clinic(clinic_id);
        let finalData = [];
        for (let ticket of supportTickets) {
            const [doctor] = await adminModels.get_doctor_by_id(ticket.doctor_id);
            finalData.push({
                ...ticket,
                doctor: doctor,
            });
        }
        return handleSuccess(res, 200, "en", "SUPPORT_TICKETS_FETCHED_SUCCESSFULLY", finalData);
    } catch (error) {
        console.error("Error in get_support_tickets_by_clinic_id:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
}

export const send_response_to_doctor = async (req, res) => {
    try {
        const schema = Joi.object({
            support_ticket_id: Joi.string().required(),
            response: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);
        const { response, support_ticket_id } = value;

        const [ticket] = await clinicModels.get_issue_by_id(support_ticket_id);
        if (!ticket) return handleError(res, 404, "en", "SUPPORT_TICKET_NOT_FOUND");

        await sendNotification({
            userData: req.user,
            type : "TICKET",
            type_id : support_ticket_id,
            notification_type : NOTIFICATION_MESSAGES.support_ticket_response,
            receiver_id : ticket.doctor_id,
            receiver_type : "DOCTOR"
        })

        await clinicModels.send_ticket_response(response, support_ticket_id);
        
        return handleSuccess(res, 201, "en", "RESPONSE_SENT_SUCCESSFULLY");
    } catch (error) {
        console.error("Error in send_response_to_doctor:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
}

