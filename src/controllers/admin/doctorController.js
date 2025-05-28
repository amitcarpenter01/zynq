import * as adminModels from "../../models/admin.js";
import { handleError, handleSuccess } from "../../utils/responseHandler.js";
import { calculateProfileCompletionPercentageByDoctorId } from "../doctor/profileController.js";

export const get_doctors_management = async (req, res) => {
    try {
        const doctors = await adminModels.get_doctors_management();

        if (!doctors || doctors.length === 0) {
            return handleSuccess(res, 200, 'en', "No doctors found", { doctors: [] });
        }

        const fullDoctorData = await Promise.all(
            doctors.map(async (doctor) => {
                doctor.profile_image = doctor.profile_image == null ? null : process.env.APP_URL + 'doctor/profile_images/' + doctor.profile_image;
                const experince = await adminModels.get_doctor_experience(doctor.doctor_id);
                const education = await adminModels.get_doctor_education(doctor.doctor_id);
                const treatments = await adminModels.get_doctor_treatments(doctor.doctor_id);
                const skinTypes = await adminModels.get_doctor_skin_types(doctor.doctor_id);
                const severityLevels = await adminModels.get_doctor_severity_levels(doctor.doctor_id);
                const completionPercantage = await calculateProfileCompletionPercentageByDoctorId(doctor.doctor_id)
                return {
                    ...doctor,
                    onboarding_progress:completionPercantage,
                    experince,
                    education,
                    treatments,
                    skinTypes,
                    severityLevels
                };
            })
        );

        return handleSuccess(res, 200, 'en', "Fetch doctor management successfully", { Doctors: fullDoctorData });
    } catch (error) {
        console.error("internal E", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR " + error.message);
    }
};