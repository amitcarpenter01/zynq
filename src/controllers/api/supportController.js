import Joi from "joi";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import * as apiModels from "../../models/api.js";
import { handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config();


export const create_support_ticket = async (req, res) => {
    try {
        const schema = Joi.object({
            issue_title: Joi.string().required(),
            issue_description: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);
        const { issue_title, issue_description } = value;

        const supportTicketData = {
            user_id: req.user.user_id,
            issue_title: issue_title,
            issue_description: issue_description,
        };

        await apiModels.insert_support_ticket(supportTicketData);
        return handleSuccess(res, 201, "en", "SUPPORT_TICKET_CREATED_SUCCESSFULLY");
    } catch (error) {
        console.error("Error in create_support_ticket:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
}

export const get_support_tickets = async (req, res) => {
    try {
        const [user] = await apiModels.get_user_by_user_id(req.user.user_id);
        if (!user) return handleError(res, 404, "en", "USER_NOT_FOUND");
        const supportTickets = await apiModels.get_support_tickets_by_user_id(user.user_id);
        return handleSuccess(res, 200, "en", "SUPPORT_TICKETS_FETCHED_SUCCESSFULLY", supportTickets);
    } catch (error) {
        console.error("Error in get_support_tickets:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
}
