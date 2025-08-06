import { handleError, handleSuccess } from '../../utils/responseHandler.js';
import * as appointmentModel from '../../models/appointment.js';
import dayjs from 'dayjs';
import { isEmpty } from '../../utils/user_helper.js';
import { asyncHandler } from "../../utils/responseHandler.js"
const APP_URL = process.env.APP_URL;

export const getMyAppointmentsClinic = asyncHandler(async (req, res) => {
    const clinicId = req.user.clinicData.clinic_id;
    const now = dayjs.utc();

    const appointments = await appointmentModel.getAppointmentsByClinicId(clinicId);

    if (isEmpty(appointments)) {
        return handleError(res, 404, "en", "APPOINTMENTS_NOT_FOUND");
    }

    const result = appointments.map((app) => {
        const localFormattedStart = app.start_time ? dayjs(app.start_time).format("YYYY-MM-DD HH:mm:ss") : null;
        const localFormattedEnd = app.end_time ? dayjs(app.end_time).format("YYYY-MM-DD HH:mm:ss") : null;

        if (app.profile_image && !app.profile_image.startsWith('http')) {
            app.profile_image = `${APP_URL}${app.profile_image}`;
        }

        const startUTC = localFormattedStart ? dayjs.utc(localFormattedStart) : null;
        const endUTC = localFormattedEnd ? dayjs.utc(localFormattedEnd) : null;

        const videoCallOn = (
            startUTC?.isValid() &&
            endUTC?.isValid() &&
            now.isAfter(startUTC) &&
            now.isBefore(endUTC)
        );

        return {
            ...app,
            start_time: startUTC ? startUTC.toISOString() : null,
            end_time: endUTC ? endUTC.toISOString() : null,
            videoCallOn
        };
    });


    return handleSuccess(res, 200, "en", "APPOINTMENTS_FETCHED_SUCCESSFULLY", result);
});