// ============================================================================
// IMPORTS & INITIAL SETUP
// ============================================================================
import db from '../config/db.js';
import { validateSchema } from '../middleware/validation.middleware.js';
import { getAppointmentsForNotification } from '../models/appointment.js';
import { getUserDataByReceiverIdAndRole, getUserDataByRole } from '../models/web_user.js';
import { extractUserData } from '../utils/misc.util.js';
import { isEmpty } from '../utils/user_helper.js';
import { sendNotificationSchema } from '../validations/notification.validation.js';
import admin from 'firebase-admin';
import fs from "fs";
import dayjs from 'dayjs';
import dotenv from "dotenv";
dotenv.config();
import path from "path";
import { fileURLToPath } from 'url';
// __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ============================================================================
// HELPERS
// ============================================================================

const buildFullImageUrl = (senderType, imageFileName) => {
    if (!imageFileName) return null;

    const baseUrl = process.env.APP_URL;

    switch (senderType) {
        case "DOCTOR":
        case "SOLO_DOCTOR":
            return `${baseUrl}doctor/profile_images/${imageFileName}`;
        case "CLINIC":
            return `${baseUrl}clinic/logo/${imageFileName}`;
        case "USER":
        case "ADMIN":
            return `${baseUrl}${imageFileName}`;
        default:
            return null;
    }
};

// ============================================================================
// TEMPLATES
// ============================================================================
export const NOTIFICATION_MESSAGES = {
    chat_message: {
        title: 'Chat Notification',
        getBody: (name) => `${name} sent you a message.`
    },
    appointment_booked: {
        title: 'Appointment',
        getBody: (name) => `${name} booked an appointment.`
    },
    appointment_rescheduled: {
        title: 'Appointment',
        getBody: (name) => `${name} rescheduled an appointment.`
    },
    appointment_completed: {
        title: 'Appointment',
        getBody: (name) => `${name} completed an appointment.`
    },
    upcoming_appointment: {
        title: 'Upcoming Appointment',
        getBody: (name) => `You have an upcoming appointment with ${name}.`
    },
    callback_requested: {
        title: 'Callback Request',
        getBody: (name) => `${name} requested a callback.`
    },
    cart_purchased: {
        title: 'Order Placed',
        getBody: (name) => ` ${name} has placed an order`
    },
    default: {
        title: (name) => `${name} Notification`,
        getBody: () => `You have a new notification.`
    },
    customMessage: (title = 'Notification', body = 'You have a custom notification.') => ({
        title,
        getBody: () => body,
        isCustom: true
    })
};

const getNotificationContent = (notification_type, full_name) => {
    let template;

    if (typeof notification_type === 'object' && typeof notification_type.getBody === 'function') {
        template = notification_type;
    } else {
        template = NOTIFICATION_MESSAGES[notification_type] || NOTIFICATION_MESSAGES.default;
    }

    const title = typeof template.title === 'function'
        ? template.title(full_name)
        : template.title;

    const body = template.getBody(full_name);

    return { title, body };
};

// ============================================================================
// FCM NOTIFICATION SENDER
// ============================================================================

