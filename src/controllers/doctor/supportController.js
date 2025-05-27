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
import * as doctorModels from "../../models/doctor.js";
import { sendEmail } from "../../services/send_email.js";
import { handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import { generateAccessToken, generatePassword, generateVerificationLink } from "../../utils/user_helper.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config();

const APP_URL = process.env.APP_URL;
const image_logo = process.env.LOGO_URL;


export const get_issue_categories = async (req, res) => {
    try {
        const issueCategories = await clinicModels.get_issue_categories();
        return handleSuccess(res, 200, "en", "ISSUE_CATEGORIES_FETCHED_SUCCESSFULLY", issueCategories);
    } catch (error) {
        console.error("Error in get_issue_categories:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
}

export const create_support_ticket = async (req, res) => {
    try {
        const schema = Joi.object({
            issue_category_id: Joi.string().required(),
            issue_title: Joi.string().required(),
            issue_description: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);
        const { issue_category_id, issue_title, issue_description } = value;

        const [doctor] = await doctorModels.get_doctor_by_zynq_user_id(req.user.id);
        if (!doctor) return handleError(res, 404, "en", "DOCTOR_NOT_FOUND");

        const supportTicketData = {
            doctor_id: doctor.doctor_id,
            issue_category_id: issue_category_id,
            issue_title: issue_title,
            issue_description: issue_description,
        };

        await doctorModels.insertSupportTicket(supportTicketData);
        return handleSuccess(res, 201, "en", "SUPPORT_TICKET_CREATED_SUCCESSFULLY");
    } catch (error) {
        console.error("Error in create_support_ticket:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
}

export const get_support_tickets_by_doctor_id = async (req, res) => {
    try {

        const doctor_id = req.user.doctorData.doctor_id;
        const supportTickets = await doctorModels.get_support_tickets_by_doctor_id(doctor_id);
        return handleSuccess(res, 200, "en", "SUPPORT_TICKETS_FETCHED_SUCCESSFULLY", supportTickets);
    } catch (error) {
        console.error("Error in get_support_tickets_by_doctor_id:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
}
