import Joi from "joi";
import * as adminModels from "../../models/admin.js"
import { asyncHandler, handleError, handleSuccess, joiErrorHandle } from "../../utils/responseHandler.js";
import { NOTIFICATION_MESSAGES, sendNotification } from "../../services/notifications.service.js";

export const get_users_managment = async (req, res) => {
    try {
        const users = await adminModels.get_users_managment();
        const faceScanResults = await adminModels.get_all_face_scan_results();

        if (users && users.length > 0) {
            const formattedUsers = users.map(user => ({
                ...user,
                profile_image: user.profile_image
                    ? `${process.env.APP_URL}${user.profile_image}`
                    : null,
                face_scans: faceScanResults.filter(scan =>
                    scan.user_id == user.user_id).map(scan => ({
                        ...scan,
                        face: scan.face && !scan.face.startsWith("http") ? `${process.env.APP_URL}${scan.face}` : scan.face,
                        pdf: scan.pdf ? `${process.env.APP_URL}${scan.pdf}` : scan.pdf
                    }))

            }));


            return handleSuccess(res, 200, 'en', "Fetch user management successfully", { users: formattedUsers });
        } else {
            return handleSuccess(res, 200, 'en', "No users found", { users: [] });
        }
    } catch (error) {
        console.error("Internal Server Error:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR " + error.message);
    }
};


export const update_user_status = async (req, res) => {
    try {
        const schema = Joi.object({
            user_id: Joi.string().required(),
            is_active: Joi.number().valid(0, 1).required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        const { user_id, is_active } = value;

        const updateResponse = await adminModels.update_user_status(user_id, is_active);

        if (updateResponse && updateResponse.affectedRows > 0) {
            const statusMessage = is_active
                ? "User activated successfully"
                : "User deactivated successfully";

            return handleSuccess(res, 200, 'en', statusMessage, updateResponse);
        } else {
            return handleSuccess(res, 200, 'en', "User not found or status unchanged", {});
        }

    } catch (error) {
        console.error("internal E", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR " + error.message);
    }
};

export const updateUserApprovalStatus = asyncHandler(async (req, res) => {
    const { approval_status, user_id } = req.body;
    const { language = "en" } = req.user;

    const statusMessages = {
        APPROVED: "USER_APPROVED_SUCCESSFULLY",
        REJECTED: "USER_REJECTED_SUCCESSFULLY",
        PENDING: "USER_PENDING_SUCCESSFULLY",
    };

    const notificationUpdates = {
        APPROVED: "user_approved",
        REJECTED: "user_rejected",
        PENDING: "user_pending",
    };

    await Promise.all([
        adminModels.updateUserApprovalStatus(user_id, approval_status),
        sendNotification({
            userData: req.user,
            type: "USER",
            type_id: user_id,
            notification_type: NOTIFICATION_MESSAGES[notificationUpdates[approval_status]],
            receiver_id: user_id,
            receiver_type: "USER"
        })
    ])



    return handleSuccess(res, 200, language, statusMessages[approval_status],);
});
