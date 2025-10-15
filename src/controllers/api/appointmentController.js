import Joi from 'joi';
import { asyncHandler, handleError, handleSuccess, joiErrorHandle } from '../../utils/responseHandler.js';
import * as appointmentModel from '../../models/appointment.js';
import * as walletModel from '../../models/wallet.js';
import dayjs from 'dayjs';
import { createChat, getChatBetweenUsers } from '../../models/chat.js';
import { getDocterByDocterId } from '../../models/doctor.js';
import { formatImagePath } from '../../utils/user_helper.js';
import { getAppointmentDetails, isEmpty } from '../../utils/user_helper.js';
const APP_URL = process.env.APP_URL;
import { v4 as uuidv4 } from 'uuid';
import { NOTIFICATION_MESSAGES, sendNotification } from '../../services/notifications.service.js';
import { getLatestFaceScanReportIDByUserID } from '../../utils/misc.util.js';
import { sendEmail } from '../../services/send_email.js';
import { appointmentBookedTemplate } from '../../utils/templates.js';
import { getAdminCommissionRatesModel } from '../../models/admin.js';
import { createPaymentSessionForAppointment } from '../../models/payment.js';

export const bookAppointment = async (req, res) => {
    try {
        const schema = Joi.object({
            doctor_id: Joi.string().required(),
            report_id: Joi.string().optional(),
            clinic_id: Joi.string().required(),
            start_time: Joi.string().isoDate().required(),
            end_time: Joi.string().isoDate().required(),
            type: Joi.string().valid("Offline", "Video Call").required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        let { doctor_id, start_time, end_time, type, clinic_id, report_id } = value;

        if (isEmpty(report_id)) {
            report_id = await getLatestFaceScanReportIDByUserID(req.user.user_id);
        }

        // Check before inserting (optional, for nicer UX)
        const existing = await appointmentModel.checkIfSlotAlreadyBooked(doctor_id, start_time);
        if (existing.length > 0) {
            return handleError(res, 400, "en", "SLOT_ALREADY_BOOKED");
        }

        const normalizedStart = dayjs.utc(start_time).format("YYYY-MM-DD HH:mm:ss");
        const normalizedEnd = dayjs.utc(end_time).format("YYYY-MM-DD HH:mm:ss");

        const appointment_id = uuidv4();
        const appointmentData = {
            appointment_id,
            user_id: req.user.user_id,
            doctor_id,
            start_time: normalizedStart,
            clinic_id,
            report_id: report_id,
            end_time: normalizedEnd,
            type,
            status: 'Scheduled'
        };


        let result = await appointmentModel.insertAppointment(appointmentData);

        let user_id = req.user.user_id
        const doctor = await getDocterByDocterId(doctor_id);
        let chatId = await getChatBetweenUsers(user_id, doctor[0].zynq_user_id);


        await sendNotification({
            userData: req.user,
            type: "APPOINTMENT",
            type_id: appointment_id,
            notification_type: NOTIFICATION_MESSAGES.appointment_booked,
            receiver_id: doctor_id,
            receiver_type: "DOCTOR"
        })

        if (chatId.length > 0) {
            return handleSuccess(res, 201, "en", "APPOINTMENT_BOOKED_SUCCESSFULLY");
        } else {
            let doctorId = doctor[0].zynq_user_id
            let chatCreatedSuccessfully = await createChat(user_id, doctorId);
            if (!chatCreatedSuccessfully.insertId) {
                return handleError(res, 400, 'en', "Failed To Create a chat");
            }
            return handleSuccess(res, 201, "en", "APPOINTMENT_BOOKED_SUCCESSFULLY");
        }
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return handleError(res, 400, "en", "SLOT_ALREADY_BOOKED");
        }
        console.error("Error in bookAppointment:", err);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const getMyAppointmentsUser = async (req, res) => {
    try {
        await appointmentModel.updateMissedAppointmentStatusModel();
        const userId = req.user.user_id;
        const appointments = await appointmentModel.getAppointmentsByUserId(userId, 'booked', 'unpaid');

        const now = dayjs.utc();

        const result = await Promise.all(appointments.map(async (app) => {
            const doctor = await getDocterByDocterId(app.doctor_id);
            let chatId = await getChatBetweenUsers(userId, doctor[0]?.zynq_user_id);
            app.chatId = chatId.length > 0 ? chatId[0].id : null;

            const localFormattedStart = app.start_time ? dayjs(app.start_time).format("YYYY-MM-DD HH:mm:ss") : null;
            const localFormattedEnd = app.end_time ? dayjs(app.end_time).format("YYYY-MM-DD HH:mm:ss") : null;

            if (app.profile_image && !app.profile_image.startsWith('http')) {
                app.profile_image = `${APP_URL}doctor/profile_images/${app.profile_image}`;
            }

            if (app.pdf && !app.pdf.startsWith('http')) {
                app.pdf = `${APP_URL}${app.pdf}`;
            }

            const startUTC = localFormattedStart ? dayjs.utc(localFormattedStart) : null;
            const endUTC = localFormattedEnd ? dayjs.utc(localFormattedEnd) : null;

            // Safe check for video call eligibility
            const videoCallOn = (
                // app.status !== 'Completed' &&
                startUTC?.isValid() &&
                endUTC?.isValid() &&
                now.isAfter(startUTC) &&
                now.isBefore(endUTC)
            );

            const treatments = await appointmentModel.getAppointmentTreatments(app.appointment_id);

            return {
                ...app,
                start_time: startUTC ? startUTC.toISOString() : null,
                end_time: endUTC ? endUTC.toISOString() : null,
                videoCallOn,
                treatments
            };
        }));


        return handleSuccess(res, 200, "en", "APPOINTMENTS_FETCHED", result);
    } catch (error) {
        console.error("Error fetching user appointments:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const updateAppointmentStatus = async (req, res) => {
    try {
        const schema = Joi.object({
            appointment_id: Joi.string().required(),
            status: Joi.string()
                .required()
                .valid('Scheduled', 'Completed', 'Rescheduled', 'Ongoing')
        });

        const language = req?.user?.language || 'en';


        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { appointment_id, status } = value;

        const result = await appointmentModel.updateAppointmentStatus(appointment_id, status);

        if (result.affectedRows === 0) {
            return handleError(res, 404, language, "APPOINTMENT_NOT_FOUND");
        }

        return handleSuccess(res, 200, language, "APPOINTMENT_STATUS_UPDATED");
    } catch (error) {
        console.error("Error updating appointment status:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
}


export const getAppointmentsById = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const schema = Joi.object({
            appointment_id: Joi.string().required(),
        });

        const language = req?.user?.language || 'en';

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { appointment_id } = value;
        const appointments = await appointmentModel.getAppointmentsById(userId, appointment_id);

        const now = dayjs.utc();

        const result = await Promise.all(appointments.map(async (app) => {
            const doctor = await getDocterByDocterId(app.doctor_id);
            const chatId = await getChatBetweenUsers(userId, doctor[0].zynq_user_id);

            app.chatId = chatId.length > 0 ? chatId[0].id : null;

            const localFormattedStart = app.start_time ? dayjs(app.start_time).format("YYYY-MM-DD HH:mm:ss") : null;
            const localFormattedEnd = app.end_time ? dayjs(app.end_time).format("YYYY-MM-DD HH:mm:ss") : null;
            if (app.profile_image && !app.profile_image.startsWith('http')) {
                app.profile_image = `${APP_URL}doctor/profile_images/${app.profile_image}`;
            }

            if (app.pdf && !app.pdf.startsWith('http')) {
                app.pdf = `${APP_URL}${app.pdf}`;
            }

            const startUTC = localFormattedStart ? dayjs.utc(localFormattedStart) : null;
            const endUTC = localFormattedEnd ? dayjs.utc(localFormattedEnd) : null;
            //const videoCallOn = now.isAfter(startUTC) && now.isBefore(endUTC);
            const videoCallOn =
                // app.status !== 'Completed' &&
                now.isAfter(startUTC) &&
                now.isBefore(endUTC);
            const treatments = await appointmentModel.getAppointmentTreatments(appointment_id);

            return {
                ...app,
                start_time: localFormattedStart ? dayjs.utc(localFormattedStart).toISOString() : null,
                end_time: localFormattedEnd ? dayjs.utc(localFormattedEnd).toISOString() : null,
                videoCallOn,
                treatments
            };
        }));

        return handleSuccess(res, 200, language, "APPOINTMENTS_FETCHED", result[0]);
    } catch (error) {
        console.error("Error fetching appointment by ID:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const rateAppointment = asyncHandler(async (req, res) => {
    const { appointment_id, rating, review } = req.body;

    const language = req?.user?.language || 'en';

    const appointmentData = await appointmentModel.getAppointmentDataByAppointmentID(appointment_id);

    if (isEmpty(appointmentData)) {
        return handleError(res, 404, language, "APPOINTMENT_NOT_FOUND");
    }
    const result = await appointmentModel.insertAppointmentRating(
        { appointment_id, clinic_id: appointmentData[0].clinic_id, doctor_id: appointmentData[0].doctor_id, user_id: req.user.user_id, rating, review }
    );

    if (result.affectedRows === 0) {
        return handleError(res, 404, language, "ERROR_RATING_APPOINTMENT");
    }

    return handleSuccess(res, 200, language, "APPOINTMENT_RATED_SUCCESSFULLY");
});

export const saveOrBookAppointment = async (req, res) => {
    try {

        const schema = Joi.object({
            appointment_id: Joi.string().optional(),
            doctor_id: Joi.string().required(),
            report_id: Joi.string().optional(),
            clinic_id: Joi.string().required(),
            treatments: Joi.array().items(
                Joi.object({
                    treatment_id: Joi.string().required(),
                    price: Joi.number().required()
                })
            ).optional(),
            start_time: Joi.string().isoDate().optional(),
            end_time: Joi.string().isoDate().optional()
        });


        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        let {
            appointment_id: inputId,
            doctor_id,
            clinic_id,
            treatments = [],
            start_time,
            end_time,
            report_id
        } = value;

        const user_id = req.user.user_id;
        const hasTreatments = treatments.length > 0;
        const appointmentType = hasTreatments ? 'Clinic Visit' : 'Video Call';
        const save_type = hasTreatments
            ? start_time && end_time
                ? 'booked'
                : 'draft'
            : 'booked';

        const appointment_id = inputId || uuidv4();
        const total_price = treatments.reduce((sum, t) => sum + t.price, 0);
        if (isEmpty(report_id)) {
            report_id = await getLatestFaceScanReportIDByUserID(req.user.user_id);
        }
        const normalizedStart = start_time
            ? dayjs.utc(start_time).format("YYYY-MM-DD HH:mm:ss")
            : null;
        const normalizedEnd = end_time
            ? dayjs.utc(end_time).format("YYYY-MM-DD HH:mm:ss")
            : null;

        const [{ APPOINTMENT_COMMISSION }] = await getAdminCommissionRatesModel();
        const ADMIN_EARNING_PERCENTAGE = APPOINTMENT_COMMISSION || 3;
        const admin_earnings = Number(((total_price * ADMIN_EARNING_PERCENTAGE) / 100).toFixed(2));
        const clinic_earnings = Number(total_price) - admin_earnings;
        const is_paid = total_price > 0 ? 1 : 0;

        const appointmentData = {
            appointment_id,
            user_id,
            doctor_id,
            clinic_id,
            total_price,
            admin_earnings,
            clinic_earnings,
            report_id: report_id,
            type: appointmentType,
            status: save_type === 'booked' ? 'Scheduled' : 'Scheduled',
            save_type,
            start_time: normalizedStart,
            end_time: normalizedEnd,
            is_paid
        };


        if (inputId) {
            await appointmentModel.updateAppointment(appointmentData);
            if (hasTreatments) {
                await appointmentModel.deleteAppointmentTreatments(appointment_id);
                await appointmentModel.insertAppointmentTreatments(appointment_id, treatments);
            }
        } else {
            await appointmentModel.insertAppointment(appointmentData);
            if (hasTreatments) {
                await appointmentModel.insertAppointmentTreatments(appointment_id, treatments);
            }
        }

        let chat_id = 0;
        const appointmentDetails = await getAppointmentDetails(user_id, appointment_id)
        if (save_type == 'booked') {
            let user_id = req.user.user_id
            const doctor = await getDocterByDocterId(doctor_id);
            let chatId = await getChatBetweenUsers(user_id, doctor[0].zynq_user_id);


            await sendNotification({
                userData: req.user,
                type: "APPOINTMENT",
                type_id: appointment_id,
                notification_type: NOTIFICATION_MESSAGES.appointment_booked,
                receiver_id: doctor_id,
                receiver_type: "DOCTOR"
            })


            await sendEmail({
                to: doctor[0].email,
                subject: appointmentBookedTemplate.subject({
                    user_name: req?.user?.full_name,
                    appointment_date: normalizedStart
                }),
                html: appointmentBookedTemplate.body({
                    user_name: req?.user?.full_name,
                    doctor_name: doctor[0].name,
                    appointment_date: normalizedStart,
                    total_price: total_price,
                    clinic_name: appointmentDetails.clinic_name,
                }),
            });

            if (chatId.length < 1) {
                let doctorId = doctor[0].zynq_user_id
                let chatCreatedSuccessfully = await createChat(user_id, doctorId);
                chat_id = chatCreatedSuccessfully.insertId
            }


            else {
                chat_id = chatId[0].id
            }
        }
        const language = req?.user?.language || 'en';



        return handleSuccess(
            res,
            201,
            language,

            save_type === 'booked' ? 'APPOINTMENT_BOOKED_SUCCESSFULLY' : 'DRAFT_SAVED_SUCCESSFULLY',
            { appointment_id, chat_id, appointmentDetails: appointmentDetails }
        );
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return handleError(res, 400, "en", "SLOT_ALREADY_BOOKED");
        }
        console.error("Error in saveOrBookAppointment:", err);
        return handleError(res, 500, 'en', 'INTERNAL_SERVER_ERROR');
    }
};

export const getMyTreatmentPlans = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const appointments = await appointmentModel.getAppointmentsByUserIdV2(userId, 'draft', 'unpaid');

        const now = dayjs.utc();

        const result = await Promise.all(appointments.map(async (app) => {
            const doctor = await getDocterByDocterId(app.doctor_id);
            let chatId = await getChatBetweenUsers(userId, doctor[0].zynq_user_id);
            app.chatId = chatId.length > 0 ? chatId[0].id : null;

            const localFormattedStart = app.start_time ? dayjs(app.start_time).format("YYYY-MM-DD HH:mm:ss") : null;
            const localFormattedEnd = app.end_time ? dayjs(app.end_time).format("YYYY-MM-DD HH:mm:ss") : null;

            if (app.profile_image && !app.profile_image.startsWith('http')) {
                app.profile_image = `${APP_URL}doctor/profile_images/${app.profile_image}`;
            }

            if (app.pdf && !app.pdf.startsWith('http')) {
                app.pdf = `${APP_URL}${app.pdf}`;
            }


            const startUTC = localFormattedStart ? dayjs.utc(localFormattedStart) : null;
            const endUTC = localFormattedEnd ? dayjs.utc(localFormattedEnd) : null;
            //const videoCallOn = now.isAfter(startUTC) && now.isBefore(endUTC);
            const videoCallOn =
                app.status !== 'Completed'
            now.isAfter(startUTC) &&
                now.isBefore(endUTC);

            const treatments = await appointmentModel.getAppointmentTreatments(app.appointment_id);

            return {
                ...app,
                start_time: localFormattedStart ? dayjs.utc(localFormattedStart).toISOString() : null,
                end_time: localFormattedEnd ? dayjs.utc(localFormattedEnd).toISOString() : null,
                videoCallOn,
                treatments
            };
        }));

        return handleSuccess(res, 200, "en", "APPOINTMENTS_FETCHED", result);
    } catch (error) {
        console.error("Error fetching user appointments:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const getBookedAppointments = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const appointments = await appointmentModel.getBookedAppointmentsByUserId(userId, 'booked');
        const total_spent = appointments.reduce((acc, appointment) => acc + Number(appointment.total_price), 0);
        const data = {
            total_spent: Number(total_spent.toFixed(2)) || 0.00,
            appointments: appointments,
        }
        return handleSuccess(res, 200, "en", "APPOINTMENTS_FETCHED", data);
    } catch (error) {
        console.error("Error fetching user appointments:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const requestCallback = asyncHandler(async (req, res) => {
    const language = req?.user?.language || 'en';
    const doctor_id = req.params.doctor_id;

    sendNotification({
        userData: req.user,
        type: "CALLBACK",
        type_id: doctor_id,
        notification_type: NOTIFICATION_MESSAGES.callback_requested,
        receiver_id: doctor_id,
        receiver_type: "DOCTOR"
    })

    return handleSuccess(res, 200, language, "CALLBACK_REQUESTED_SUCCESSFULLY");
})

export const cancelAppointment = async (req, res) => {
    try {
        const { appointment_id, reason } = req.body;
        const schema = Joi.object({
            appointment_id: Joi.string().required(),
            reason: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const user_id = req.user.user_id;


        const appointmentDetails = await appointmentModel.getAppointmentsById(user_id, appointment_id);
        const appointment = appointmentDetails[0]
        if (!appointment) return handleError(res, 404, "en", "APPOINTMENT_NOT_FOUND");
        if (appointment.user_id !== user_id) return handleError(res, 404, "en", "NOT_ALLOWED");
        if (appointment.is_paid) {
            return handleError(res, 404, "en", "NOT_ALLOWED");
        }


        await appointmentModel.cancelAppointment(appointment_id, {
            status: 'Cancelled',
            cancelled_by: 'user',
            cancelled_by_id: user_id,
            cancel_reason: reason,
            payment_status: appointment.is_paid ? 'refund_initiated' : appointment.payment_status
        });

        handleSuccess(res, 200, 'en', 'APPOINTMENT_CANCELLED_SUCCESSFULLY');

        await sendNotification({
            userData: req.user,
            type: "APPOINTMENT",
            type_id: appointment_id,
            notification_type: NOTIFICATION_MESSAGES.appointment_cancelled,
            receiver_id: appointment.doctor_id,
            receiver_type: "DOCTOR"
        })
    } catch (err) {
        console.error(err);
        return handleError(res, 500, 'en', 'INTERNAL_SERVER_ERROR');
    }
};

export const getMyWallet = async (req, res) => {
    try {
        const { wallet, transactions } = await walletModel.getWalletWithTx(req.user.user_id, 1000, 0);
        return handleSuccess(res, 200, 'en', 'WALLET_SUMMARY', { wallet, transactions });
    } catch (err) {
        console.error('getMyWallet error:', err);
        return handleError(res, 500, 'en', 'INTERNAL_SERVER_ERROR');
    }
};

export const saveAppointmentAsDraft = async (req, res) => {
    try {

        const schema = Joi.object({
            appointment_id: Joi.string().optional(),
            doctor_id: Joi.string().required(),
            report_id: Joi.string().optional(),
            clinic_id: Joi.string().required(),
            treatments: Joi.array().items(
                Joi.object({
                    treatment_id: Joi.string().required(),
                    price: Joi.number().required()
                })
            ).optional(),
        });


        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        let {
            appointment_id: inputId,
            doctor_id,
            clinic_id,
            treatments = [],
            report_id
        } = value;

        const user_id = req.user.user_id;
        const hasTreatments = treatments.length > 0;
        const appointmentType = hasTreatments ? 'Clinic Visit' : 'Video Call';
        const save_type = 'draft'

        let appointment_id = inputId || uuidv4();
        const total_price = treatments.reduce((sum, t) => sum + t.price, 0);
        if (isEmpty(report_id)) {
            report_id = await getLatestFaceScanReportIDByUserID(req.user.user_id);
        }

        const is_paid = total_price > 0 ? 1 : 0;

        const appointmentData = {
            appointment_id,
            user_id,
            doctor_id,
            clinic_id,
            total_price,
            admin_earnings: 0,
            clinic_earnings: 0,
            report_id: report_id,
            type: appointmentType,
            status: 'Scheduled',
            save_type,
            start_time: null,
            end_time: null,
            is_paid
        };

        const appointmentResponse = await appointmentModel.getAppointmentsByUserIdAndDoctorId(user_id, doctor_id, save_type)


        if (inputId || appointmentResponse.length > 0) {
            if (appointmentResponse.length > 0) {
                appointment_id = appointmentResponse[0].appointment_id
            }
            await appointmentModel.updateAppointment(appointmentData);
            if (hasTreatments) {
                await appointmentModel.deleteAppointmentTreatments(appointment_id);
                await appointmentModel.insertAppointmentTreatments(appointment_id, treatments);
            }
        } else {
            await appointmentModel.insertAppointment(appointmentData);
            if (hasTreatments) {
                await appointmentModel.insertAppointmentTreatments(appointment_id, treatments);
            }
        }

        let chat_id = 0;
        const appointmentDetails = await getAppointmentDetails(user_id, appointment_id)
        const language = req?.user?.language || 'en';

        return handleSuccess(
            res,
            201,
            language, 'DRAFT_SAVED_SUCCESSFULLY',
            { appointment_id, chat_id, appointmentDetails: appointmentDetails }
        );
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return handleError(res, 400, "en", "SLOT_ALREADY_BOOKED");
        }
        console.error("Error in saveOrBookAppointment:", err);
        return handleError(res, 500, 'en', 'INTERNAL_SERVER_ERROR');
    }
};

export const bookDirectAppointment = async (req, res) => {
    try {

        const schema = Joi.object({
            appointment_id: Joi.string().optional(),
            doctor_id: Joi.string().required(),
            report_id: Joi.string().optional(),
            clinic_id: Joi.string().required(),
            treatments: Joi.array().items(
                Joi.object({
                    treatment_id: Joi.string().required(),
                    price: Joi.number().required()
                })
            ).optional(),
            start_time: Joi.string().isoDate().required(),
            end_time: Joi.string().isoDate().required(),
            redirect_url: Joi.string().required(),
            cancel_url: Joi.string().required()
        });


        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        let {
            appointment_id: inputId,
            doctor_id,
            clinic_id,
            treatments = [],
            start_time,
            end_time,
            report_id,
            redirect_url,
            cancel_url
        } = value;

        const user_id = req.user.user_id;
        const hasTreatments = treatments.length > 0;
        const appointmentType = hasTreatments ? 'Clinic Visit' : 'Video Call';
        const save_type = 'booked'

        const appointment_id = inputId || uuidv4();
        const total_price = treatments.reduce((sum, t) => sum + t.price, 0);
        if (isEmpty(report_id)) {
            report_id = await getLatestFaceScanReportIDByUserID(req.user.user_id);
        }
        const normalizedStart = start_time
            ? dayjs.utc(start_time).format("YYYY-MM-DD HH:mm:ss")
            : null;
        const normalizedEnd = end_time
            ? dayjs.utc(end_time).format("YYYY-MM-DD HH:mm:ss")
            : null;

        const [{ APPOINTMENT_COMMISSION }] = await getAdminCommissionRatesModel();
        const ADMIN_EARNING_PERCENTAGE = APPOINTMENT_COMMISSION || 3;
        const admin_earnings = Number(((total_price * ADMIN_EARNING_PERCENTAGE) / 100).toFixed(2));
        const clinic_earnings = Number(total_price) - admin_earnings;
        const is_paid = total_price > 0 ? 1 : 0;

        const appointmentData = {
            appointment_id,
            user_id,
            doctor_id,
            clinic_id,
            total_price,
            admin_earnings,
            clinic_earnings,
            report_id: report_id,
            type: appointmentType,
            status: save_type === 'booked' ? 'Scheduled' : 'Scheduled',
            save_type,
            start_time: normalizedStart,
            end_time: normalizedEnd,
            is_paid,
            payment_status: is_paid ? 'unpaid' : 'paid'

        };


        if (inputId) {
            await appointmentModel.updateAppointment(appointmentData);
            if (hasTreatments) {
                await appointmentModel.deleteAppointmentTreatments(appointment_id);
                await appointmentModel.insertAppointmentTreatments(appointment_id, treatments);
            }
        } else {
            await appointmentModel.insertAppointment(appointmentData);
            if (hasTreatments) {
                await appointmentModel.insertAppointmentTreatments(appointment_id, treatments);
            }
        }

        const language = req?.user?.language || 'en';

        if (is_paid) {
            const session = await createPaymentSessionForAppointment(
                {
                    payment_gateway: "KLARNA",
                    metadata: {
                        order_lines: [
                            {
                                name: "Appointment",
                                quantity: 1,
                                unit_amount: total_price * 100,
                            }],
                        // order_lines: treatments.map((t)=>{
                        //     return {
                        //         name: `Treatmnet${t.treatment_id}`,
                        //         quantity:1,
                        //         unit_amount : parseFloat(t.price) * 100
                        //     }
                        // }),
                        appointment_id: appointment_id,
                        redirect_url: redirect_url,
                        cancel_url: cancel_url
                    }
                });
            return handleSuccess(res, 200, "en", "SESSION_CREATED_SUCCESSFULLY", session);
        }
        else {
            let chat_id = 0;
            let user_id = req.user.user_id
            const appointmentDetails = await getAppointmentDetails(user_id, appointment_id)

            const doctor = await getDocterByDocterId(doctor_id);
            let chatId = await getChatBetweenUsers(user_id, doctor[0].zynq_user_id);

            await sendNotification({
                userData: req.user,
                type: "APPOINTMENT",
                type_id: appointment_id,
                notification_type: NOTIFICATION_MESSAGES.appointment_booked,
                receiver_id: doctor_id,
                receiver_type: "DOCTOR"
            })


            await sendEmail({
                to: doctor[0].email,
                subject: appointmentBookedTemplate.subject({
                    user_name: req?.user?.full_name,
                    appointment_date: normalizedStart
                }),
                html: appointmentBookedTemplate.body({
                    user_name: req?.user?.full_name,
                    doctor_name: doctor[0].name,
                    appointment_date: normalizedStart,
                    total_price: total_price,
                    clinic_name: appointmentDetails.clinic_name,
                }),
            });

            if (chatId.length < 1) {
                let doctorId = doctor[0].zynq_user_id
                let chatCreatedSuccessfully = await createChat(user_id, doctorId);
                chat_id = chatCreatedSuccessfully.insertId
            }
            else {
                chat_id = chatId[0].id
            }

            return handleSuccess(
                res,
                201,
                language,
                'APPOINTMENT_BOOKED_SUCCESSFULLY',
                { appointment_id, chat_id, appointmentDetails: appointmentDetails }
            );
        }





    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return handleError(res, 400, "en", "SLOT_ALREADY_BOOKED");
        }
        console.error("Error in saveOrBookAppointment:", err);
        return handleError(res, 500, 'en', 'INTERNAL_SERVER_ERROR');
    }
};

export const markAppointmentAsPaid = async (req, res) => {
    try {

        const schema = Joi.object({
            appointment_id: Joi.string().required(),
        });


        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        let {
            appointment_id
        } = value;

        await appointmentModel.updateAppointmentAsPaid(appointment_id, 'paid');

        const language = req?.user?.language || 'en';


        let chat_id = 0;
        let user_id = req.user.user_id;
        const appointmentDetails = await getAppointmentDetails(user_id, appointment_id);
        const doctor_id = appointmentDetails.doctor_id;
        const start_time = appointmentDetails.start_time;
        const total_price = appointmentDetails.total_price
        const normalizedStart = dayjs.utc(start_time).format("YYYY-MM-DD HH:mm:ss");

        const doctor = await getDocterByDocterId(doctor_id);
        let chatId = await getChatBetweenUsers(user_id, doctor[0].zynq_user_id);

        await sendNotification({
            userData: req.user,
            type: "APPOINTMENT",
            type_id: appointment_id,
            notification_type: NOTIFICATION_MESSAGES.appointment_booked,
            receiver_id: doctor_id,
            receiver_type: "DOCTOR"
        })


        await sendEmail({
            to: doctor[0].email,
            subject: appointmentBookedTemplate.subject({
                user_name: req?.user?.full_name,
                appointment_date: normalizedStart
            }),
            html: appointmentBookedTemplate.body({
                user_name: req?.user?.full_name,
                doctor_name: doctor[0].name,
                appointment_date: normalizedStart,
                total_price: total_price,
                clinic_name: appointmentDetails.clinic_name,
            }),
        });

        if (chatId.length < 1) {
            let doctorId = doctor[0].zynq_user_id
            let chatCreatedSuccessfully = await createChat(user_id, doctorId);
            chat_id = chatCreatedSuccessfully.insertId
        }
        else {
            chat_id = chatId[0].id
        }

        return handleSuccess(
            res,
            201,
            language,
            'APPOINTMENT_BOOKED_SUCCESSFULLY',
            { appointment_id, chat_id, appointmentDetails: appointmentDetails }
        );
    }





    catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return handleError(res, 400, "en", "SLOT_ALREADY_BOOKED");
        }
        console.error("Error in saveOrBookAppointment:", err);
        return handleError(res, 500, 'en', 'INTERNAL_SERVER_ERROR');
    }
};

export const getDraftAppointments = asyncHandler(async (req, res) => {
    const { doctor_id } = req.params;
    const { user_id, language = "en" } = req.user;
    const draftData = await appointmentModel.getDraftAppointmentsModel(user_id, doctor_id);
    return handleSuccess(res, 200, language, "DRAFT_APPOINTMENTS_FETCHED_SUCCESSFULLY", draftData);
})