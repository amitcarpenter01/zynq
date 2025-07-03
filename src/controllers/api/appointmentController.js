import Joi from 'joi';
import { handleError, handleSuccess, joiErrorHandle } from '../../utils/responseHandler.js';
import * as appointmentModel from '../../models/appointment.js';
import dayjs from 'dayjs';
const APP_URL = process.env.APP_URL;

export const bookAppointment = async (req, res) => {
    try {
        const schema = Joi.object({
            doctor_id: Joi.string().required(),
            clinic_id: Joi.string().required(),
            start_time: Joi.string().isoDate().required(),
            end_time: Joi.string().isoDate().required(),
            type: Joi.string().valid("Offline", "Video Call").required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        let { doctor_id, start_time, end_time, type, clinic_id } = value;


        // Check before inserting (optional, for nicer UX)
        const existing = await appointmentModel.checkIfSlotAlreadyBooked(doctor_id, start_time);
        if (existing.length > 0) {
            return handleError(res, 400, "en", "SLOT_ALREADY_BOOKED");
        }

        const normalizedStart = dayjs.utc(start_time).format("YYYY-MM-DD HH:mm:ss");
        const normalizedEnd = dayjs.utc(end_time).format("YYYY-MM-DD HH:mm:ss");

        const appointmentData = {
            user_id: req.user.user_id,
            doctor_id,
            start_time: normalizedStart,
            clinic_id,
            end_time: normalizedEnd,
            type,
            status: 'Scheduled'
        };

        await appointmentModel.insertAppointment(appointmentData);

        return handleSuccess(res, 201, "en", "APPOINTMENT_BOOKED_SUCCESSFULLY");
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

        const result = appointments.map(app => {

            const localFormattedStart = dayjs(app.start_time).format("YYYY-MM-DD HH:mm:ss");
            const localFormattedEnd = dayjs(app.end_time).format("YYYY-MM-DD HH:mm:ss");

            if (app.profile_image && !app.profile_image.startsWith('http')) {
                app.profile_image = `${APP_URL}doctor/profile_images/${app.profile_image}`;
            }

            return {
                ...app,
                start_time: dayjs.utc(localFormattedStart).toISOString(),
                end_time: dayjs.utc(localFormattedEnd).toISOString(),
            };
        });

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

        let { appointment_id } = value;

        const appointments = await appointmentModel.getAppointmentsById(userId,appointment_id);

        const now = dayjs.utc();

        const result = appointments.map(app => {

            const localFormattedStart = dayjs(app.start_time).format("YYYY-MM-DD HH:mm:ss");
            const localFormattedEnd = dayjs(app.end_time).format("YYYY-MM-DD HH:mm:ss");

            if (app.profile_image && !app.profile_image.startsWith('http')) {
                app.profile_image = `${APP_URL}doctor/profile_images/${app.profile_image}`;
            }

            const startUTC = dayjs.utc(localFormattedStart);
            const endUTC = dayjs.utc(localFormattedEnd);
            const videoCallOn = now.isAfter(startUTC) && now.isBefore(endUTC);

            return {
                ...app,
                start_time: dayjs.utc(localFormattedStart).toISOString(),
                end_time: dayjs.utc(localFormattedEnd).toISOString(),
                videoCallOn
            };
        });

        return handleSuccess(res, 200, "en", "APPOINTMENTS_FETCHED", result);
    } catch (error) {
        console.error("Error fetching user appointments:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};