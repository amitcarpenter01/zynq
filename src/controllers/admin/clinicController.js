import fs from 'fs';
import Joi from "joi";
import path from 'path';
import ejs from "ejs";
import xlsx from 'xlsx';
import bcrypt from "bcrypt";
import { generatePassword, generateToken } from '../../utils/user_helper.js';
import { handleError, handleSuccess, joiErrorHandle } from '../../utils/responseHandler.js';
import { insert_clinic } from '../../models/admin.js';
import * as adminModels from "../../models/admin.js";
import { fileURLToPath } from 'url';
import { sendEmail } from '../../services/send_email.js';
import moment from 'moment/moment.js';
import { calculateAndUpdateBulkClinicProfileCompletion } from '../../models/clinic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// export const import_clinics_from_CSV = async (req, res) => {
//     const filePath = req.file?.path;

//     if (!filePath) {
//         return handleError(res, 400, 'en', "CSV_REQUIRED");
//     }

//     const clinics = [];
//     fs.createReadStream(filePath)
//         .pipe(csv())
//         .on('data', (row) => {
//             console.log(row, "row data");

//             clinics.push({
//                 clinic_name: row.clinic_name || '',
//                 org_number: row.org_number || '',
//                 email: row.email || '',
//                 mobile_number: row.mobile_number || '',
//                 address: row.address || '',
//                 token: generateToken()
//             });
//         })
//         .on('end', async () => {
//             try {
//                 // for (const clinic of clinics) {
//                 //     await insert_clinic(clinic);
//                 // }
//                 // fs.unlinkSync(filePath);
//                 // return handleSuccess(res, 200, 'en', "CLINIC_IMPORT");

//             } catch (error) {
//                 console.error('Import failed:', error);
//                 return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
//             }
//         });
// };


export const import_clinics_from_CSV = async (req, res) => {
    const filePath = req.file?.path;

    if (!filePath) return handleError(res, 400, 'en', "CSV_REQUIRED");

    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const clinicData = xlsx.utils.sheet_to_json(sheet);

        const clinics = clinicData.map(row => ({
            clinic_name: row.clinic_name || '',
            org_number: row.org_number || '',
            email: row.email || '',
            mobile_number: row.mobile_number || '',
            address: row.address || '',
            token: generateToken()
        }));

        for (const clinic of clinics) {
            await insert_clinic(clinic);
        }

        fs.unlinkSync(filePath);
        return handleSuccess(res, 200, 'en', "CLINIC_IMPORT");
    } catch (error) {
        console.error("Import failed:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR " + error.message);
    }
};

