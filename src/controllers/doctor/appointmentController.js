import Joi from 'joi';
import { asyncHandler, handleError, handleSuccess, joiErrorHandle } from '../../utils/responseHandler.js';
import * as appointmentModel from '../../models/appointment.js';
import * as doctorModel from '../../models/doctor.js';
import * as chatModel from '../../models/chat.js';
import dayjs from 'dayjs';
import { getDocterByDocterId } from '../../models/doctor.js';
import { getChatBetweenUsers } from '../../models/chat.js';
const APP_URL = process.env.APP_URL;
export const getMyAppointmentsDoctor = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const doctorId = req.user.doctorData.doctor_id;

        const now = dayjs.utc();

        const appointments = await appointmentModel.getAppointmentsByDoctorId(doctorId);

        const result = await Promise.all(appointments.map(async (app) => {

            const doctor = await getDocterByDocterId(app.doctor_id);
            let chatId = await getChatBetweenUsers(userId, doctor[0].zynq_user_id);
            app.chatId = chatId.length > 0 ? chatId[0].id : null;
            // Convert local Date object (from MySQL) to local string
            const localFormattedStart = dayjs(app.start_time).format("YYYY-MM-DD HH:mm:ss");
            const localFormattedEnd = dayjs(app.end_time).format("YYYY-MM-DD HH:mm:ss");

            if (app.profile_image && !app.profile_image.startsWith('http')) {
                app.profile_image = `${APP_URL}${app.profile_image}`;
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
        }));

        return handleSuccess(res, 200, "en", "APPOINTMENTS_FETCHED", result);
    } catch (error) {
        console.error("Error fetching doctor appointments:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const getMyAppointmentById = async (req, res) => {
    console.log('true')
    try {
        const doctorId = req.user.doctorData.doctor_id;

        const schema = Joi.object({
            appointment_id: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        let { appointment_id } = value;

        const now = dayjs.utc();

        const appointments = await appointmentModel.getAppointmentByIdForDoctor(doctorId, appointment_id);

        const result = await Promise.all(appointments.map(async app => {
            console.log(app)
            // Convert local Date object (from MySQL) to local string
            const localFormattedStart = dayjs(app.start_time).format("YYYY-MM-DD HH:mm:ss");
            const localFormattedEnd = dayjs(app.end_time).format("YYYY-MM-DD HH:mm:ss");

            if (app.profile_image && !app.profile_image.startsWith('http')) {
                app.profile_image = `${APP_URL}${app.profile_image}`;
            }

            if (app.pdf && !app.pdf.startsWith('http')) {
                app.pdf = `${APP_URL}${app.pdf}`;
            }


            const startUTC = dayjs.utc(localFormattedStart);
            const endUTC = dayjs.utc(localFormattedEnd);
            const videoCallOn = now.isAfter(startUTC) && now.isBefore(endUTC);

            const doctor = await doctorModel.getDocterByDocterId(app.doctor_id);
            console.log("doctor", doctor)
            let chatId = await chatModel.getChatBetweenUsers(app.user_id, doctor[0].zynq_user_id);
            // console.log('chatId', chatId);


            return {
                ...app,
                start_time: dayjs.utc(localFormattedStart).toISOString(),
                end_time: dayjs.utc(localFormattedEnd).toISOString(),
                chatId: chatId.length > 0 ? chatId : null,
                videoCallOn
            };
        }));
        console.log("result", result)

        return handleSuccess(res, 200, "en", "APPOINTMENTS_FETCHED", result[0]);
    } catch (error) {
        console.error("Error fetching doctor appointments:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const rescheduleAppointment = asyncHandler(async (req, res) => {
    const { doctor_id, appointment_id, start_time, end_time } = req.body;

    const existing = await appointmentModel.checkIfSlotAlreadyBooked(doctor_id, start_time);

    if (existing.length > 0) {
        return handleError(res, 400, "en", "SLOT_ALREADY_BOOKED");
    }

    const normalizedStart = dayjs.utc(start_time).format("YYYY-MM-DD HH:mm:ss");
    const normalizedEnd = dayjs.utc(end_time).format("YYYY-MM-DD HH:mm:ss");

    const result = await appointmentModel.rescheduleAppointment(
        appointment_id,
        normalizedStart,
        normalizedEnd
    );

    if (result.affectedRows === 0) {
        return handleError(res, 404, "en", "APPOINTMENT_NOT_FOUND");
    }

    return handleSuccess(res, 200, "en", "APPOINTMENT_RESCHEDULED_SUCCESSFULLY");
});