import Joi from "joi";
import ejs from 'ejs';
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken"
import * as apiModels from "../../models/api.js";
import { sendEmail } from "../../services/send_email.js";
import { generateAccessToken, generateVerificationLink } from "../../utils/user_helper.js";
import { handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import twilio from 'twilio';


dotenv.config();

const APP_URL = process.env.APP_URL;
const image_logo = process.env.LOGO_URL;


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

export const login_with_otp = async (req, res) => {
    try {
        const loginOtpSchema = Joi.object({
            mobile_number: Joi.string().required(),
            otp: Joi.string().length(4).required(),
            language: Joi.string().valid("en", "sv").optional().allow("", null),
        });

        const { error, value } = loginOtpSchema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { mobile_number, otp, language } = value;

        let [user] = await apiModels.get_user_by_mobile_number(mobile_number);

        if (!user) {
            return handleError(res, 404, language, "USER_NOT_FOUND");
        }

        if (user.otp !== otp) {
            return handleError(res, 400, language, "INVALID_OTP");
        }

        const payload = { user_id: user.user_id, mobile_number: user.mobile_number };
        const token = generateAccessToken(payload);

        let user_data = {
            otp, jwt_token: token, otp: "", is_verified: true
        }
        await apiModels.update_user(user_data, user.user_id)
        return handleSuccess(res, 200, language, "LOGIN_SUCCESSFUL", token);
    } catch (error) {
        console.log(error.message);

        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};


const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTHTOKEN;
const verifyServiceSid = process.env.VERIFY_SERVICE_SID;


const client = twilio(accountSid, authToken);

// export const login_with_mobile = async (req, res) => {
//     try {
//         const sendOtpSchema = Joi.object({
//             mobile_number: Joi.string().required(),
//             language: Joi.string().valid('sv', 'en').optional().allow("", null),
//         });

//         const { error, value } = sendOtpSchema.validate(req.body);
//         if (error) return joiErrorHandle(res, error);

//         const { mobile_number, language } = value;
//         const otp = Math.floor(1000 + Math.random() * 9000).toString();

//         let [user] = await apiModels.get_user_by_mobile_number(mobile_number);

//         if (!user) {
//             await apiModels.create_user(mobile_number, otp, language);
//             [user] = await apiModels.get_user_by_mobile_number(mobile_number);
//         }

//         if (user && !user.is_active) {
//             return handleError(res, 400, language || 'en', 'ADMIN_DEACTIVATION');
//         }

//         const user_data = { otp, language };
//         await apiModels.update_user(user_data, user.user_id);

//         const verification = await client.verify.v2.services(verifyServiceSid)
//             .verifications
//             .create({
//                 to: mobile_number,
//                 channel: 'sms',
//             });

//         return handleSuccess(res, 200, language || 'en', "VERIFICATION_OTP", { otp, sid: verification.sid });

//     } catch (error) {
//         console.error("Internal error:", error);
//         return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
//     }
// };


// export const login_with_otp = async (req, res) => {
//     try {
//         const loginOtpSchema = Joi.object({
//             mobile_number: Joi.string().required(),
//             otp: Joi.string().length(4).required(),
//             language: Joi.string().valid("en", "sv").optional().allow("", null),
//         });

//         const { error, value } = loginOtpSchema.validate(req.body);
//         if (error) return joiErrorHandle(res, error);

//         const { mobile_number, otp, language } = value;
//         console.log('value>>>>>>>>>>>>>.', value);

//         const [user] = await apiModels.get_user_by_mobile_number(mobile_number);
//         if (!user) {
//             return handleError(res, 404, language || 'en', "USER_NOT_FOUND");
//         }

//         // ✅ Verify OTP with Twilio
//         const verificationCheck = await client.verify.v2.services(verifyServiceSid)
//             .verificationChecks
//             .create({ to: mobile_number, code: otp });

//         if (verificationCheck.status !== "approved") {
//             return handleError(res, 400, language || 'en', "INVALID_OTP");
//         }

//         const payload = { user_id: user.user_id, mobile_number: user.mobile_number };
//         const token = generateAccessToken(payload);

//         const user_data = {
//             jwt_token: token,
//             otp: "",
//             is_verified: true,
//         };

//         await apiModels.update_user(user_data, user.user_id);

//         return handleSuccess(res, 200, language || 'en', "LOGIN_SUCCESSFUL", token);

//     } catch (error) {
//         console.error("Login OTP verification error:", error);
//         return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
//     }
// };

export const getProfile = async (req, res) => {
    try {
        const user = req.user;
        const language = req.user?.language;
        if (user.profile_image && !user.profile_image.startsWith("http")) {
            user.profile_image = `${APP_URL}${user.profile_image}`;
        }
        return handleSuccess(res, 200, language, "USER_PROFILE", user);
    } catch (error) {
        return handleError(res, 500, 'en', error.message)
    }
};

export const updateProfile = async (req, res) => {
    try {
        const updateProfileSchema = Joi.object({
            full_name: Joi.string().optional().allow("", null),
            gender: Joi.string().valid("Male", "Female", "Other").optional().allow("", null),
            age: Joi.number().optional().allow("", null),
            is_push_notification_on: Joi.boolean().optional().allow("", null),
            is_location_on: Joi.boolean().optional().allow("", null),
            fcm_token: Joi.string().optional().allow("", null),
            latitude: Joi.number().optional().allow(null),
            longitude: Joi.number().optional().allow(null),
            language: Joi.string().optional().allow("", null),

        });

        const { error, value } = updateProfileSchema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const user = req.user;
        const language = value.language ?? user?.language;

        const full_name = value.full_name ?? user.full_name;
        const gender = value.gender ?? user.gender;
        const age = value.age ?? user.age;
        const is_push_notification_on = (value.is_push_notification_on !== undefined && value.is_push_notification_on !== null)
            ? value.is_push_notification_on
            : user.is_push_notification_on;

        const is_location_on = (value.is_location_on !== undefined && value.is_location_on !== null)
            ? value.is_location_on
            : user.is_location_on;

        const fcm_token = value.fcm_token ?? user.fcm_token;
        const latitude = value.latitude ?? user.latitude;
        const longitude = value.longitude ?? user.longitude;


        let profile_image = user.profile_image;
        // if (req.file) {
        //     profile_image = (req.file).location;
        // }
        if (req.file && req.file.filename) {
            profile_image = req.file.filename;
        }


        const user_data = {
            profile_image,
            age,
            full_name,
            gender,
            fcm_token,
            is_push_notification_on,
            is_location_on,
            latitude,
            longitude,
            language
        };

        console.log(user_data, "user_data");

        await apiModels.update_user(user_data, user.user_id);

        return handleSuccess(res, 200, language, "PROFILE_UPDATED");

    } catch (error) {
        console.log(error.message);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const deleteAccount = async (req, res) => {
    try {
        const { user_id, language } = req.user;
        const [user] = await apiModels.get_user_by_user_id(user_id)

        if (!user) return handleError(res, 404, language, "USER_NOT_FOUND");
        await apiModels.delete_user(user_id)

        return handleSuccess(res, 200, language, "ACOUNT_DELETED");
    } catch (error) {
        console.log(error.message);

        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const render_terms_and_condition = (req, res) => {
    try {
        const schema = Joi.object({
            language: Joi.string().valid('en', 'sv').required()
        })
        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);
        const { language = 'en' } = value
        if (language == 'en') {
            return res.render("terms_and_condition_en.ejs");

        }
        if (language == 'sv') {
            return res.render("terms_and_condition_sv.ejs");
        }
    } catch (error) {
        console.error("Error rendering forgot password page:", error);
        return handleError(res, 500, "An error occurred while rendering the page")
    }
};

export const render_privacy_policy = (req, res) => {
    try {
        const schema = Joi.object({
            language: Joi.string().valid('en', 'sv').required()
        })
        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);
        const { language = 'en' } = value

        if (language == 'en') {
            return res.render("privacy_and_policy_en.ejs");

        }
        if (language == 'sv') {
            return res.render("privacy_and_policy_sv.ejs");
        }
    } catch (error) {
        console.error("Error rendering forgot password page:", error);
        return handleError(res, 500, "An error occurred while rendering the page")
    }
};
//==================================================================================================

export const register_with_email = async (req, res) => {
    try {
        const registerSchema = Joi.object({
            full_name: Joi.string().required(),
            email: Joi.string().required(),
            mobile_number: Joi.string().required(),
            password: Joi.string().min(8).required(),
            is_push_notification_on: Joi.boolean().required(),
        });
        const { error, value } = registerSchema.validate(req.body);
        if (error) return joiErrorHandle(res, error);
        const { full_name, password, email, is_push_notification_on, mobile_number } = value;
        let lower_email = email.toLowerCase();
        const userRepository = getRepository(User);

        const existEmail = await userRepository.findOne({ where: { email: lower_email } });
        if (existEmail) {
            return handleError(res, 400, "Email already exists.");
        }

        const existMobile = await userRepository.findOne({ where: { mobile_number: mobile_number } });
        if (existMobile) {
            return handleError(res, 400, "Mobile Number Already Exists.");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verifyToken = crypto.randomBytes(32).toString('hex');
        const verifyTokenExpiry = new Date(Date.now() + 3600000);

        const newUser = userRepository.create({
            full_name: full_name,
            mobile_number: mobile_number,
            email: lower_email,
            password: hashedPassword,
            show_password: password,
            verify_token: verifyToken,
            verify_token_expiry: verifyTokenExpiry,
            is_push_notification_on: is_push_notification_on,
        });

        const baseUrl = req.protocol + '://' + req.get('host');
        const verificationLink = generateVerificationLink(verifyToken, baseUrl);
        const emailTemplatePath = path.resolve(__dirname, '../../views/verifyAccount.ejs');
        const emailHtml = await ejs.renderFile(emailTemplatePath, { verificationLink, image_logo });

        const emailOptions = {
            to: lower_email,
            subject: "Verify Your Email Address",
            html: emailHtml,
        };

        await sendEmail(emailOptions);

        await userRepository.save(newUser);
        return handleSuccess(res, 201, `Verification link sent successfully to your email (${lower_email}). Please verify your account.`);
    } catch (error) {
        console.error('Error in register:', error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};