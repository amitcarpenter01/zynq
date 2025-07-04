import { handleError, handleSuccess } from '../../utils/responseHandler.js';
import * as appointmentModel from '../../models/appointment.js';
import dayjs from 'dayjs';
import { isEmpty } from '../../utils/user_helper.js';
const APP_URL = process.env.APP_URL;

export const getMyAppointmentsClinic = asyncHandler(async (req, res) => {
    const clinicId = req.user.clinicData.clinic_id;
    const now = dayjs.utc();

    const appointments = await appointmentModel.getAppointmentsByClinicId(clinicId);

    if (isEmpty(appointments)) {
        return handleError(res, 404, "en", "APPOINTMENTS_NOT_FOUND");
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

    return handleSuccess(res, 200, "en", "APPOINTMENTS_FETCHED_SUCCESSFULLY", result);
});