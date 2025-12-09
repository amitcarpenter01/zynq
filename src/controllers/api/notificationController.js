import { deleteNotificationsModel, deleteSingleNotificationModel, getUserNotifications, toggleNotificationSetting } from "../../services/notifications.service.js";
import { asyncHandler, handleError, handleSuccess, } from "../../utils/responseHandler.js";
import { isEmpty } from "../../utils/user_helper.js";

export const getNotifications = asyncHandler(async (req, res) => {
    const { language = "en" } = req.user;
    const notificationsData = await getUserNotifications(req.user,language);
    return handleSuccess(res, 200, language, "NOTIFICATIONS_FETCHED_SUCCESSFULLY", notificationsData);
});

export const toggleNotification = asyncHandler(async (req, res) => {
    const result = await toggleNotificationSetting(req.user);
    if (result?.affectedRows === 0) return handleError(res, 404, 'en', 'Notification settings not found');
    return handleSuccess(res, 200, 'en', 'NOTIFICATIONS_TOGGLED_SUCCESSFULLY');
});

export const deleteSingleNotification = asyncHandler(async (req, res) => {
    const { notification_id } = req.params;
    const { language = "en" } = req.user;
    await deleteSingleNotificationModel(req.user, notification_id);
    return handleSuccess(res, 200, language, 'NOTIFICATION_DELETED_SUCCESSFULLY');
});

export const deleteNotifications = asyncHandler(async (req, res) => {
    const { language = "en" } = req.user;
    await deleteNotificationsModel(req.user);
    return handleSuccess(res, 200, language, 'NOTIFICATION_DELETED_SUCCESSFULLY');
});