import Joi from "joi";
import ejs from 'ejs';
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken"
import * as webModels from "../../models/web_user.js";
import * as clinicModels from "../../models/clinic.js";
import { handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import { fileURLToPath } from "url";
import { sendEmail } from "../../services/send_email.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const APP_URL = process.env.APP_URL;
const image_logo = process.env.LOGO_URL;
const WEB_JWT_SECRET = process.env.WEB_JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY;


export const login_web_user = async (req, res) => {
    try {
        const schema = Joi.object({
            email: Joi.string().min(5).max(255).email({ tlds: { allow: false } }).lowercase().required(),
            password: Joi.string().min(8).max(15).required(),
            fcm_token: Joi.string().optional().allow("", null)
        });

        let language = 'en';

        const { error, value } = schema.validate(req.body);

        if (error) return joiErrorHandle(res, error);

        const { email, password, fcm_token } = value;

        const [existingWebUser] = await webModels.get_web_user_by_email(email);
        if (!existingWebUser) {
            return handleError(res, 400, language, "CLINIC_NOT_FOUND");
        }
        language = existingWebUser.language;

        const isPasswordValid = await bcrypt.compare(password, existingWebUser.password);
        if (!isPasswordValid) {
            return handleError(res, 400, language, "INVALID_EMAIL_PASSWORD");
        }

        const token = jwt.sign({ web_user_id: existingWebUser.id, email: existingWebUser.email, role: existingWebUser.role_name }, WEB_JWT_SECRET, {
            expiresIn: JWT_EXPIRY
        });

        await webModels.update_jwt_token(token, existingWebUser.id);
        const [user_data] = await webModels.get_web_user_by_id(existingWebUser.id);
        const [get_clinic] = await clinicModels.get_clinic_by_zynq_user_id(existingWebUser.id);
        if (get_clinic) {
            const form_stage = get_clinic.form_stage;
            user_data.form_stage = form_stage;
            user_data.is_onboarded = get_clinic.is_onboarded;
        }

        return handleSuccess(res, 200, language, "LOGIN_SUCCESSFUL", user_data);
    } catch (error) {
        console.error(error);
        return handleError(res, 500, error.message);
    }
};

export const forgot_password = async (req, res) => {
    try {
        const schema = Joi.object({
            email: Joi.string().email().required()
        });

        let language = 'en';

        const { error, value } = schema.validate(req.body);
        if (error) {
            return joiErrorHandle(res, error);
        }

        const { email } = value;

        const [webUser] = await webModels.get_web_user_by_email(email);
        if (!webUser) {
            return handleError(res, 404, language, "USER_NOT_FOUND");
        }

        language = webUser.language;

        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        await webModels.update_reset_token(resetToken, resetTokenExpiry, email);

        const resetLink = `${APP_URL}webuser/reset-password?token=${resetToken}`;
        let emailTemplatePath;
        if (language === "sv") {
            emailTemplatePath = path.resolve(__dirname, "../../views/forgot_password/sv.ejs");
        } else {
            emailTemplatePath = path.resolve(__dirname, "../../views/forgot_password/en.ejs");
        }

        const emailHtml = await ejs.renderFile(emailTemplatePath, {
            resetLink,
            image_logo
        });

        const emailOptions = {
            to: email,
            subject: "Password Reset Request",
            html: emailHtml
        };

        await sendEmail(emailOptions);
        return handleSuccess(res, 200, language, "RESET_PASSWORD_EMAIL_SENT");

    } catch (error) {
        console.error(error);
        return handleError(res, 500, error.message);
    }
};

export const render_forgot_password_page = (req, res) => {
    try {
        return res.render("reset_password/en.ejs");
    } catch (error) {
        return handleError(res, 500, error.message)
    }
};

export const reset_password = async (req, res) => {
    try {
        const resetPasswordSchema = Joi.object({
            token: Joi.string().required(),
            newPassword: Joi.string().min(8).required().messages({
                "string.min": "Password must be at least 8 characters long",
                "any.required": "New password is required",
            }),
        });

        const { error, value } = resetPasswordSchema.validate(req.body);
        if (error) {
            return handleError(res, 400, error.details[0].message);
        }

        const { token, newPassword } = value;

        // Get user by reset token
        const [webUser] = await webModels.get_web_user_by_reset_token(token);
        if (!webUser) {
            return handleError(res, 400, webUser.language, "INVALID_EXPIRED_TOKEN");
        }

        // Check if new password matches current password
        if (webUser.show_password === newPassword) {
            return handleError(res, 400, webUser.language, "PASSWORD_CAN_NOT_SAME");
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and clear reset token
        const updateResult = await webModels.update_web_user_password(
            hashedPassword,
            newPassword,
            null, // reset token
            null, // reset token expiry
            webUser.id
        );

        if (updateResult.affectedRows > 0) {
            return handleSuccess(res, 200, webUser.language, "PASSWORD_RESET_SUCCESS");
        } else {
            return handleError(res, 500, webUser.language, "PASSWORD_RESET_FAILED");
        }

    } catch (error) {
        console.error("Error in reset password controller:", error);
        return handleError(res, 500, "en", error.message);
    }
};

export const render_success_reset = (req, res) => {
    return res.render("reset_password/en.ejs")
}
    
export const set_password = async (req, res) => {
    try {
        const schema = Joi.object({
            new_password: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);


        const { new_password } = value;

        const [user] = await webModels.get_web_user_by_id(req.user.id);
        if (!user) return handleError(res, 404, 'en', "USER_NOT_FOUND");


        const hashedPassword = await bcrypt.hash(new_password, 10);

        await webModels.update_web_user_password_set(hashedPassword, new_password, user.id);

        return handleSuccess(res, 200, 'en', "PASSWORD_SET_SUCCESSFULLY");

    } catch (error) {
        console.error("Error setting password:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const change_password = async (req, res) => {
    try {
        const schema = Joi.object({
            current_password: Joi.string().required(),
            new_password: Joi.string().required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { current_password, new_password } = value;

        const [user] = await webModels.get_web_user_by_id(req.user.id);
        if (!user) return handleError(res, 404, 'en', "USER_NOT_FOUND");

        const isPasswordValid = await bcrypt.compare(current_password, user.password);
        if (!isPasswordValid) return handleError(res, 400, 'en', "PASSWORD_INCORRECT");

        const hashedPassword = await bcrypt.hash(new_password, 10);

        await webModels.update_web_user_password_set(hashedPassword, new_password, user.id);

        return handleSuccess(res, 200, 'en', "PASSWORD_CHANGED_SUCCESSFULLY");

    } catch (error) {
        console.error("Error changing password:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};


