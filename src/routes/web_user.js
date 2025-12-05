
import express from 'express';
const router = express.Router();
import * as webControllers from "../controllers/web_users/authController.js";
import { authenticate } from '../middleware/web_user_auth.js';;
import { authenticateUser } from '../middleware/auth.js'; import { deleteNotifications, deleteSingleNotification, getNotifications } from '../controllers/api/notificationController.js';
import { deleteSingleNotificationSchema } from '../validations/notification.validation.js';
import { validate } from '../middleware/validation.middleware.js';
import { add_clinic_managment } from '../controllers/admin/clinicController.js';
;
// router.get("/get_profile", authenticate(['CLINIC','DOCTOR']), webControllers.getProfile);

router.post("/login", webControllers.login_web_user);
router.post("/forgot-password", webControllers.forgot_password);
router.get("/reset-password", webControllers.render_forgot_password_page);
router.post("/reset-password", webControllers.reset_password);
router.get("/success-reset", webControllers.render_success_reset);
router.post("/set-password", authenticate(['CLINIC', 'DOCTOR', 'SOLO_DOCTOR']), webControllers.set_password);
router.post("/change-password", authenticate(['CLINIC', 'DOCTOR', 'SOLO_DOCTOR']), webControllers.change_password);
router.post("/onboarding-by-role-id", webControllers.onboardingByRoleId);
router.post("/verifyRoleSelected", webControllers.verifyRoleSelected);


//=======================================Call-log=============================
router.post(
  "/create-call-log-user",
  authenticateUser,
  webControllers.create_call_log_user
);


router.post(
  "/create-call-log-doctor",
  authenticate(['DOCTOR']),
  webControllers.create_call_log_doctor
);


router.get("/get-call-logs", authenticate, webControllers.get_all_call_logs);


//=======================================Notifications=============================
router.get('/notifications/get', authenticate(['DOCTOR', 'SOLO_DOCTOR', 'CLINIC']), getNotifications);
router.delete('/notifications/:notification_id', authenticate(['DOCTOR', 'SOLO_DOCTOR', 'CLINIC']), validate(deleteSingleNotificationSchema, "params"), deleteSingleNotification);
router.delete('/notifications', authenticate(['DOCTOR', 'SOLO_DOCTOR', 'CLINIC']), deleteNotifications);

//=======================================Language=============================
router.patch('/toggle-language', authenticate(['DOCTOR', 'SOLO_DOCTOR', 'CLINIC']), webControllers.toggleLanguage);



router.post('/add-clinic-managment',add_clinic_managment);



export default router;  