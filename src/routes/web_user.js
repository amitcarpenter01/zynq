
import express from 'express';
const router = express.Router();
import * as webControllers from "../controllers/web_users/authController.js";
import { authenticate } from '../middleware/web_user_auth.js';;

// router.get("/get_profile", authenticate(['CLINIC','DOCTOR']), webControllers.getProfile);

router.post("/login", webControllers.login_web_user);
router.post("/forgot-password", webControllers.forgot_password);
router.get("/reset-password", webControllers.render_forgot_password_page);
router.post("/reset-password", webControllers.reset_password);
router.get("/success-reset", webControllers.render_success_reset);
router.post("/set-password", authenticate(['CLINIC', 'DOCTOR']), webControllers.set_password);
router.post("/change-password", authenticate(['CLINIC', 'DOCTOR']), webControllers.change_password);

export default router;  