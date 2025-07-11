// ============================================================================
// IMPORTS & INITIAL SETUP
// ============================================================================
import db from '../config/db.js';
import { validateSchema } from '../middleware/validation.middleware.js';
import { isEmpty } from '../utils/user_helper.js';
import { sendNotificationSchema } from '../validations/notification.validation.js';
// import admin from 'firebase-admin';
import dotenv from "dotenv";
dotenv.config();

// ============================================================================
// HELPERS
// ============================================================================
const extractUserData = (userData) => {
    if (!userData || !userData.role) {
        throw new Error("Invalid user data");
    }

    const role = userData.role;
    const token = userData.fcm_token || null;

    let user_id, full_name;

    switch (role) {
        case 'DOCTOR':
        case 'SOLO_DOCTOR':
            user_id = userData?.doctorData?.doctor_id;
            full_name = userData?.doctorData?.name || "Someone";
            break;

        case 'CLINIC':
            user_id = userData?.clinicData?.clinic_id;
            full_name = userData?.clinicData?.clinic_name || "Someone";
            break;

        case 'USER':
            user_id = userData?.user_id;
            full_name = userData?.full_name || "Someone";
            break;

        case 'ADMIN':
            user_id = userData?.admin_id;
            full_name = userData?.full_name || "Someone";
            break;

        default:
            throw new Error("Unsupported role");
    }

    if (!user_id) {
        throw new Error(`${role} ID not found in userData`);
    }

    return { user_id, role, full_name, token };
};

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

// if (!admin.apps.length) {
//     admin.initializeApp({
//         credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
//     });
// }

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
            return false;
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
}) => {
    try {
        validateSchema(sendNotificationSchema, {
            userData,
            type,
            type_id,
            notification_type,
            receiver_type,
            receiver_id,
        });

        const { user_id: sender_id, role: sender_type, full_name, token } = extractUserData(userData);
        const { title, body } = getNotificationContent(notification_type, full_name);
        const isPushEnabled = await isPushNotificationEnabled(receiver_id, receiver_type);

        console.log('isPushEnabled:', isPushEnabled);
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