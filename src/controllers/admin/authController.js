import Joi from "joi";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

import * as apiModels from "../../models/api.js";
import * as adminModels from "../../models/admin.js";
import { sendEmail } from "../../services/send_email.js";
import { generateAccessTokenAdmin, generateAccessTokenVerifyAdmin } from "../../utils/user_helper.js";
import { handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const image_logo = process.env.LOGO_URL

export const login = async (req, res) => {
    try {
        const loginSchema = Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().required(),
            fcm_token: Joi.string().optional().allow('', null)
        });

        const { error, value } = loginSchema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { email, password, fcm_token } = value;

        const [user] = await adminModels.findEmail(email);
        if (!user) return handleError(res, 404, "en", "User not found or invalid email.");

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return handleError(res, 404, "en", "Incorrect password.");

        const token = generateAccessTokenAdmin({ id: user.admin_id });
        await adminModels.updateData(user.admin_id, token, fcm_token);

        return handleSuccess(res, 200, "en", "Login successful.", {
            token,
            user: {
                id: user.admin_id,
                name: user.full_name,
                email: user.email,
                phone: user.mobile_number,
                profile_image: process.env.APP_URL + user.profile_image
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR " + error.message);
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const forgetSchema = Joi.object({
            email: Joi.string().email().required()
        });

        const { error, value } = forgetSchema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { email } = value;

        const [user] = await adminModels.findEmail(email);
        if (!user) return handleError(res, 404, "en", "No account found with this email address.");

        const token = generateAccessTokenAdmin({ id: user.admin_id });
        await adminModels.updateData(user.admin_id, token, user.fcm_token);

        const resetLink = `${process.env.LOCAL_APP_URL}admin/reset-password/${token}`;
        const html = await ejs.renderFile(path.join(__dirname, "../../views/ZYNQ_all_mail-template/forgot-password.ejs"), { image_logo, resetLink });

        await sendEmail({
            to: email,
            subject: "Password Reset Request",
            html,
        });

        return handleSuccess(res, 200, "en", "A password reset link has been sent to your email.");
    } catch (error) {
        console.error(error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const renderResetPasswordPage = async (req, res) => {
    const forgetSchema = Joi.object({
        token: Joi.string().required()
    });

    const { error, value } = forgetSchema.validate(req.params);
    if (error) return joiErrorHandle(res, error);

    const { token } = value;

    const decoded = generateAccessTokenVerifyAdmin(token);
    if (!decoded || !decoded.id) return res.status(400).render("errorPage.ejs", { message: "Invalid or expired reset token." });

    const user = await adminModels.findById(decoded.id);
    if (!user) return res.status(404).render("errorPage.ejs", { message: "User not found or token is invalid." });

    res.render("Zynq-forgot-password/forgot-password-zynq.ejs");
};

export const resetPassword = async (req, res) => {
    const forgetSchema = Joi.object({
        token: Joi.string().required(),
        new_password: Joi.string().min(6).required(),
        confirm_password: Joi.string().valid(Joi.ref('new_password')).required()
            .messages({ 'any.only': 'Passwords do not match.' })
    });

    const { error, value } = forgetSchema.validate(req.body);
    if (error) return joiErrorHandle(res, error);

    const { token, new_password } = value;

    const decoded = generateAccessTokenVerifyAdmin(token);
    if (!decoded || !decoded.id) return res.status(400).render("errorPage.ejs", { message: "Invalid or expired reset token." });

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await adminModels.updatePassword(decoded.id, hashedPassword)

    res.json({
        message: "Password reset successful. You can now login.",
        redirectUrl: "/admin/success-change"
    });
};

export const successChange = async (req, res) => {
    res.render("success_reset/admin_en.ejs");
};

export const profile = async (req, res) => {
    try {
        const user = req.admin;
        if (user) {
            user.profile_image = user.profile_image == null ? null : process.env.APP_URL + user.profile_image;
            return handleSuccess(res, 200, "en", "Admin profile fetched successfully", user);
        } else {
            return handleError(res, 404, "en", "Admin not found");
        }
    } catch (error) {
        console.error("Update profile error:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const updateProfile = async (req, res) => {
    try {
        const schema = Joi.object({
            email: Joi.string().email().required(),
            full_name: Joi.string().min(2).required(),
            mobile_number: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const admin = req.admin;
        if (!admin) return handleError(res, 401, "en", "Unauthorized");

        const profileImage = req.file ? req.file.filename : admin.profile_image;

        const updateData = {
            ...value,
            profile_image: profileImage
        };

        await adminModels.updateProfile(admin.admin_id, updateData);

        return handleSuccess(res, 200, "en", "Profile updated successfully");
    } catch (error) {
        console.error("Update profile error:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const changePassword = async (req, res) => {
    try {
        const schema = Joi.object({
            current_password: Joi.string().required(),
            new_password: Joi.string().min(6).required(),
            confirm_password: Joi.string().valid(Joi.ref('new_password')).required()
                .messages({ 'any.only': 'Passwords do not match.' })
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { current_password, new_password } = value;

        const admin = req.admin;
        if (!admin) return handleError(res, 401, "en", "Unauthorized");

        const [user] = await adminModels.findById(admin.admin_id);
        if (!user) return handleError(res, 404, "en", "User not found");

        const isMatch = await bcrypt.compare(current_password, user.password);
        if (!isMatch) return handleError(res, 400, "en", "Incorrect current password");

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await adminModels.updatePassword(admin.admin_id, hashedPassword);

        return handleSuccess(res, 200, "en", "Password changed successfully");
    } catch (error) {
        console.error("Change password error:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const login_with_mobile = async (req, res) => {
    try {
        const sendOtpSchema = Joi.object({
            mobile_number: Joi.string().required(),
            language: Joi.string().valid('sv', 'en').optional().allow("", null),
        });

        const { error, value } = sendOtpSchema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { mobile_number, language } = value;
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        let [user] = await apiModels.get_user_by_mobile_number(mobile_number);

        if (!user) {
            await apiModels.create_user(mobile_number, otp, language);
            [user] = await apiModels.get_user_by_mobile_number(mobile_number);
        }

        if (user && !user.is_active) {
            return handleError(res, 400, language, 'ADMIN_DEACTIVATION');
        }

        let user_data = {
            otp, language
        }

        await apiModels.update_user(user_data, user.user_id);
        return handleSuccess(res, 200, language, "VERIFICATION_OTP", otp);
    } catch (error) {
        console.error("internal E", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};