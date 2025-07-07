import { Server } from "socket.io";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv'
// import { NotificationTypes } from "./constant.js";
// import { createNotificationMessage, sendNotification, updateOnlineStatus } from "./user_helper.js";
import { createChat, fetchActiveChatsUsers, fetchChatById, fetchMessages, fetchMessagesById, getAdminChatsList, getCallLogs, getChatBetweenUsers, getUserChats, getUserChatsList, saveMessage } from "../models/chat.js";
import * as doctorModels from "../models/doctor.js";
import { getUserSockets, setIO } from "./socketManager.js";
import { handleError } from "./responseHandler.js";
import { get_user_by_id, get_web_user_by_id } from "../models/web_user.js";
dotenv.config();
const SECRET_KEY = process.env.AUTH_SECRETKEY;
const USER_JWT_SECRET = process.env.USER_JWT_SECRET;
const WEB_JWT_SECRET = process.env.WEB_JWT_SECRET;
const APP_URL = process.env.LOCAL_APP_URL;

const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    setIO(io);

    io.on("connection", async (socket) => {
        const authHeader = socket.handshake.headers.authorization;
        const userType = socket.handshake.headers['user-type'];

        if (!authHeader) {
            console.log("Authorization header is missing");
            socket.emit('unauthorized', {
                status: 401,
                message: 'Authorization header is missing',
                success: false,
            });
        }
        const token = authHeader.replace('Bearer ', '');
        let decoded;
        if (userType == 1) {
            decoded = jwt.verify(token, WEB_JWT_SECRET);
            decoded.id = decoded.web_user_id;

        } else {
            decoded = jwt.verify(token, USER_JWT_SECRET);
            decoded.id = decoded.user_id;
        }
        let loggedUserId = decoded.id;
        socket.join(loggedUserId.toString());


        socket.on('user_connected', async () => {
            try {
                let userId = decoded.id
                let chats = await getUserChats(userId);
                chats = chats.length > 0 ? chats : []
                io.in(userId.toString()).emit("chat_list", chats);
            } catch (error) {
                socket.emit("error", error.message);
            }
        });

        socket.on("fetch_chats", async () => {
            try {
                let userId = decoded.id
                let chats;
                if (userType == 1) {
                    chats = await getAdminChatsList(userId);
                    chats.map(chat => {
                        chat.profile_image = chat.profile_image != null ? `${APP_URL}${chat.profile_image}` : null;
                        return chat;
                    });

                } else {
                    chats = await getUserChatsList(userId);
                    chats.map(chat => {
                        chat.profile_image = null;
                        return chat;
                    });
                }
                socket.emit("chat_list", chats);
            } catch (error) {
                socket.emit("error", error.message);
            }
        });

        socket.on("fetch_messages", async ({ chatId }) => {
            try {
                let senderId = decoded.id;

                const messages = await fetchMessages(chatId);
                let fetchChatsUsers = await fetchChatById(chatId);
                let receiverId = fetchChatsUsers.map(chat =>
                    chat.userId_1 === senderId ? chat.userId_2 : chat.userId_1
                );

                let listOfDocterAvibility = await doctorModels.get_doctor_by_zynquser_id(receiverId);
                if (listOfDocterAvibility.length == 0) {
                    // socket.emit("error", "Doctor not found");
                    return { statusCode: 400, message: "DOCTOR_FETCH_SUCCESSFULLY", success: false, data: {} };
                }

                if (listOfDocterAvibility && listOfDocterAvibility[0].profile_image !== null || '') {
                    listOfDocterAvibility[0].profile_image = `${APP_URL}doctor/profile_images/${listOfDocterAvibility[0].profile_image}`;
                }
                if (messages.length > 0) {
                    messages.map(message => {
                        console.log('message', message.sender_id == senderId);

                        message.isOwnMessage = message.sender_id === senderId ? true : false;
                    });
                }

                const callLogs = await getCallLogs(senderId, receiverId);

                const formattedCallLogs = callLogs.map((log, index) => ({
                    id: 100000 + index,
                    chat_id: 0,
                    sender_id: log.sender_user_id,
                    message: 'null',
                    message_type: 'text',
                    is_read: 0,
                    createdAt: new Date(log.created_at),
                    updatedAt: null,
                    isOwnMessage: true,
                    isType: 'callLog',
                    status: log.status
                }));

                const formattedMessages = messages.map((msg) => ({
                    ...msg,
                    isType: 'message',
                    status: null
                }));

                const mergedData = [...formattedMessages, ...formattedCallLogs].sort((a, b) => {
                    const dateA = a.createdAt || a.updatedAt;
                    const dateB = b.createdAt || b.updatedAt;
                    return new Date(dateA) - new Date(dateB);
                });
                // socket.emit("chat_history", messages);
                socket.emit("chat_history", mergedData);
                socket.emit("chat_details", listOfDocterAvibility[0]);

            } catch (error) {
                console.log('error', error);
                socket.emit("error", error.message);
            }
        });

        socket.on("send_message", async ({ chatId, message, messageType }) => {
            try {
                let senderId = decoded.id;
                let ids = [senderId];
                let fetchChatsUsers = await fetchChatById(chatId);
                let receiverId = fetchChatsUsers.map(chat =>
                    chat.userId_1 === senderId ? chat.userId_2 : chat.userId_1
                );
                ids.push(...receiverId);
                ids = [...new Set(ids)];
                let result = await saveMessage(chatId, senderId, message, messageType);
                const messageId = result.insertId;
                const messageDetails = await fetchMessagesById(messageId);
                if (userType == 1) {
                    messageDetails[0].isOwnMessage = messageDetails[0].sender_id === senderId ? false : true;
                } else {
                    messageDetails[0].isOwnMessage = messageDetails[0].sender_id === senderId ? true : false;
                }
                // messageDetails[0].isOwnMessage = messageDetails[0].sender_id === senderId ? messageDetails[0].isOwnMessage = false : true;
                // const chats = await getUserChats(receiverId);
                // ----------------------------------------notification code ---------------------------comments----------------//
                // let isActiveUsersOrNot = await fetchActiveChatsUsers(receiverId)
                // if (isActiveUsersOrNot[0].isActive == 0) {
                // const notificationType = NotificationTypes.SEND_MESSAGE_NOTIFICATION;
                // const notificationSend = 'sendMessage';
                // const postId = chatId;
                // const notificationMessage = await createNotificationMessage({
                //     notificationSend,
                //     fullName,
                //     id: senderId,
                //     userId,
                //     followId: null,
                //     usersfetchFcmToken: fcmToken,
                //     notificationType,
                //     postId,
                // });
                // await sendNotification(notificationMessage, postId);
                // } else {
                ids.forEach(id => {
                    io.to(id).emit("new_message", messageDetails[0]);
                });
                let chats;
                if (userType == 1) {
                    chats = await getAdminChatsList(receiverId);
                } else {
                    chats = await getAdminChatsList(receiverId[0]);
                }
                io.in(receiverId).emit("chat_list", chats);

                // Optional: Update sender chat list also
                let senderChats;
                if (userType == 1) {
                    senderChats = await getAdminChatsList(messageDetails[0].sender_id);
                    // senderChats.map(chat => {
                    //     chat.profile_image = chat.profile_image != null ? `${APP_URL}${chat.profile_image}` : null;
                    //     return chat;
                    // });
                    // console.log('senderChats>>>>>>>>>>>>', senderChats);
                    // io.to(messageDetails[0].sender_id).emit("chat_list", senderChats);
                } else {
                    senderChats = await getAdminChatsList(receiverId[0]);
                    // senderChats = await getUserChatsList(messageDetails[0].sender_id);
                    // senderChats.map(chat => {
                    //     chat.profile_image = chat.profile_image != null ? `${APP_URL}${chat.profile_image}` : null;
                    //     return chat;
                    // });
                    // console.log('senderChats>>>>>>>>>>>>', senderChats);
                    // io.to(messageDetails[0].sender_id).emit("chat_list", senderChats);
                }
                senderChats.map(chat => {
                    chat.profile_image = chat.profile_image != null ? `${APP_URL}${chat.profile_image}` : null;
                    return chat;
                });
                console.log('senderChats>>>>>>>>>>>>', senderChats);
                io.to(messageDetails[0].sender_id).emit("chat_list", senderChats);

                // }
            } catch (error) {
                console.error("❌ send_message error:", error.message);
                socket.emit("error", error.message);
            }
        });

        socket.on("fetch_docter_messages", async ({ chatId }) => {
            try {
                let senderId = decoded.id;
                console.log('senderId', senderId);

                const messages = await fetchMessages(chatId);
                let fetchChatsUsers = await fetchChatById(chatId);
                let receiverId = fetchChatsUsers.map(chat =>
                    chat.userId_1 === senderId ? chat.userId_2 : chat.userId_1
                );
                let listOfUserAvibility = await get_user_by_id(receiverId[0]);
                if (listOfUserAvibility.length == 0) {
                    return { statusCode: 400, message: "DOCTOR_FETCH_SUCCESSFULLY", success: false, data: {} };
                }

                if (listOfUserAvibility && listOfUserAvibility[0].profile_image !== null || '') {
                    listOfUserAvibility[0].profile_image = `${APP_URL}doctor/profile_images/${listOfUserAvibility[0].profile_image}`;
                }
                if (messages.length > 0) {
                    messages.map(message => {
                        message.isOwnMessage = message.sender_id === senderId ? false : true;
                    });
                }
                console.log('senderId, receiverId', senderId, receiverId);

                const callLogs = await getCallLogs(senderId, receiverId[0]);
                console.log('callLogs', callLogs);

                const formattedCallLogs = callLogs.map((log, index) => ({
                    id: 100000 + index,
                    chat_id: 0,
                    sender_id: log.sender_user_id,
                    message: 'null',
                    message_type: 'text',
                    is_read: 0,
                    createdAt: new Date(log.created_at),
                    updatedAt: null,
                    isOwnMessage: true,
                    isType: 'callLog',
                    status: log.status
                }));

                const formattedMessages = messages.map((msg) => ({
                    ...msg,
                    isType: 'message',
                    status: null
                }));

                const mergedData = [...formattedMessages, ...formattedCallLogs].sort((a, b) => {
                    const dateA = a.createdAt || a.updatedAt;
                    const dateB = b.createdAt || b.updatedAt;
                    return new Date(dateA) - new Date(dateB);
                });
                console.log('mergedData', mergedData);

                // socket.emit("chat_history", messages);
                socket.emit("chat_docter_history", mergedData);
                socket.emit("chat_details", listOfUserAvibility[0]);

            } catch (error) {
                console.log('error', error);
                socket.emit("error", error.message);
            }
        });

    });

};

export default initializeSocket;
