import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';
import ejs from 'ejs';
import { sendEmail } from './sendEmail';

const APP_URL = process.env.APP_URL;
const image_logo = process.env.LOGO_URL;

const connection = new IORedis();

const emailQueue = new Queue('emailQueue', { connection });

export const addEmailToQueue = async (data) => {
    await emailQueue.add('sendDoctorInvitation', data);
};

const worker = new Worker('emailQueue', async (job) => {
    const { email, clinicData, password, invitation_id, location } = job.data;

    const emailTemplatePath = path.resolve(__dirname, "../views/doctor_invite/en.ejs");
    const emailHtml = await ejs.renderFile(emailTemplatePath, {
        clinic_name: clinicData.clinic_name,
        clinic_org_number: clinicData.org_number,
        clinic_city: location.city,
        clinic_street_address: location.street_address,
        clinic_state: location.state,
        clinic_zip: location.zip_code,
        clinic_phone: clinicData.mobile_number,
        clinic_email: clinicData.email,
        email,
        password,
        image_logo,
        invitation_id,
        invitation_link: `${APP_URL}clinic/accept-invitation?invitation_id=${invitation_id}`,
    });

    const emailOptions = {
        to: email,
        subject: "Expert Invitation",
        html: emailHtml,
    };

    await sendEmail(emailOptions);

    console.log(`Email sent to: ${email}`);
}, { connection });

worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err);
});



