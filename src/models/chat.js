import db from "../config/db.js";
import { formatImagePath } from "../utils/user_helper.js";


export const getUserChats = async (userId) => {
    return await db.query(
        `SELECT * FROM tbl_chats WHERE userId_1 = ? OR userId_2 = ? ORDER BY updatedAt DESC`,
        [userId, userId]
    );
}

export const getChatBetweenUsers = async (user1, user2) => {
    return await db.query(
        `SELECT * FROM tbl_chats 
         WHERE (userId_1 = ? AND userId_2 = ?) OR (userId_1 = ? AND userId_2 = ?)`,
        [user1, user2, user2, user1]
    );
}

export const createChat = async (user1, user2) => {
    return await db.query(`INSERT INTO tbl_chats (userId_1, userId_2) VALUES (?, ?)`, [user1, user2]);
}

export const saveMessage = async (chatId, senderId, message, messageType) => {
    return db.query(` INSERT INTO tbl_message (chat_id, sender_id, message, message_type) VALUES (?, ?, ?, ?)
      `, [chatId, senderId, message, messageType]);
};


export const fetchMessages = async (chatId) => {
    const query = `
        SELECT 
            m.id AS message_id,
            m.chat_id,
            m.sender_id,
            m.message,
            m.message_type,
            m.createdAt,
            m.updatedAt,
            mf.files
        FROM tbl_message m
        JOIN tbl_chats c ON c.id = m.chat_id 
        LEFT JOIN tbl_message_files mf ON m.id = mf.message_id
        WHERE m.chat_id = ?
        ORDER BY m.createdAt ASC
    `;

    const rows = await db.query(query, [chatId]);
    const messagesMap = new Map();

    for (const row of rows) {
        const msgId = row.message_id;

        if (!messagesMap.has(msgId)) {
            messagesMap.set(msgId, {
                message_id: row.message_id,
                chat_id: row.chat_id,
                sender_id: row.sender_id,
                message: row.message,
                message_type: row.message_type,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
                files: []
            });
        }

        if (row.files) {
            const formattedFile = formatImagePath(row.files, 'uploads/chat_files');
            messagesMap.get(msgId).files.push(formattedFile);
        }
    }

    return Array.from(messagesMap.values());
};

export const fetchChatById = async (id) => {
    return db.query(`SELECT * FROM tbl_chats WHERE id = ? `, [id]);
};


export const fetchMessagesById = async (id) => {
    const rows = await db.query(`
        SELECT 
            m.*, 
            mf.files 
        FROM tbl_message m
        LEFT JOIN tbl_message_files mf ON m.id = mf.message_id
        WHERE m.id = ?
    `, [id]);

    if (!rows || rows.length === 0) return null;

    const baseMessage = { ...rows[0] };

    baseMessage.files = rows
        .filter(row => row.files !== null)
        .map(row => formatImagePath(row.files, 'uploads/chat_files'));

    return [baseMessage];
};


export const insertChatUsersActive = async (Data) => {
    return db.query('INSERT into tbl_user_active set ?', [Data])
};

export const fetchActiveChatsUsers = async (id) => {
    return db.query(`SELECT * FROM tbl_user_active WHERE userId = ? `, [id]);
};

// export const getAdminChatsList = async (userId) => {
//     return await db.query(
//         `SELECT 
//             c.*, 
//             u.user_id ,
//             u.full_name,
//             u.profile_image
//          FROM tbl_chats c
//          JOIN tbl_users u 
//            ON u.user_id = CASE 
//                WHEN c.userId_1 = ? THEN c.userId_2
//                ELSE c.userId_1
//            END
//          WHERE c.userId_1 = ? OR c.userId_2 = ?
//          ORDER BY c.createdAt DESC`,
//         [userId, userId, userId]
//     );
// }

// export const getUserChatsList = async (userId) => {
//     return await db.query(
//         `SELECT 
//             c.*, 
//             d.zynq_user_id ,
//             d.name,
//             d.profile_image
//          FROM tbl_chats c
//          JOIN tbl_doctors d 
//            ON d.zynq_user_id = CASE 
//                WHEN c.userId_1 = ? THEN c.userId_2
//                ELSE c.userId_1
//            END
//          WHERE c.userId_1 = ? OR c.userId_2 = ?
//          ORDER BY c.createdAt DESC`,
//         [userId, userId, userId]
//     );
// }

export const toActivateUsers = async (isActive, chat_id, doctorId) => {
    return await db.query(`UPDATE tbl_user_active SET isActive = ? WHERE userId = ? AND chat_id = ?`, [isActive, doctorId, chat_id]);
}

export const getCallLogs = async (senderId, receiverId) => {
    return await db.query(`SELECT * FROM tbl_call_logs WHERE sender_user_id = ? OR sender_doctor_id = ? OR receiver_user_id = ? OR receiver_doctor_id = ?`, [senderId, senderId, receiverId, receiverId]);
}


// ---------------------------------------update chat query---------------------------------------

export const getUserChatsList = async (userId) => {
    return await db.query(
        `SELECT 
            c.*, 
            d.zynq_user_id,
            d.name,
            d.profile_image,
            m.message AS last_message,
            m.createdAt AS last_message_at
         FROM tbl_chats c
         JOIN tbl_doctors d 
           ON d.zynq_user_id = CASE 
               WHEN c.userId_1 = ? THEN c.userId_2
               ELSE c.userId_1
           END
         LEFT JOIN (
             SELECT m1.*
             FROM tbl_message m1
             INNER JOIN (
                 SELECT chat_id, MAX(createdAt) AS max_createdAt
                 FROM tbl_message
                 GROUP BY chat_id
             ) m2
             ON m1.chat_id = m2.chat_id AND m1.createdAt = m2.max_createdAt
         ) m
           ON m.chat_id = c.id
         WHERE c.userId_1 = ? OR c.userId_2 = ?
         ORDER BY m.createdAt DESC`,
        [userId, userId, userId]
    );
};

export const getAdminChatsList = async (userId) => {
    return await db.query(
        `SELECT 
            c.*, 
            u.user_id,
            u.full_name,
            u.profile_image,
            m.message AS last_message,
            m.createdAt AS last_message_at
         FROM tbl_chats c
         JOIN tbl_users u 
           ON u.user_id = CASE 
               WHEN c.userId_1 = ? THEN c.userId_2
               ELSE c.userId_1
           END
         LEFT JOIN (
             SELECT m1.*
             FROM tbl_message m1
             INNER JOIN (
                 SELECT chat_id, MAX(createdAt) AS max_createdAt
                 FROM tbl_message
                 GROUP BY chat_id
             ) m2
             ON m1.chat_id = m2.chat_id AND m1.createdAt = m2.max_createdAt
         ) m
           ON m.chat_id = c.id
         WHERE c.userId_1 = ? OR c.userId_2 = ?
         ORDER BY m.createdAt DESC`,
        [userId, userId, userId]
    );
};

export const uploadMessageFiles = async (chatId, messageId, files) => {
    try {
        if (!chatId || !messageId || !Array.isArray(files) || files.length === 0) return;

        const values = files.map(file => [chatId, messageId, file]);

        await db.query(
            `INSERT INTO tbl_message_files (chat_id, message_id, files) VALUES ?`,
            [values]
        );
    } catch (error) {
        console.error("❌ uploadMessageFiles error:", error.message);
        // throw new Error("Failed to save message files.");
    }
};




