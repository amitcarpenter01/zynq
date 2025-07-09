import { getUserNotifications } from "../../services/notifications.service.js";
import { asyncHandler, handleError, handleSuccess, } from "../../utils/responseHandler.js";
import { isEmpty } from "../../utils/user_helper.js";

export const getNotifications = asyncHandler(async (req, res) => {
    const notificationsData = await getUserNotifications(req.user);
    if (isEmpty(notificationsData)) return handleError(res, 404, "en", "NOTIFICATION_NOT_FOUND");
    return handleSuccess(res, 200, 'en', "NOTIFICATIONS_FETCHED_SUCCESSFULLY", notificationsData);
});
