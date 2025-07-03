import Joi from 'joi';
import { handleError, handleSuccess, joiErrorHandle } from '../../utils/responseHandler.js';
import * as appointmentModel from '../../models/appointment.js';
import dayjs from 'dayjs';
const APP_URL = process.env.APP_URL;
export const getMyAppointmentsDoctor = async (req, res) => {
    console.log('true')
    try {
        const doctorId = req.user.doctorData.doctor_id;

        const appointments = await appointmentModel.getAppointmentsByDoctorId(doctorId);

        const result = appointments.map(app => {
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
        });

        return handleSuccess(res, 200, "en", "APPOINTMENTS_FETCHED", result);
    } catch (error) {
        console.error("Error fetching doctor appointments:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};