export const add_clinic_managment = async (req, res) => {
    try {
        const schema = Joi.object({
            json_data: Joi.string().required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const clinicList = JSON.parse(value.json_data);

        const findRole = await adminModels.findRole('CLINIC');
        if (!findRole) return handleError(res, 404, 'en', "Role 'CLINIC' not found");

        const roleId = findRole.id;
        const insertedClinics = [];
        const skippedClinics = [];

        // Parallel processing using Promise.all with map
        await Promise.all(clinicList.map(async (ele) => {
            const email = ele['Email'];

            try {
                // Check email existence
                const existingUser = await adminModels.findClinicEmail(email);
                if (existingUser?.length > 0) {
                    skippedClinics.push({ email, reason: "Email already exists" });
                    return;
                }

                // Insert User
                await adminModels.addZynqUsers({ email, role_id: roleId });

                const [newUser] = await adminModels.findClinicEmail(email);
                if (!newUser) {
                    skippedClinics.push({ email, reason: "User not found after insert" });
                    return;
                }

                // Insert Clinic
                const clinicData = {
                    zynq_user_id: newUser.id,
                    clinic_name: ele['Clinic Name'],
                    org_number: ele['Swedish Organization Number'],
                    email: ele['Email'],
                    mobile_number: ele['Contact Number'],
                    address: ele['Address']
                };

                await adminModels.addClinic(clinicData);

                const [createdClinic] = await adminModels.findClinicByClinicUserId(newUser.id);
                if (!createdClinic) {
                    skippedClinics.push({ email, reason: "Clinic insert failed" });
                    return;
                }

                // Insert Clinic Location
                const clinicLocation = {
                    clinic_id: createdClinic.clinic_id,
                    city: ele['City'],
                    zip_code: ele['Postal Code']
                };
                await adminModels.addClinicLocationAddress(clinicLocation);

                insertedClinics.push({
                    email,
                    clinic_id: createdClinic.clinic_id
                });
            } catch (error) {
                skippedClinics.push({ email, reason: error.message });
            }
        }));

        return handleSuccess(res, 200, 'en', "Clinic imported completed.", {
            inserted: insertedClinics,
            skipped: skippedClinics
        });
    } catch (error) {
        console.error("internal E", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR " + error.message);
    }
};

export const get_clinic_managment = async (req, res) => {
    try {
        console.log('fgjgkgj');
        
        const clinics = await adminModels.get_clinic_managment();

        if (!clinics || clinics.length === 0) {
            return handleSuccess(res, 200, 'en', "No clinics found", { clinics: [] });
        }

        const fullClinicData = await Promise.all(
            clinics.map(async (clinic) => {
                clinic.clinic_logo = clinic.clinic_logo == null
                    ? null
                    : process.env.APP_URL + 'clinic/logo/' + clinic.clinic_logo;

                const treatments = await adminModels.get_clinic_treatments(clinic.clinic_id);
                const skinTypes = await adminModels.get_clinic_skintype(clinic.clinic_id);
                const severityLevels = await adminModels.get_clinic_serveritylevel(clinic.clinic_id);
                const skinConditionsLevel = await adminModels.get_clinic_skin_conditions(clinic.clinic_id);
                const surgeriesLevel = await adminModels.get_clinic_surgeries(clinic.clinic_id);
                const aestheticDevicesLevel = await adminModels.get_clinic_aesthetic_devices(clinic.clinic_id);

                return {
                    ...clinic,
                    treatments,
                    skinTypes,
                    severityLevels,
                    skinConditionsLevel,
                    surgeriesLevel,
                    aestheticDevicesLevel
                };
            })
        );
        await calculateAndUpdateBulkClinicProfileCompletion(fullClinicData);

        return handleSuccess(res, 200, 'en', "Fetch clinic management successfully", { clinics: fullClinicData });

    } catch (error) {
        console.error("internal E", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR " + error.message);
    }
};

export const delete_clinic_management = async (req, res) => {
    try {
        const schema = Joi.object({
            clinic_id: Joi.string().required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { clinic_id } = value;

        const result = await adminModels.delete_clinic_by_id(clinic_id);

        if (result && result.affectedRows === 0) {
            return handleSuccess(res, 404, 'en', "Clinic not found or already deleted", {});
        }

        return handleSuccess(res, 200, 'en', "Clinic deleted successfully", result);
    } catch (error) {
        console.error("Delete Clinic Error:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR " + error.message);
    }
};

export const send_invitation = async (req, res) => {
    try {
        const schema = Joi.object({
            invitation_ids: Joi.string().required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        let invitation_ids;
        try {
            const cleanJson = value.invitation_ids.replace(/'/g, '"');
            invitation_ids = JSON.parse(cleanJson);
        } catch (err) {
            console.error('Invalid JSON format in invitation_ids:', err.message);
            return handleError(res, 400, 'en', 'Invalid format for invitation_ids');
        }

        const clinics = await adminModels.findClinicById(invitation_ids);
        if (!clinics || clinics.length === 0) {
            return handleError(res, 404, 'en', 'No clinics found');
        }

        await Promise.all(clinics.map(async (clinic) => {
            const password = await generatePassword(clinic.email);
            const hashedPassword = await bcrypt.hash(password, 10);

            await adminModels.updatePasseordByClinicId(
                hashedPassword,
                password,
                clinic.zynq_user_id
            );

            const updatedEmailCount = (clinic.email_sent_count || 0) + 1;

            await adminModels.updateClinicCountAndEmailSent(
                clinic.clinic_id,
                updatedEmailCount,
                moment().format('YYYY-MM-DD HH:mm:ss')
            );
            const is_subscribed = clinic.clinic_id;

            const html = await ejs.renderFile(
                path.join(__dirname, "../../views/invitation-mail.ejs"),
                {
                    clinic_name: clinic.clinic_name,
                    organization_number: clinic.org_number,
                    email: clinic.email,
                    phone: clinic.mobile_number,
                    city: clinic.city,
                    postal_code: clinic.zip_code,
                    address: clinic.address,
                    password: password,
                    logo: process.env.LOGO_URL,
                    invitationLink: `${process.env.APP_URL}admin/subscribed/${is_subscribed}`,
                }
            );

            await sendEmail({
                to: clinic.email,
                subject: "You're One Step Away from Joining ZYNQ – Accept Your Invite",
                html,
            });
        }));

        return handleSuccess(res, 200, 'en', "Clinic invitation sent successfully");

    } catch (error) {
        console.error("Send Invitation Error:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR " + error.message);
    }
};

export const subscribed = async (req, res) => {
    try {
        const schema = Joi.object({
            is_subscribed: Joi.string().required()
        });


        const { error, value } = schema.validate(req.params);
        if (error) return joiErrorHandle(res, error);

        const { is_subscribed } = value;

        const gwetClinic = await adminModels.clinicSubscribed(is_subscribed);

        return res.redirect(`https://51.21.123.99/choose-role?id=${gwetClinic[0].zynq_user_id}`);
    } catch (error) {
        console.error("clinic unsubscribed Error:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR " + error.message);
    }
};

export const unsubscribed = async (req, res) => {
    try {
        const schema = Joi.object({
            is_unsubscribed: Joi.string().required()
        });

        const { error, value } = schema.validate(req.params);
        if (error) return joiErrorHandle(res, error);

        const { is_unsubscribed } = value;

        await adminModels.clinicUnsubscribed(is_unsubscribed);

        res.render("invitation_failed/failed.ejs");
    } catch (error) {
        console.error("clinic unsubscribed Error:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR " + error.message);
    }
};

