import db from '../config/db.js';
import { validateSchema } from '../middleware/validation.middleware.js';
import { extractUserData } from '../utils/misc.util.js';
import { sendNotificationSchema } from '../validations/notification.validation.js';
// import admin from 'firebase-admin';

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

const getNotificationContent = (notification_type, fullName) => {
    let template;

    if (typeof notification_type === 'object' && typeof notification_type.getBody === 'function') {
        template = notification_type;
    } else {
        template = NOTIFICATION_MESSAGES[notification_type] || NOTIFICATION_MESSAGES.default;
    }

    const title = typeof template.title === 'function'
        ? template.title(fullName)
        : template.title;

    const body = template.getBody(fullName);

    return { title, body };
};

const buildNotificationPayload = ({
    type,
    type_id,
    notification_type,
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
        notification_type
    },
    token: token || ''
});

const insertUserNotification = async ({
    sender_id = null,
    sender_type = null,
    receiver_id,
    receiver_type,
    type,
    type_id = null,
    notification_type,
    title,
    body
}) => {
    try {
        const result = await db.query(
            `INSERT INTO tbl_notifications 
             (sender_id, sender_type, receiver_id, receiver_type, type, type_id, notification_type, title, body) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                sender_id,
                sender_type,
                receiver_id,
                receiver_type,
                type,
                type_id,
                notification_type,
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

export const pushToFCM = async (message) => {
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

/**
 * Sends a notification, stores it in the DB, and optionally pushes via FCM.
 *
 * @param {Object} params
 * @param {Object} params.userData - Sender's user object (from req.user)
 * @param {string} params.type - Notification category (e.g. 'Appointment')
 * @param {string} params.type_id - Associated item ID (e.g. appointment ID)
 * @param {string|Object} params.notification_type - Type from NOTIFICATION_MESSAGES or custom message object
 * @param {string} params.receiver_type - Role of the receiver (e.g. 'USER', 'DOCTOR', SOLO_DOCTOR, 'CLINIC', 'ADMIN')
 * @param {string} params.receiver_id - ID of the receiver (e.g. user ID, doctor ID, clinic ID, admin ID)
 */
export const sendNotification = async ({
    userData,
    type,
    type_id,
    notification_type,
    receiver_type,
    receiver_id,
}) => {

    validateSchema(sendNotificationSchema, {
        userData,
        type,
        type_id,
        notification_type,
        receiver_type,
        receiver_id,
    });

    const { sender_id, sender_type, fullName, token } = extractUserData(userData);
    const { title, body } = getNotificationContent(notification_type, fullName);

    await insertUserNotification({
        sender_id,
        sender_type,
        receiver_id,
        receiver_type,
        type,
        type_id,
        notification_type,
        title,
        body
    });

    const payload = buildNotificationPayload({
        type,
        type_id,
        notification_type,
        sender_id,
        sender_type,
        receiver_id,
        receiver_type,
        token,
        title,
        body
    });

    console.log("payload", payload);

    // if (token) {
    //     await pushToFCM(payload);
    // }
};