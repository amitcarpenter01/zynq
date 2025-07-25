import Joi from 'joi';
import { asyncHandler, handleError, handleSuccess, joiErrorHandle } from '../../utils/responseHandler.js';
import * as appointmentModel from '../../models/appointment.js';
import dayjs from 'dayjs';
import { createChat, getChatBetweenUsers } from '../../models/chat.js';
import { getDocterByDocterId } from '../../models/doctor.js';
import { isEmpty } from '../../utils/user_helper.js';
const APP_URL = process.env.APP_URL;
import { v4 as uuidv4 } from 'uuid';
import { NOTIFICATION_MESSAGES, sendNotification } from '../../services/notifications.service.js';

export const bookAppointment = async (req, res) => {
    try {
        const schema = Joi.object({
            doctor_id: Joi.string().required(),
            report_id: Joi.string().required(),
            clinic_id: Joi.string().required(),
            start_time: Joi.string().isoDate().required(),
            end_time: Joi.string().isoDate().required(),
            type: Joi.string().valid("Offline", "Video Call").required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        let { doctor_id, start_time, end_time, type, clinic_id, report_id } = value;


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
        const appointments = await appointmentModel.getAppointmentsByUserId(userId);

        const now = dayjs.utc();

        const result = await Promise.all(appointments.map(async (app) => {
            const doctor = await getDocterByDocterId(app.doctor_id);
            let chatId = await getChatBetweenUsers(userId, doctor[0].zynq_user_id);
            app.chatId = chatId.length > 0 ? chatId[0].id : null;

            const localFormattedStart = dayjs(app.start_time).format("YYYY-MM-DD HH:mm:ss");
            const localFormattedEnd = dayjs(app.end_time).format("YYYY-MM-DD HH:mm:ss");

            if (app.profile_image && !app.profile_image.startsWith('http')) {
                app.profile_image = `${APP_URL}doctor/profile_images/${app.profile_image}`;
            }

            if (app.pdf && !app.pdf.startsWith('http')) {
                app.pdf = `${APP_URL}${app.pdf}`;
            }


            const startUTC = dayjs.utc(localFormattedStart);
            const endUTC = dayjs.utc(localFormattedEnd);
            //const videoCallOn = now.isAfter(startUTC) && now.isBefore(endUTC);
            const videoCallOn =
                app.status !== 'Completed' &&
                now.isAfter(startUTC) &&
                now.isBefore(endUTC);

            return {
                ...app,
                start_time: dayjs.utc(localFormattedStart).toISOString(),
                end_time: dayjs.utc(localFormattedEnd).toISOString(),
                videoCallOn,
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


        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { appointment_id, status } = value;

        const result = await appointmentModel.updateAppointmentStatus(appointment_id, status);

        if (result.affectedRows === 0) {
            return handleError(res, 404, "en", "APPOINTMENT_NOT_FOUND");
        }

        return handleSuccess(res, 200, "en", "APPOINTMENT_STATUS_UPDATED");
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

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { appointment_id } = value;
        const appointments = await appointmentModel.getAppointmentsById(userId, appointment_id);

        if (isEmpty(appointments))
            return handleError(res, 404, "en", "APPOINTMENT_NOT_FOUND");

        const now = dayjs.utc();

        const result = await Promise.all(appointments.map(async (app) => {
            const doctor = await getDocterByDocterId(app.doctor_id);
            const chatId = await getChatBetweenUsers(userId, doctor[0].zynq_user_id);

            app.chatId = chatId.length > 0 ? chatId[0].id : null;

            const localFormattedStart = dayjs(app.start_time).format("YYYY-MM-DD HH:mm:ss");
            const localFormattedEnd = dayjs(app.end_time).format("YYYY-MM-DD HH:mm:ss");

            if (app.profile_image && !app.profile_image.startsWith('http')) {
                app.profile_image = `${APP_URL}doctor/profile_images/${app.profile_image}`;
            }

            if (app.pdf && !app.pdf.startsWith('http')) {
                app.pdf = `${APP_URL}${app.pdf}`;
            }

            const startUTC = dayjs.utc(localFormattedStart);
            const endUTC = dayjs.utc(localFormattedEnd);

            const videoCallOn =
                app.status !== 'Completed' &&
                now.isAfter(startUTC) &&
                now.isBefore(endUTC);

            return {
                ...app,
                start_time: startUTC.toISOString(),
                end_time: endUTC.toISOString(),
                videoCallOn,
            };
        }));

        return handleSuccess(res, 200, "en", "APPOINTMENTS_FETCHED", result[0]);
    } catch (error) {
        console.error("Error fetching appointment by ID:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const rateAppointment = asyncHandler(async (req, res) => {
    const { appointment_id, rating, review } = req.body;

    const appointmentData = await appointmentModel.getAppointmentDataByAppointmentID(appointment_id);

    if (isEmpty(appointmentData)) {
        return handleError(res, 404, "en", "APPOINTMENT_NOT_FOUND");
    }
    const result = await appointmentModel.insertAppointmentRating(
        { appointment_id, clinic_id: appointmentData[0].clinic_id, doctor_id: appointmentData[0].doctor_id, user_id: req.user.user_id, rating, review }
    );

    if (result.affectedRows === 0) {
        return handleError(res, 404, "en", "ERROR_RATING_APPOINTMENT");
    }

    return handleSuccess(res, 200, "en", "APPOINTMENT_RATED_SUCCESSFULLY");
});