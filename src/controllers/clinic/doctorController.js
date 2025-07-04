import Joi from "joi";
import ejs from 'ejs';
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken"
import * as clinicModels from "../../models/clinic.js";
import * as webModels from "../../models/web_user.js";
import { sendEmail } from "../../services/send_email.js";
import { generateAccessToken, generatePassword, generateVerificationLink } from "../../utils/user_helper.js";
import { handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const APP_URL = process.env.APP_URL;
const image_logo = process.env.LOGO_URL;


// export const sendDoctorInvitation = async (req, res) => {
//     try {

//         const schema = Joi.object({
//             emails: Joi.array().items(Joi.string().email()).required(),
//         });

//         if (typeof req.body.emails === 'string') {
//             try {
//                 req.body.emails = JSON.parse(req.body.emails);
//             } catch (err) {
//                 return handleError(res, 400, "en", "INVALID_JSON_FOR_EMAILS");
//             }
//         }

//         const { error, value } = schema.validate(req.body);
//         if (error) return joiErrorHandle(res, error);

//         const { emails } = value;
//         const emailTemplatePath = path.resolve(__dirname, "../../views/doctor_invite/en.ejs");

//         for (const email of emails) {
//             const [existingUser] = await webModels.get_web_user_by_email(email);
//             const [get_location] = await clinicModels.get_clinic_location_by_clinic_id(req.user.clinicData.clinic_id);

//             console.log(get_location, "get_location");
//             let doctor, doctor_id, password, newWebUser;

//             if (existingUser) {
//                 const [existingDoctor] = await clinicModels.get_doctor_by_zynq_user_id(existingUser.id);
//                 if (!existingDoctor) {
//                     doctor_id = uuidv4();
//                     const doctorData = {
//                         doctor_id,
//                         zynq_user_id: existingUser.id,
//                         created_at: new Date(),
//                     };
//                     await clinicModels.create_doctor(doctorData);
//                 } else {
//                     doctor_id = existingDoctor.doctor_id;
//                 }
//                 const [existingMap] = await clinicModels.get_doctor_clinic_map_by_both(doctor_id, req.user.clinicData.clinic_id);
//                 if (existingMap) {
//                     console.log("DOCTOR_ALREADY_EXISTS");
//                     continue;
//                 } else {
//                     const clinicMapData = {
//                         doctor_id,
//                         clinic_id: req.user.clinicData.clinic_id,
//                         assigned_at: new Date(),
//                     };
//                     await clinicModels.create_doctor_clinic_map(clinicMapData);
//                 }
//             } else {
//                 const roles = await clinicModels.getAllRoles();
//                 const doctorRole = roles.find(role => role.role === 'DOCTOR');
//                 if (!doctorRole) {
//                     continue;
//                 }

//                 password = generatePassword(email);
//                 const hashedPassword = await bcrypt.hash(password, 10);

//                 const doctorData = {
//                     email,
//                     password: hashedPassword,
//                     show_password: password,
//                     role_id: doctorRole.id,
//                     created_at: new Date(),
//                 };

//                 await webModels.create_web_user(doctorData);
//                 [newWebUser] = await webModels.get_web_user_by_email(email);

//                 const doctorTableData = {
//                     zynq_user_id: newWebUser.id,
//                     created_at: new Date(),
//                 };
//                 await clinicModels.create_doctor(doctorTableData);
//                 const [createdDoctor] = await clinicModels.get_doctor_by_zynq_user_id(newWebUser.id);
//                 doctor = createdDoctor;
//                 doctor_id = doctor.doctor_id;
//             }

//             const [doctorClinicMapForCreate] = await clinicModels.get_doctor_clinic_map_by_both(doctor_id, req.user.clinicData.clinic_id);
//             if (!doctorClinicMapForCreate) {
//                 const clinicMapData = {
//                     doctor_id,
//                     clinic_id: req.user.clinicData.clinic_id,
//                     assigned_at: new Date(),
//                 };
//                 await clinicModels.create_doctor_clinic_map(clinicMapData);
//             }

//             const [doctorClinicMap] = await clinicModels.get_doctor_clinic_map_by_both(doctor_id, req.user.clinicData.clinic_id);
//             const invitation_id = doctorClinicMap?.map_id;

//             let sendPassword = password;
//             if (!password && existingUser) {
//                 sendPassword = existingUser.show_password;
//             }

//             const emailHtml = await ejs.renderFile(emailTemplatePath, {
//                 clinic_name: req.user.clinicData.clinic_name,
//                 clinic_org_number: req.user.clinicData.org_number,
//                 clinic_city: get_location.city,
//                 clinic_street_address: get_location.street_address,
//                 clinic_state: get_location.state,
//                 clinic_zip: get_location.zip_code,
//                 clinic_phone: req.user.clinicData.mobile_number,
//                 clinic_email: req.user.clinicData.email,
//                 email,
//                 password: sendPassword,
//                 image_logo,
//                 invitation_id,
//                 invitation_link: `${APP_URL}clinic/accept-invitation?invitation_id=${invitation_id}`,
//             });

//             const emailOptions = {
//                 to: email,
//                 subject: "Doctor Invitation",
//                 html: emailHtml,
//             };
//             await sendEmail(emailOptions);
//         }
//         return handleSuccess(res, 200, 'en', "INVITATION_SENT_SUCCESSFULLY");

//     } catch (error) {
//         console.error("Error sending doctor invitation:", error);
//         return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
//     }
// };


export const sendDoctorInvitation = async (req, res) => {
    try {

        const schema = Joi.object({
            emails: Joi.array().items(Joi.string().email()).required(),
        });

        if (typeof req.body.emails === 'string') {
            try {
                req.body.emails = JSON.parse(req.body.emails);
            } catch (err) {
                return handleError(res, 400, "en", "INVALID_JSON_FOR_EMAILS");
            }
        }

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { emails } = value;
        const emailTemplatePath = path.resolve(__dirname, "../../views/doctor_invite/en.ejs");

        for (const email of emails) {
            const [existingUser] = await webModels.get_web_user_by_email(email);
            const [get_location] = await clinicModels.get_clinic_location_by_clinic_id(req.user.clinicData.clinic_id);

            console.log(get_location, "get_location");
            let doctor, doctor_id, password, newWebUser;

            if (existingUser) {
                const [existingDoctor] = await clinicModels.get_doctor_by_zynq_user_id(existingUser.id);
                if (!existingDoctor) {
                    doctor_id = uuidv4();
                    const doctorData = {
                        doctor_id,
                        zynq_user_id: existingUser.id,
                        created_at: new Date(),
                    };
                    await clinicModels.create_doctor(doctorData);
                } else {
                    doctor_id = existingDoctor.doctor_id;
                }
                const [existingMap] = await clinicModels.get_doctor_clinic_map_by_both(doctor_id, req.user.clinicData.clinic_id);
                if (existingMap) {
                    console.log("DOCTOR_ALREADY_EXISTS");
                    continue;
                } else {
                    const clinicMapData = {
                        doctor_id,
                        clinic_id: req.user.clinicData.clinic_id,
                        assigned_at: new Date(),
                    };
                    await clinicModels.create_doctor_clinic_map(clinicMapData);
                }
            } else {
                const roles = await clinicModels.getAllRoles();
                const doctorRole = roles.find(role => role.role === 'DOCTOR');
                if (!doctorRole) {
                    continue;
                }

                password = generatePassword(email);
                const hashedPassword = await bcrypt.hash(password, 10);

                const doctorData = {
                    email,
                    password: hashedPassword,
                    show_password: password,
                    role_id: doctorRole.id,
                    created_at: new Date(),
                };

                await webModels.create_web_user(doctorData);
                [newWebUser] = await webModels.get_web_user_by_email(email);

                const doctorTableData = {
                    zynq_user_id: newWebUser.id,
                    created_at: new Date(),
                };
                await clinicModels.create_doctor(doctorTableData);
                const [createdDoctor] = await clinicModels.get_doctor_by_zynq_user_id(newWebUser.id);
                doctor = createdDoctor;
                doctor_id = doctor.doctor_id;

                const [doctorClinicMapForCreate] = await clinicModels.get_doctor_clinic_map_by_both(doctor_id, req.user.clinicData.clinic_id);
                if (!doctorClinicMapForCreate) {
                    const clinicMapData = {
                        doctor_id,
                        clinic_id: req.user.clinicData.clinic_id,
                        assigned_at: new Date(),
                    };
                    await clinicModels.create_doctor_clinic_map(clinicMapData);
                }

                const [doctorClinicMap] = await clinicModels.get_doctor_clinic_map_by_both(doctor_id, req.user.clinicData.clinic_id);
                const invitation_id = doctorClinicMap?.map_id;

                let sendPassword = password;
                if (!password && existingUser) {
                    sendPassword = existingUser.show_password;
                }

                const emailHtml = await ejs.renderFile(emailTemplatePath, {
                    clinic_name: req.user.clinicData.clinic_name,
                    clinic_org_number: req.user.clinicData.org_number,
                    clinic_city: get_location.city,
                    clinic_street_address: get_location.street_address,
                    clinic_state: get_location.state,
                    clinic_zip: get_location.zip_code,
                    clinic_phone: req.user.clinicData.mobile_number,
                    clinic_email: req.user.clinicData.email,
                    email,
                    password: sendPassword,
                    image_logo,
                    invitation_id,
                    invitation_link: `${APP_URL}clinic/accept-invitation?invitation_id=${invitation_id}`,
                });

                const emailOptions = {
                    to: email,
                    subject: "Doctor Invitation",
                    html: emailHtml,
                };
                await sendEmail(emailOptions);
            }


        }
        return handleSuccess(res, 200, 'en', "INVITATION_SENT_SUCCESSFULLY");

    } catch (error) {
        console.error("Error sending doctor invitation:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const getAllDoctors = async (req, res) => {
    try {
        const clinic_id = req.user.clinicData.clinic_id;
        const doctors = await clinicModels.get_all_doctors_by_clinic_id(clinic_id);
        if (!doctors || doctors.length === 0) {
            return handleSuccess(res, 200, 'en', "DOCTORS_FETCHED_SUCCESSFULLY", []);
        }
        for (const doctor of doctors) {
            // Get doctor availability
            const availability = await clinicModels.getDoctorAvailability(doctor.doctor_id);
            doctor.availability = availability || null;

            // Get doctor certifications
            const certifications = await clinicModels.getDoctorCertifications(doctor.doctor_id);
            certifications.forEach(certification => {
                if (certification.upload_path && !certification.upload_path.startsWith('http')) {
                    certification.upload_path = `${APP_URL}/doctors/certifications/${certification.upload_path}`;
                }
            });
            doctor.certifications = certifications || [];


            // Get doctor education history
            const education = await clinicModels.getDoctorEducation(doctor.doctor_id);
            doctor.education = education || [];

            // Get doctor work experience
            const experience = await clinicModels.getDoctorExperience(doctor.doctor_id);
            doctor.experience = experience || [];

            // Get doctor reviews
            const reviews = await clinicModels.getDoctorReviews(doctor.doctor_id);
            doctor.reviews = reviews || [];

            // Get doctor severity levels
            const severityLevels = await clinicModels.getDoctorSeverityLevels(doctor.doctor_id);
            doctor.severity_levels = severityLevels || [];

            // Get doctor skin types
            const skinTypes = await clinicModels.getDoctorSkinTypes(doctor.doctor_id);
            doctor.skin_types = skinTypes || [];

            // Get doctor treatments
            const treatments = await clinicModels.getDoctorTreatments(doctor.doctor_id);
            doctor.treatments = treatments || [];
        }
        doctors.forEach(doctor => {
            if (doctor.profile_image && !doctor.profile_image.startsWith('http')) {
                doctor.profile_image = `${APP_URL}doctor/profile_images/${doctor.profile_image}`;
            }
        });

        return handleSuccess(res, 200, 'en', "DOCTORS_FETCHED_SUCCESSFULLY", doctors);

    } catch (error) {
        console.error("Error fetching doctors:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const getAllDoctorsById = async (req, res) => {
    try {
        const clinic_id = req.params.clinic_id;  // Get clinic_id from URL params
        const doctors = await clinicModels.get_all_doctors_by_clinic_id(clinic_id);
        if (!doctors || doctors.length === 0) {
            return handleSuccess(res, 200, 'en', "DOCTORS_FETCHED_SUCCESSFULLY", []);
        }

        for (const doctor of doctors) {
            // Get doctor availability
            const availability = await clinicModels.getDoctorAvailability(doctor.doctor_id);
            doctor.availability = availability || null;

            // Get doctor certifications
            const certifications = await clinicModels.getDoctorCertifications(doctor.doctor_id);
            certifications.forEach(certification => {
                if (certification.upload_path && !certification.upload_path.startsWith('http')) {
                    certification.upload_path = `${APP_URL}/doctors/certifications/${certification.upload_path}`;
                }
            });
            doctor.certifications = certifications || [];

            // Get doctor education history
            const education = await clinicModels.getDoctorEducation(doctor.doctor_id);
            doctor.education = education || [];

            // Get doctor work experience
            const experience = await clinicModels.getDoctorExperience(doctor.doctor_id);
            doctor.experience = experience || [];

            // Get doctor reviews
            const reviews = await clinicModels.getDoctorReviews(doctor.doctor_id);
            doctor.reviews = reviews || [];

            // Get doctor severity levels
            const severityLevels = await clinicModels.getDoctorSeverityLevels(doctor.doctor_id);
            doctor.severity_levels = severityLevels || [];

            // Get doctor skin types
            const skinTypes = await clinicModels.getDoctorSkinTypes(doctor.doctor_id);
            doctor.skin_types = skinTypes || [];

            // Get doctor treatments
            const treatments = await clinicModels.getDoctorTreatments(doctor.doctor_id);
            doctor.treatments = treatments || [];
        }

        doctors.forEach(doctor => {
            if (doctor.profile_image && !doctor.profile_image.startsWith('http')) {
                doctor.profile_image = `${APP_URL}doctor/profile_images/${doctor.profile_image}`;
            }
        });

        return handleSuccess(res, 200, 'en', "DOCTORS_FETCHED_SUCCESSFULLY", doctors);

    } catch (error) {
        console.error("Error fetching doctors:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const unlinkDoctor = async (req, res) => {
    try {
        const schema = Joi.object({
            doctor_id: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);
        const { doctor_id } = value;

        const clinic_id = req.user.clinicData.clinic_id;


        // Check if doctor exists and is linked to this clinic
        const [doctor] = await clinicModels.get_mapping_data_by_doctor_id(doctor_id);
        if (!doctor) {
            return handleError(res, 404, 'en', "DOCTOR_NOT_FOUND_OR_NOT_LINKED");
        }


        await clinicModels.delete_doctor_clinic_map(doctor_id);


        return handleSuccess(res, 200, 'en', "DOCTOR_UNLINKED_SUCCESSFULLY");

    } catch (error) {
        console.error("Error unlinking doctor:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const acceptInvitation = async (req, res) => {
    try {
        const schema = Joi.object({
            invitation_id: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.query);
        if (error) return joiErrorHandle(res, error);

        const { invitation_id } = value;

        const [mappingData] = await clinicModels.get_mapping_data_by_map_id(invitation_id);
        if (!mappingData) {
            return handleError(res, 404, 'en', "CLINIC_DOCTOR_MAP_NOT_FOUND");
        }

        const updateResult = await clinicModels.update_clinic_maping_data_accept_invitation(invitation_id);
        if (!updateResult || updateResult.affectedRows === 0) {
            return handleError(res, 400, 'en', "INVITATION_UPDATE_FAILED");
        }

        return res.render('doctor_invite/accept-invitation.ejs');

    } catch (error) {
        console.error("Error accepting invitation:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};


