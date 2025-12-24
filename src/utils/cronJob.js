import ejs from "ejs";
import bcrypt from "bcrypt";
import path from "path";
import moment from "moment";
import cron from "node-cron";
import db from "../config/db.js";
import { fileURLToPath } from 'url';
import { sendEmail } from "../services/send_email.js";
import { generatePassword } from "./user_helper.js";
import { sendAppointmentNotifications } from "../services/notifications.service.js";
import { deleteGuestData, sendInvitationReminders } from "./misc.util.js";
import { processDueAuthorizedAppointments } from "../models/payment.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const image_logo = process.env.LOGO_URL;

let isRunning = false;


const send_clinic_email = async (clinic, isFirstEmail) => {
    try {
        const emailTemplatePath = path.resolve(__dirname, '../views/invite_email/en.ejs');
        let email = clinic.email;
        const password = generatePassword(email);
        const hashedPassword = await bcrypt.hash(password, 10);
        const emailHtml = await ejs.renderFile(emailTemplatePath, { image_logo, email, password });

        const emailOptions = {
            to: email,
            subject: "Verify Your Email Address",
            html: emailHtml,
        };

        await sendEmail(emailOptions);
        await db.query(
            "UPDATE tbl_clinics SET password = ?, show_password = ? , is_invited = 1 WHERE clinic_id = ?",
            [hashedPassword, password, clinic.clinic_id]
        );

        if (isFirstEmail) {
            await db.query(
                "UPDATE tbl_clinics SET email_sent_at = ?, is_invited = 1 WHERE clinic_id = ?",
                [moment().format('YYYY-MM-DD HH:mm:ss'), clinic.clinic_id]
            );
        }

    } catch (err) {
        console.error(`Failed to send email to ${clinic.email}`, err.message);
    }
};

export const send_clinic_email_cron = async () => {
    try {
        cron.schedule("*/10 * * * * *", async () => {
            if (isRunning) {
                return;
            }

            isRunning = true;

            try {
                const clinics = await db.query("SELECT * FROM tbl_clinics WHERE is_invited = 0 AND is_active = 0");


                for (let clinic of clinics) {
                    if (!clinic.email_sent_at) {
                        // First time email, send it
                        await send_clinic_email(clinic, true);
                        continue;
                    }

                    const lastSentDate = moment(clinic.email_sent_at);

                    // Check if date is valid just in case
                    if (!lastSentDate.isValid()) {
                        continue;
                    }

                    const daysSinceLastEmail = moment().diff(lastSentDate, "days");

                    if (daysSinceLastEmail === 0) {
                    } else if (daysSinceLastEmail === 7 || daysSinceLastEmail === 14) {
                        await send_clinic_email(clinic, false);
                    } else {
                    }
                }


            } catch (err) {
                console.error("Error in clinic email cron:", err.message);
            } finally {
                isRunning = false;
            }
        });
    } catch (err) {
        console.error("Error setting up clinic email cron:", err.message);
    }
};

// Schedule: Every 10 minutes
// export const appointmentReminderCron = () => {
//     cron.schedule('*/10 * * * *', sendAppointmentNotifications);
// };
export const appointmentReminderCron = () => {
    cron.schedule('*/10 * * * *', sendAppointmentNotifications);
    cron.schedule('0 * * * *', processDueAuthorizedAppointments);
};

export const invitationReminderCron = () => {
    cron.schedule('0 6 * * *', sendInvitationReminders);
}

export const deleteGuestDataCron = () => {
    cron.schedule('0 3 * * *', deleteGuestData);
}

