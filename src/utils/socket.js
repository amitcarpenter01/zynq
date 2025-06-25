import { Server } from "socket.io";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv'
// import { NotificationTypes } from "./constant.js";
// import { createNotificationMessage, sendNotification, updateOnlineStatus } from "./user_helper.js";
import { createChat, fetchActiveChatsUsers, fetchChatById, fetchMessages, fetchMessagesById, getAdminChatsList, getChatBetweenUsers, getUserChats, getUserChatsList, saveMessage } from "../models/chat.js";
import * as doctorModels from "../models/doctor.js";
import { getUserSockets, setIO } from "./socketManager.js";
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
        // const roomName = loggedUserId.toString().trim();
        // socket.join(roomName);

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
                } else {
                    chats = await getUserChatsList(userId);
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
                    return handleError(res, 400, language, "DOCTOR_FETCH_SUCCESSFULLY", {});
                }
                if (listOfDocterAvibility[0].profile_image !== null || '') {
                    listOfDocterAvibility[0].profile_image = `${APP_URL}doctor/profile_images/${listOfDocterAvibility[0].profile_image}`;
                }
                if (messages.length > 0) {
                    messages.map(message => {
                        message.isOwnMessage = message.sender_id === senderId ? true : false;
                    });
                }
                socket.emit("chat_history", messages);
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
                messageDetails[0].isOwnMessage = messageDetails[0].senderId === senderId ? messageDetails[0].isOwnMessage = true : false;
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
                    chats = await getUserChatsList(receiverId);
                }
                io.in(receiverId).emit("chat_list", chats);

                // }
            } catch (error) {
                console.error("❌ send_message error:", error.message);
                socket.emit("error", error.message);
            }
        });



        // socket.on("send_message", async ({ receiverId, message, messageType }) => {
        //     try {
        //         let senderId = decoded.data.id;
        //         let chat = await getChatBetweenUsers(senderId, receiverId);
        //         let chatId;
        //         let result;
        //         if (chat.length === 0) {
        //             chat = await createChat(senderId, receiverId);
        //             chatId = chat.insertId
        //             result = await saveMessage(chatId, senderId, message, messageType);
        //             const chats = await getUserChats(receiverId);
        //             io.in(receiverId.toString()).emit("chat_list", chats);
        //             // const unreadChatsCount = chats.filter(chat => chat.unread_count !== 0).length;
        //             // io.in(receiverId.toString()).emit("chat_unread_count", unreadChatsCount);

        //             // ----------------------------------------notification code ---------------------------comments----------------//

        //             // const notificationType = NotificationTypes.SEND_MESSAGE_NOTIFICATION;
        //             // const notificationSend = 'sendMessage';
        //             // const postId = chatId;
        //             // const notificationMessage = await createNotificationMessage({
        //             //     notificationSend,
        //             //     fullName,
        //             //     id: senderId,
        //             //     userId,
        //             //     followId: null,
        //             //     usersfetchFcmToken: fcmToken,
        //             //     notificationType,
        //             //     postId,
        //             // });
        //             // await sendNotification(notificationMessage, postId);
        //         } else {
        //             chatId = chat.id;
        //         }
        //         result = await saveMessage(chatId, senderId, message, messageType);
        //         const messageId = result.insertId;
        //         const messageDetails = await fetchMessagesById(messageId);
        //         messageDetails[0].isOwnMessage = true;
        //         io.to(`chat_${chatId}`).emit("new_message", messageDetails[0]);
        //         // io.in(senderId.toString()).emit("new_message", messageDetails[0]);
        //         // io.in(receiverId.toString()).emit("new_message", messageDetails[0]);
        //     } catch (error) {
        //         console.error("❌ send_message error:", error.message);
        //         socket.emit("error", error.message);
        //     }
        // });















        // socket.on('join_chat', async ({ chatId }) => {
        //     try {
        //         const currentUserId = decoded.data.id;
        //         let isActive = 1
        //         if (currentChatRoom) {
        //             socket.leave(currentChatRoom);
        //         }
        //         currentChatRoom = `chat_${chatId}`;
        //         socket.join(currentChatRoom);
        //         socket.chatId = chatId;
        //         let isUserActiveOrNot = await isUserActive(chatId, currentUserId)
        //         if (isUserActiveOrNot.length > 0) {
        //             await toActivateUsers(isActive, chatId, currentUserId)
        //         } else {
        //             await createActivateUsers(chatId, currentUserId, isActive)
        //         }

        //         let messages = await fetchMessages(chatId);
        //         let chatsDetaileds = await fetchChatByIds(chatId)
        //         let messagesList = [];
        //         if (messages.length > 0) {
        //             messagesList = messages.map(item => ({
        //                 ...item,
        //                 isOwnMessage: item.sender_id === currentUserId ? true : false
        //             }));
        //         }
        //         let userMessageDetailed = {};

        //         if (chatsDetaileds[0].is_group == 1) {
        //             // Group chat

        //             userMessageDetailed = {
        //                 chat_id: chatsDetaileds[0].id,
        //                 is_group: chatsDetaileds[0].is_group,
        //                 chat_name: chatsDetaileds[0].chat_name,
        //                 created_by: chatsDetaileds[0].created_by,
        //                 groupProfile: chatsDetaileds[0].groupProfile,
        //                 groupDescription: chatsDetaileds[0].groupDescription,
        //                 createdAt: chatsDetaileds[0].createdAt,
        //                 updatedAt: chatsDetaileds[0].updatedAt,
        //                 user_id: chatsDetaileds[0].id,
        //                 user_name: 'Unknown',
        //                 profileImage: null,
        //                 // is_user_blocked_me: is_user_blocked_me.length > 0,
        //                 // is_user_blocked_by_me: is_user_blocked_by_me.length > 0
        //             };
        //             //     } else {
        //             //         const chats = await fetchChatMemberByChatsIds(chatId);
        //             //         let isActive;
        //             //         if (chats.length !== 2) return;
        //             //         const user1 = chats[0].user_id;
        //             //         const user2 = chats[1].user_id;
        //             //         const user1Status = await isUserActive(chatId, user1);
        //             //         const user2Status = await isUserActive(chatId, user2);
        //             //         const isUser1Active = user1Status.length > 0 ? user1Status[0].isActive : 0;
        //             //         isActive = isUser1Active
        //             //         const isUser2Active = user2Status.length > 0 ? user2Status[0].isActive : 0;
        //             //         isActive = isUser2Active
        //             //         const socket1 = userSockets.get(user1);
        //             //         if (socket1 && io.sockets.sockets.get(socket1)) {
        //             //             io.to(socket1).emit('isUsersOnlineOrOffline', isActive);
        //             //         }
        //             //         const socket2 = userSockets.get(user2);
        //             //         if (socket2 && io.sockets.sockets.get(socket2)) {
        //             //             io.to(socket2).emit('isUsersOnlineOrOffline', isActive);
        //             //         }
        //             //         const opponentUserId = user1 === currentUserId ? user2 : user1;
        //             //         const fetchUserDeta = await fetchUserById(opponentUserId);
        //             //         const is_user_blocked_me = await fetchOtherUserBlockedListUsers(opponentUserId, currentUserId);
        //             //         const is_user_blocked_by_me = await fetchOtherUserBlockedListUsers(currentUserId, opponentUserId);

        //             //         userMessageDetailed = {
        //             //             chat_id: chatsDetaileds[0].id,
        //             //             is_group: chatsDetaileds[0].is_group,
        //             //             chat_name: fetchUserDeta[0]?.user_name,
        //             //             created_by: chatsDetaileds[0].created_by,
        //             //             groupProfile: null,
        //             //             createdAt: chatsDetaileds[0].createdAt,
        //             //             updatedAt: chatsDetaileds[0].updatedAt,
        //             //             user_id: opponentUserId,
        //             //             user_name: fetchUserDeta[0]?.user_name,
        //             //             profileImage: fetchUserDeta[0]?.profileImage,
        //             //             is_user_blocked_me: is_user_blocked_me.length > 0,
        //             //             is_user_blocked_by_me: is_user_blocked_by_me.length > 0
        //             //         };

        //             //     }
        //             //     await updateUnreadCount(0, chatId, currentUserId);
        //             //     socket.emit("chat_history", messagesList);
        //             //     socket.emit("chatId_detailed", userMessageDetailed);
        //             // } 
        //         } else {
        //             // One-to-one chat
        //             const chats = await fetchChatMemberByChatsIds(chatsDetaileds[0].id);
        //             const otherUsers = chats.filter(chat => chat.user_id !== currentUserId);
        //             const fetchUserDeta = await fetchUserById(otherUsers[0].user_id);
        //             let is_user_blocked_me = await fetchOtherUserBlockedListUsers(otherUsers[0].user_id, currentUserId);
        //             let is_user_blocked_by_me = await fetchOtherUserBlockedListUsers(currentUserId, otherUsers[0].user_id);

        //             userMessageDetailed = {
        //                 chat_id: chatsDetaileds[0].id,
        //                 is_group: chatsDetaileds[0].is_group,
        //                 chat_name: fetchUserDeta[0]?.user_name,
        //                 created_by: chatsDetaileds[0].created_by,
        //                 groupProfile: null,
        //                 createdAt: chatsDetaileds[0].createdAt,
        //                 updatedAt: chatsDetaileds[0].updatedAt,
        //                 user_id: otherUsers[0].user_id,
        //                 user_name: fetchUserDeta[0]?.user_name,
        //                 profileImage: fetchUserDeta[0]?.profileImage,
        //                 is_user_blocked_me: is_user_blocked_me.length > 0,
        //                 is_user_blocked_by_me: is_user_blocked_by_me.length > 0
        //             };
        //         }
        //         socket.emit("chat_history", messagesList);
        //         socket.emit("chatId_detailed", userMessageDetailed);

        //     }
        //     catch (error) {
        //         console.error('Error fetching chat history:', error);
        //         socket.emit("error", error.message);
        //     }
        // });



        // socket.on('isUser', async ({ userId }) => {
        //     let userDetails = await fetchUsersById(userId);
        //     socket.emit("isOnline", userDetails[0]);
        // });


        // socket.on("mark_as_read", async ({ messageId, userId }) => {
        //     try {
        //         await markMessageAsRead(messageId);
        //         const chatInfo = await fetchChatIdByMessageId(messageId);
        //         const chatId = chatInfo[0]?.chat_id;
        //         socket.emit("message_read", { messageId });
        //         const messages = await fetchMessages(chatId);
        //         socket.emit("chat_history", messages);
        //         const chatMembers = await fetchAllChatsMembers(chatId, userId); // Excludes current user
        //         const recipientUserId = chatMembers[0]?.user_id;
        //         const recipientSocketId = userSockets.get(recipientUserId);
        //         console.log('userSockets', userSockets);

        //         console.log('recipientSocketId', recipientSocketId);

        //         if (recipientSocketId && io.sockets.sockets.get(recipientSocketId)) {
        //             io.to(recipientSocketId).emit("message_read", {
        //                 messageId,
        //                 seenBy: userId,
        //             });

        //             io.to(recipientSocketId).emit("chat_history", messages);
        //         }


        //         // let recipientSocketId;

        //         // for (const member of chatMembers) {
        //         //     if (userSockets.has(member.user_id)) {
        //         //         recipientSocketId = userSockets.get(member.user_id);
        //         //         break;
        //         //     }
        //         // }

        //         // if (recipientSocketId && io.sockets.sockets.get(recipientSocketId)) {
        //         //     io.to(recipientSocketId).emit("message_read", {
        //         //         messageId,
        //         //         seenBy: userId,
        //         //     });

        //         //     io.to(recipientSocketId).emit("chat_history", messages);
        //         // } else {
        //         //     console.log("Recipient socket ID not found in userSockets.");
        //         // }
        //     } catch (error) {
        //         console.error('mark_as_read error:', error.message);
        //         socket.emit("error", error.message);
        //     }
        // });

        // socket.on("user_status_update", async ({ chatId, isOnline }) => {
        //     try {
        //         const currentUserId = decoded.data.id;
        //         let data = {
        //             is_online: isOnline
        //         }
        //         await updateUsersProfile(data, currentUserId);
        //         const chatMembers = await fetchAllChatsMembers(chatId, currentUserId);
        //         const recipientSocketID = userSockets.get(chatMembers[0].user_id);
        //         if (recipientSocketID && io.sockets.sockets.get(recipientSocketID)) {
        //             io.to(recipientSocketID).emit('isUsersOnlineOrOffline', {
        //                 userId: currentUserId,
        //                 isOnline: isOnline
        //             });
        //         }
        //     } catch (err) {
        //         console.error("Error in user_status_update:", err.message);
        //     }
        // });

    });

};

export default initializeSocket;
