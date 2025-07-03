import Joi from 'joi';
import { handleError, handleSuccess, joiErrorHandle } from '../../utils/responseHandler.js';
import * as appointmentModel from '../../models/appointment.js';
import dayjs from 'dayjs';
import { createChat, getChatBetweenUsers } from '../../models/chat.js';
import { getDocterByDocterId } from '../../models/doctor.js';
import { apiError, apiHandler, apiResponse } from '../../utils/api.util.js';
import messages from '../../utils/messages.util.js';
import { isEmpty } from '../../utils/user_helper.js';
const APP_URL = process.env.APP_URL;

export const getMyAppointmentsClinic = apiHandler(async (req, res) => {
    const clinicId = req.user.clinicData.clinic_id;
    const now = dayjs.utc();
    const appointments = await appointmentModel.getAppointmentsByClinicId(clinicId);

    if (isEmpty(appointments)) {
        return apiError(messages.NOT_FOUND, "Appointments", null, res);
    }

    const result = appointments.map((app) => {
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
            start_time: startUTC.toISOString(),
            end_time: endUTC.toISOString(),
            videoCallOn
        };
    });

    return apiResponse(messages.FETCH, "Appointments", result, res);
});