if (!admin.apps.length) {
    const serviceAccountPath = path.resolve(__dirname, `../../${process.env.FIREBASE_SERVICE_ACCOUNT}`);
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const isPushNotificationEnabled = async (receiver_id, receiver_type) => {
    let query = '';

    switch (receiver_type) {
        case 'USER':
            query = 'SELECT is_push_notification_on FROM tbl_users WHERE user_id = ?';
            break;

        // case 'DOCTOR':
        //   query = 'SELECT is_push_notification_on FROM tbl_doctors WHERE doctor_id = ?';
        //   break;

        default:
            return true;
    }

    try {
        const result = await db.query(query, [receiver_id]);
        return Boolean(result[0]?.is_push_notification_on);

    } catch (error) {
        console.error('Error checking push notification status:', error);
        return false;
    }
};


const buildNotificationPayload = ({
    type,
    type_id,
    sender_id,
    sender_type,
    receiver_id,
    receiver_type,
    token,
    title,
    body
}) => ({
    notification: { title, body },
    data: {
        sendFrom: String(sender_id || ''),
        sendTo: String(receiver_id || ''),
        senderType: sender_type,
        receiverType: receiver_type,
        type,
        type_id,
    },
    token: token || ''
});

const pushToFCM = async (message) => {
    try {
        const response = await admin.messaging().send({
            token: message.token,
            notification: message.notification,
            data: message.data
        });
        return response;
    } catch (error) {
        console.error('FCM Error - pushToFCM:', error);
        throw new Error('Failed to send push notification');
    }
};

// ============================================================================
// SEND NOTIFICATION WRAPPER
// ============================================================================
const insertUserNotification = async ({
    sender_id = null,
    sender_type = null,
    receiver_id,
    receiver_type,
    type,
    type_id = null,
    title,
    body
}) => {
    try {
        const result = await db.query(
            `INSERT INTO tbl_notifications 
             (sender_id, sender_type, receiver_id, receiver_type, type, type_id, title, body) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                sender_id,
                sender_type,
                receiver_id,
                receiver_type,
                type,
                type_id,
                title,
                body
            ]
        );
        return result;
    } catch (error) {
        console.error('DB Error - insertUserNotification:', error);
        throw new Error('Failed to insert notification');
    }
};

/**
 * Sends a notification, stores it in the DB, and optionally pushes via FCM.
 */
export const sendNotification = async ({
    userData,
    type,
    type_id,
    notification_type,
    receiver_type,
    receiver_id,
    system = false
}) => {
    try {
        validateSchema(sendNotificationSchema, {
            userData,
            type,
            type_id,
            notification_type,
            receiver_type,
            receiver_id,
            system
        });
        const senderMeta = system ? userData : extractUserData(userData);
        const {
            user_id: sender_id,
            role: sender_type,
        } = senderMeta;

        const full_name = isEmpty(senderMeta?.full_name) ? 'Someone' : senderMeta?.full_name;

        const { title, body } = getNotificationContent(notification_type, full_name);
        const isPushEnabled = await isPushNotificationEnabled(receiver_id, receiver_type);
        const { token } = await getUserDataByReceiverIdAndRole(receiver_id, receiver_type)
        await insertUserNotification({
            sender_id,
            sender_type,
            receiver_id,
            receiver_type,
            type,
            type_id,
            title,
            body
        });

        console.log("Notification recorded in DB")

        const payload = buildNotificationPayload({
            type,
            type_id,
            sender_id,
            sender_type,
            receiver_id,
            receiver_type,
            token,
            title,
            body
        });

        if (token && isPushEnabled) {
            await pushToFCM(payload);
        }

        console.log("Notification sent via FCM")
    } catch (error) {
        console.error('Error in sendNotification:', error);
        // throw error;
    }
};

// ============================================================================
// FETCH USER NOTIFICATIONS
// ============================================================================
const groupSenderIdsByType = (notifications) => {
    const senderMap = new Map();
    for (const notification of notifications) {
        if (!senderMap.has(notification.sender_type)) {
            senderMap.set(notification.sender_type, new Set());
        }
        senderMap.get(notification.sender_type).add(notification.sender_id);
    }
    return senderMap;
};

const fetchSenderDetailsByType = async (senderMap) => {
    const senderDetails = {};

    const queries = Array.from(senderMap.entries()).map(async ([type, ids]) => {
        const idList = Array.from(ids);
        if (idList.length === 0) return;

        let table, idCol, nameCol = "name", imageCol = "profile_image";

        switch (type) {
            case "USER":
                table = "tbl_users";
                idCol = "user_id";
                nameCol = "full_name";
                imageCol = "profile_image";
                break;
            case "DOCTOR":
            case "SOLO_DOCTOR":
                table = "tbl_doctors";
                idCol = "doctor_id";
                nameCol = "name";
                imageCol = "profile_image";
                break;
            case "CLINIC":
                table = "tbl_clinics";
                idCol = "clinic_id";
                nameCol = "clinic_name";
                imageCol = "clinic_logo";
                break;
            case "ADMIN":
                table = "tbl_admin";
                idCol = "admin_id";
                nameCol = "full_name";
                imageCol = "profile_image";
                break;
            default:
                return;
        }

        const rows = await db.query(
            `SELECT ${idCol} AS sender_id, ${nameCol} AS sender_name, ${imageCol} AS sender_profile_image
             FROM ${table}
             WHERE ${idCol} IN (?)`,
            [idList]
        );

        return { type, rows };
    });

    const results = await Promise.all(queries);

    for (const result of results) {
        if (!result) continue;
        const { type, rows } = result;
        for (const row of rows) {
            senderDetails[`${type}:${row.sender_id}`] = {
                sender_name: row.sender_name,
                sender_profile_image: buildFullImageUrl(type, row.sender_profile_image),
            };
        }
    }

    return senderDetails;
};

const enrichNotifications = (notifications, senderDetails) => {
    return notifications.map(n => ({
        ...n,
        ...(senderDetails[`${n.sender_type}:${n.sender_id}`] || {
            sender_name: null,
            sender_profile_image: null
        })
    }));
};

export const getUserNotifications = async (userData) => {
    try {
        const { user_id: receiver_id } = extractUserData(userData);

        const notifications = await db.query(
            `SELECT * FROM tbl_notifications
             WHERE receiver_id = ?
             ORDER BY created_at DESC`,
            [receiver_id]
        );

        if (notifications.length === 0) return [];

        const senderMap = groupSenderIdsByType(notifications);
        const senderDetails = await fetchSenderDetailsByType(senderMap);
        const enrichedNotifications = enrichNotifications(notifications, senderDetails);

        return enrichedNotifications;

    } catch (error) {
        console.error('Error in getUserNotifications:', error);
        throw new Error('Failed to fetch notifications');
    }
};


// ============================================================================
// TOGGLE NOTIFICATIONS
// ============================================================================

export const toggleNotificationSetting = async (userData) => {
    try {
        const { user_id, role } = extractUserData(userData);

        let updateQuery = '';
        switch (role) {
            case 'USER':
                updateQuery = 'UPDATE tbl_users SET is_push_notification_on = NOT is_push_notification_on WHERE user_id = ?';
                break;
            default:
                return { affectedRows: 0 };
        }

        return await db.query(updateQuery, [user_id]);
    } catch (error) {
        console.error('Error in toggleNotificationSetting:', error);
        throw new Error('Failed to toggle notification setting');

    }
};

// ============================================================================
// Appointment Notifications CRON
// ============================================================================

export const getUpcomingAppointmentWindow = (minutesFromNow = 30) => {
    const now = dayjs();
    const windowStart = now.startOf('minute').format('YYYY-MM-DD HH:mm:ss');
    const windowEnd = now.add(minutesFromNow, 'minute').endOf('minute').format('YYYY-MM-DD HH:mm:ss');

    return { windowStart, windowEnd };
};

export const sendAppointmentPairNotification = async (appointment) => {
    const {
        appointment_id,
        user_id,
        doctor_id,
        user_name,
        doctor_name
    } = appointment;

    // Doctor → User
    await sendNotification({
        userData: {
            user_id: doctor_id,
            role: 'DOCTOR',
            full_name: doctor_name || 'Doctor',
            token: null
        },
        type: 'APPOINTMENT',
        type_id: appointment_id,
        notification_type: NOTIFICATION_MESSAGES.upcoming_appointment,
        receiver_type: 'USER',
        receiver_id: user_id,
        system: true
    });

    // User → Doctor
    await sendNotification({
        userData: {
            user_id: user_id,
            role: 'USER',
            full_name: user_name || 'Someone',
            token: null
        },
        type: 'APPOINTMENT',
        type_id: appointment_id,
        notification_type: NOTIFICATION_MESSAGES.upcoming_appointment,
        receiver_type: 'DOCTOR',
        receiver_id: doctor_id,
        system: true
    });
};

export const markAppointmentNotificationSent = async (appointment_id) => {
    try {
        const existing = await db.query(
            `SELECT appointment_notification_id 
             FROM tbl_appointments_notifications 
             WHERE appointment_id = ?`,
            [appointment_id]
        );

        if (existing.length) {
            await db.query(
                `UPDATE tbl_appointments_notifications 
                 SET notification_sent = 1 
                 WHERE appointment_id = ?`,
                [appointment_id]
            );
        } else {
            await db.query(
                `INSERT INTO tbl_appointments_notifications 
                 (appointment_id, notification_sent) 
                 VALUES (?, 1)`,
                [appointment_id]
            );
        }
    } catch (error) {
        console.error('❌ Error in markAppointmentNotificationSent:', error);
        throw new Error('Failed to mark appointment notification status.');
    }
};

export const sendAppointmentNotifications = async () => {
    try {
        const { windowStart, windowEnd } = getUpcomingAppointmentWindow(30);
        const appointments = await getAppointmentsForNotification(windowStart, windowEnd);

        if (!appointments.length) {
            console.log('No appointments found for notification.');
            return;
        }

        for (const appointment of appointments) {
            try {
                await sendAppointmentPairNotification(appointment);
                await markAppointmentNotificationSent(appointment.appointment_id);
            } catch (err) {
                console.error(`Failed to notify for appointment ${appointment.appointment_id}:`, err.message);
            }
        }

        console.log('Appointment notification cron completed.');
    } catch (error) {
        console.error('Cron job failed :', error.message);
    }
};
