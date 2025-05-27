import { get_clinics, get_doctors, get_users, get_latest_clinic } from '../../models/admin.js';
import { handleError, handleSuccess } from '../../utils/responseHandler.js';

export const get_dashboard = async (req, res) => {
    try {
        const [get_clinic, get_doctor, get_user, latest_clinic] = await Promise.all([
            get_clinics(),
            get_doctors(),
            get_users(),
            get_latest_clinic()
        ])

        const data = {
            get_clinics: get_clinic.length,
            get_doctors: get_doctor.length,
            get_users: get_user.length,
            get_earnings: 0,
            latest_clinic
        }

        return handleSuccess(res, 200, "en", "Get dashboard data retriev", data);
    } catch (error) {
        console.error("Failed dashboard:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};