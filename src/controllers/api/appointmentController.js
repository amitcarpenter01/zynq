import Joi from 'joi';
import { asyncHandler, handleError, handleSuccess, joiErrorHandle } from '../../utils/responseHandler.js';
import * as appointmentModel from '../../models/appointment.js';
import dayjs from 'dayjs';
import { createChat, getChatBetweenUsers } from '../../models/chat.js';
import { getDocterByDocterId } from '../../models/doctor.js';
import { isEmpty } from '../../utils/user_helper.js';
const APP_URL = process.env.APP_URL;
const ADMIN_EARNING_PERCENTAGE = parseFloat(process.env.ADMIN_EARNING_PERCENTAGE);
import { v4 as uuidv4 } from 'uuid';
import { NOTIFICATION_MESSAGES, sendNotification } from '../../services/notifications.service.js';
import { getLatestFaceScanReportIDByUserID } from '../../utils/misc.util.js';

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
        const userId = req.user.user_id;
        const appointments = await appointmentModel.getAppointmentsByUserId(userId, 'booked');

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
                app.status !== 'Completed' &&
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
                app.status !== 'Completed' &&
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
        const admin_earnings = (total_price * ADMIN_EARNING_PERCENTAGE) / 100;
        const clinic_earnings = total_price - admin_earnings;
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
            end_time: normalizedEnd
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

            if (chatId.length < 1) {
                let doctorId = doctor[0].zynq_user_id
                let chatCreatedSuccessfully = await createChat(user_id, doctorId);
                chat_id = chatCreatedSuccessfully.insertId
            }
        }
        const language = req?.user?.language || 'en';

        return handleSuccess(
            res,
            201,
            language,
            save_type === 'booked' ? 'APPOINTMENT_BOOKED_SUCCESSFULLY' : 'DRAFT_SAVED_SUCCESSFULLY',
            { appointment_id, chat_id }
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
        const appointments = await appointmentModel.getAppointmentsByUserId(userId, 'draft');

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
        const appointments = await appointmentModel.getAppointmentsByUserId(userId);
        const total_spent = appointments.reduce((acc, appointment) => acc + Number(appointment.total_price), 0);
        const data = {
            total_spent: total_spent,
            appointments: appointments,
        }
        return handleSuccess(res, 200, "en", "APPOINTMENTS_FETCHED", data);
    } catch (error) {
        console.error("Error fetching user appointments:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};