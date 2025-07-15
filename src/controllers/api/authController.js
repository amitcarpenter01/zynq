import Joi from "joi";
import ejs from 'ejs';
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken"
import * as apiModels from "../../models/api.js";
import * as webModels from "../../models/web_user.js";
import { sendEmail } from "../../services/send_email.js";
import { generateAccessToken, generateVerificationLink } from "../../utils/user_helper.js";
import { handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import twilio from 'twilio';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config();

const APP_URL = process.env.APP_URL;
const image_logo = process.env.LOGO_URL;

import * as doctorModels from "../../models/doctor.js";

// -------------------------------------slot managment------------------------------------------------//
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';
import pkg from 'rrule';
const { RRule } = pkg;
dayjs.extend(utc);
dayjs.extend(isSameOrBefore);

export const weekdayMap = {
    sunday: RRule.SU,
    monday: RRule.MO,
    tuesday: RRule.TU,
    wednesday: RRule.WE,
    thursday: RRule.TH,
    friday: RRule.FR,
    saturday: RRule.SA,
};

// export function generateSlots(startTime, endTime, duration, date) {
//     const slots = [];

//     let current = dayjs.utc(`${date} ${startTime}`);
//     const end = dayjs.utc(`${date} ${endTime}`);

//     while (current.add(duration, 'minute').isSameOrBefore(end)) {
//         const slotStart = current;
//         const slotEnd = current.add(duration, 'minute');

//         slots.push({
//             start_time: slotStart.toISOString(),
//             end_time: slotEnd.toISOString(),
//         });
//         current = slotEnd;
//     }
//     return slots;
// }

export function generateSlots(startTime, endTime, duration, date) {
    const slots = [];

    let current = dayjs.utc(`${date} ${startTime}`);
    const end = dayjs.utc(`${date} ${endTime}`);

    while (current.add(duration, 'minute').isSameOrBefore(end)) {
        const slotStart = current;
        const slotEnd = current.add(duration, 'minute');

        slots.push({
            start_time: slotStart.toISOString(),  // ✅ Proper ISO format
            end_time: slotEnd.toISOString(),
        });

        current = slotEnd;
    }

    return slots;
}



// ------------------------------------slot end------------------------------------------------//


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
//             return handleError(res, 400, language, 'ADMIN_DEACTIVATION');
//         }

//         let user_data = {
//             otp, language
//         }

//         await apiModels.update_user(user_data, user.user_id);
//         return handleSuccess(res, 200, language, "VERIFICATION_OTP", otp);
//     } catch (error) {
//         console.error("internal E", error);
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

//         let [user] = await apiModels.get_user_by_mobile_number(mobile_number);

//         if (!user) {
//             return handleError(res, 404, language, "USER_NOT_FOUND");
//         }

//         if (user.otp !== otp) {
//             return handleError(res, 400, language, "INVALID_OTP");
//         }

//         const payload = { user_id: user.user_id, mobile_number: user.mobile_number };
//         const token = generateAccessToken(payload);

//         let user_data = {
//             otp, jwt_token: token, otp: "", is_verified: true
//         }
//         await apiModels.update_user(user_data, user.user_id)
//         return handleSuccess(res, 200, language, "LOGIN_SUCCESSFUL", token);
//     } catch (error) {
//         console.log(error.message);

//         return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
//     }
// };


const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTHTOKEN;
const verifyServiceSid = process.env.VERIFY_SERVICE_SID;


const client = twilio(accountSid, authToken);

export const login_with_mobile = async (req, res) => {
    let language = req.body.language || 'en';
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
            return handleError(res, 400, language || 'en', 'ADMIN_DEACTIVATION');
        }

        const user_data = { otp, language };
        await apiModels.update_user(user_data, user.user_id);

        const verification = await client.verify.v2.services(verifyServiceSid)
            .verifications
            .create({
                to: mobile_number,
                channel: 'sms',
            });

        return handleSuccess(res, 200, language || 'en', "VERIFICATION_OTP", { otp, sid: verification.sid });

    } catch (error) {
         if (error.code === 60203) {
            return handleError(res, 400, language, "MAX_OTP_ATTEMPTS_REACHED");
        }
          if (error.code === 60410) {
            return handleError(res, 400, language, "PHONE_NUMBER_BLOCKED_BY_TWILIO");
        }

        console.error("Internal error:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const login_with_otp = async (req, res) => {
    let language = req.body.language || 'en';
    try {
        const loginOtpSchema = Joi.object({
            mobile_number: Joi.string().required(),
            otp: Joi.string().length(4).required(),
            language: Joi.string().valid("en", "sv").optional().allow("", null),
        });

        const { error, value } = loginOtpSchema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { mobile_number, otp, language } = value;
        console.log('value>>>>>>>>>>>>>.', value);

        const [user] = await apiModels.get_user_by_mobile_number(mobile_number);
        if (!user) {
            return handleError(res, 404, language || 'en', "USER_NOT_FOUND");
        }

        // ✅ Verify OTP with Twilio
        const verificationCheck = await client.verify.v2.services(verifyServiceSid)
            .verificationChecks
            .create({ to: mobile_number, code: otp });

        if (verificationCheck.status !== "approved") {
            return handleError(res, 400, language || 'en', "INVALID_OTP");
        }

        const payload = { user_id: user.user_id, mobile_number: user.mobile_number };
        const token = generateAccessToken(payload);

        const user_data = {
            jwt_token: token,
            otp: "",
            is_verified: true,
        };

        await apiModels.update_user(user_data, user.user_id);

        return handleSuccess(res, 200, language || 'en', "LOGIN_SUCCESSFUL", token);

    } catch (error) {
        console.error("Login OTP verification error:", error);

        if (error.code === 20404) {
            return handleError(res, 400, language, "OTP_EXPIRED_OR_INVALID");
        }
        console.error("Login OTP verification error:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

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


export const enroll_user = async (req, res) => {
    try {
        const enrollSchema = Joi.object({
            full_name: Joi.string().required(),
            email: Joi.string().required(),
            mobile_number: Joi.string().required(),
            application_type: Joi.string().valid('android', 'ios', 'both').required(),
            udid: Joi.string().optional().allow("", null),
        });

        const { error, value } = enrollSchema.validate(req.body);
        if (error) return joiErrorHandle(res, error);
        const { email, mobile_number, application_type, udid, full_name } = value;

        const android_app_link = process.env.ANDROID_APP_LINK;
        const ios_app_link = process.env.IOS_APP_LINK;

        const [user] = await apiModels.get_user_by_mobile_number(mobile_number);
        // if (user) {
        //     return handleError(res, 400, 'en', "USER_ALREADY_ENROLLED");
        // }

        const user_data = {
            email,
            application_type,
            mobile_number,
            full_name,
            udid
        }
        await apiModels.enroll_user_data(user_data);

        if (application_type == "android") {
            const emailTemplatePath = await path.resolve(__dirname, '../../views/user_enroll/en.ejs');
            const emailHtml = await ejs.renderFile(emailTemplatePath, { image_logo, email, android_app_link, application_type: "android", full_name, mobile_number });

            const emailOptions = {
                to: email,
                subject: "Enroll Your Account",
                html: emailHtml,
            };
            await sendEmail(emailOptions);
            return handleSuccess(res, 200, 'en', "ENROLL_SUCCESSFUL");
        }

        if (application_type == "ios") {
            const emailTemplatePath = await path.resolve(__dirname, '../../views/user_enroll/en.ejs');
            const emailHtml = await ejs.renderFile(emailTemplatePath, { udid, image_logo, email, ios_app_link, application_type: "ios", full_name, mobile_number });

            const emailOptions = {
                to: email,
                subject: "Enroll Your Account",
                html: emailHtml,
            };
            await sendEmail(emailOptions);
            return handleSuccess(res, 200, 'en', "ENROLL_SUCCESSFUL");
        }

        if (application_type == "both") {
            const emailTemplatePath = await path.resolve(__dirname, '../../views/user_enroll/en.ejs');
            const emailHtml = await ejs.renderFile(emailTemplatePath, { udid, image_logo, email, android_app_link, ios_app_link, application_type: "both", full_name, mobile_number });
            const emailOptions = {
                to: email,
                subject: "Enroll Your Account",
                html: emailHtml,
            };
            await sendEmail(emailOptions);
            return handleSuccess(res, 200, 'en', "ENROLL_SUCCESSFUL");
        }


    } catch (error) {
        console.error('Error in enroll:', error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const create_call_log_user = async (req, res) => {
    const {
        call_id,
        receiver_doctor_id,
        status,
        started_at
    } = req.body;

    const { userData } = req.user;

    console.log('req.user', req.user)

    if (!call_id || !status || !receiver_doctor_id || !started_at) {
        return handleError(res, 400, 'en', "Missing required fields");
    }

    const sender_user_id = req.user?.user_id || req.user?.id;

    console.log('sender_user_id', sender_user_id)

    await webModels.createOrUpdateCallLog({
        call_id,
        sender_user_id,
        sender_doctor_id: null,
        receiver_user_id: null,
        receiver_doctor_id,
        status,
        started_at
    });

    return handleSuccess(res, 200, 'en', "Call log created by user");
};
export const create_call_log_doctor = async (req, res) => {
    try {
        const {
            call_id,
            receiver_user_id,
            status,
            started_at // <-- New field from frontend
        } = req.body;

        const { role_name, doctorData } = req.user;

        if (role_name !== 'DOCTOR') {
            return handleError(res, 403, 'en', "Only doctors can access this endpoint");
        }

        if (!call_id || !status || !receiver_user_id || !started_at) {
            return handleError(res, 400, 'en', "Missing required fields");
        }

        const sender_doctor_id = doctorData?.doctor_id;

        await webModels.createOrUpdateCallLog({
            call_id,
            sender_user_id: null,
            sender_doctor_id,
            receiver_user_id,
            receiver_doctor_id: null,
            status,
            started_at // Pass to model
        });

        return handleSuccess(res, 200, 'en', "Call log created by doctor");
    } catch (error) {
        console.error("Error in create_call_log_doctor:", error);
        return handleError(res, 500, 'en', error.message);
    }
}
// -------------------------------------slot managment------------------------------------------------//

export const getFutureDoctorSlots = async (req, res) => {
    try {
        const { doctor_id } = req.query;
        const today = dayjs();
        const oneMonthLater = today.add(1, 'month');

        const availabilityRows = await doctorModels.fetchDoctorAvailabilityModel(doctor_id);

        if (availabilityRows.length === 0) {
            return handleError(res, 400, 'en', "NO_AVAILABILITY_FOUND", []);
        }

        // 1. Generate all possible future dates per availability
        let allSlotData = [];

        for (const availability of availabilityRows) {
            const rruleDay = weekdayMap[availability.day.toLowerCase()];
            if (!rruleDay) continue;

            const rule = new RRule({
                freq: RRule.WEEKLY,
                byweekday: [rruleDay],
                dtstart: today.toDate(),
                until: oneMonthLater.toDate()
            });

            const upcomingDates = rule.all();

            for (const dateObj of upcomingDates) {
                const formattedDate = dayjs.utc(dateObj).format('YYYY-MM-DD');
                const slots = generateSlots(
                    availability.start_time,
                    availability.end_time,
                    availability.slot_duration,
                    formattedDate
                );

                slots.forEach(slot => {
                    allSlotData.push({
                        date: formattedDate,
                        day: availability.day.toLowerCase(),
                        ...slot
                    });
                });
            }
        }

        if (allSlotData.length === 0) {
            return handleError(res, 400, 'en', "NO_SLOTS_FOUND", []);
        }

        // 2. Bulk fetch all appointments for doctor in the next 1 month
        const bookedAppointmentsRaw = await doctorModels.fetchAppointmentsBulkModel(
            doctor_id,
            today.format('YYYY-MM-DD'),
            oneMonthLater.format('YYYY-MM-DD')
        );
        console.log("bookedAppointmentsRaw", bookedAppointmentsRaw);

        const result = bookedAppointmentsRaw.map(app => {
            // Convert local Date object (from MySQL) to local string
            const localFormatted = dayjs(app.start_time).format("YYYY-MM-DD HH:mm:ss");

            // Parse that string as if it was in UTC
            const fixedUTC = dayjs.utc(localFormatted).toISOString();

            return {
                ...app,
                start_time: fixedUTC,
            };
        });
        // Example result format: [{date: '2025-06-28', time: '10:00', count: 1}, ...]

        console.log("result", result)

        const bookedAppointments = Array.isArray(result) ? result : [];

        const bookedMap = {};
        // for (const app of bookedAppointments) {
        //     const key = `${app.date}_${app.time}`;
        //     bookedMap[key] = app.count;
        // }
        for (const app of bookedAppointments) {
            const key = `${app.start_time}`;
            bookedMap[key] = app.count || 1;
        }

        console.log("bookedMap", bookedMap)

        // 3. Assign status in-memory
        const resultWithStatus = allSlotData.map(slot => {
            // const key = `${slot.date}_${slot.start_time}`;
            // const status = bookedMap[key] > 0 ? 'booked' : 'available';
            const key = slot.start_time;
            const status = bookedMap[key] > 0 ? 'booked' : 'available';
            return {
                // date: slot.date,
                // day: slot.day,
                start_time: slot.start_time,
                end_time: slot.end_time,
                status
            };
        });

        return handleSuccess(res, 200, 'en', "FUTURE_DOCTOR_SLOTS", resultWithStatus);
    } catch (err) {
        console.error('Error fetching future slots:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const isUserOfflineOrOnline = async (req, res) => {
    try {
        const { user_id, language } = req.user;
        let { isOnline } = req.body
        // const io = getIO();
        await doctorModels.update_doctor_is_online(user_id, isOnline);
        // await toActivateUsers(isOnline, chat_id, doctorId);
        // io.to(doctorId).emit('isUsersOnlineOrOffline', isOnline);
        return handleSuccess(res, 200, language, `USER ${isActive ? 'ONLINE' : 'OFFLINE'}`);
    } catch (error) {
        console.error('error', error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};