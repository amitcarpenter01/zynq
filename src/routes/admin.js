import express from 'express';
import { upload } from '../services/multer.js';
import { authenticateAdmin } from "../middleware/auth.js";

//==================================== Import Controllers ==============================
import * as authControllers from "../controllers/admin/authController.js"
import * as dashboardControllers from "../controllers/admin/dashboardController.js";
import * as userControllers from "../controllers/admin/userController.js";
import * as clinicControllers from "../controllers/admin/clinicController.js";
import * as doctorControllers from "../controllers/admin/doctorController.js";
import * as productControllers from "../controllers/admin/productController.js";
import * as supportControllers from "../controllers/admin/supportController.js";
import { getLegalDocuments, updateLegalDocuments } from '../controllers/api/legalController.js';
import { updateLegalDocumentsSchema } from '../validations/legal.validation.js';
import { validate } from '../middleware/validation.middleware.js';

const router = express.Router();

//==================================== Authentication ==============================
router.post('/login', authControllers.login);
router.post('/forgot-password', authControllers.forgotPassword);
router.get('/reset-password/:token', authControllers.renderResetPasswordPage);
router.post('/reset-password', authControllers.resetPassword);
router.get('/success-change', authControllers.successChange);
router.get('/get-profile', authenticateAdmin, authControllers.profile);
router.post('/update-profile', authenticateAdmin, upload.single('file'), authControllers.updateProfile);
router.post('/change-password', authenticateAdmin, authControllers.changePassword);

//==================================== Dashboard ==============================
router.get('/get-dashboard', dashboardControllers.get_dashboard);

//==================================== User Managment ==============================
router.get('/get-users-managment', userControllers.get_users_managment);
router.post('/update-user-status', userControllers.update_user_status);

//==================================== Clinic Managment ==============================
router.post('/import-clinics-from-CSV', upload.single("file"), clinicControllers.import_clinics_from_CSV);
router.post('/add-clinic-managment', clinicControllers.add_clinic_managment);
router.get('/get-clinic-managment', clinicControllers.get_clinic_managment);
router.post('/delete-clinic-management', clinicControllers.delete_clinic_management);
router.post('/send-invitation', clinicControllers.send_invitation);
router.get('/subscribed/:is_subscribed', clinicControllers.subscribed);
router.get('/unsubscribed/:is_unsubscribed', clinicControllers.unsubscribed);
router.post('/send-invitation', clinicControllers.send_invitation);

//==================================== Doctor Managment ==============================
router.get('/get-dcotors-managment', doctorControllers.get_doctors_management);


//==================================== Product Managment ==============================
router.get('/get-products-managment', productControllers.get_products_managment);
router.post('/delete-products-managment', productControllers.delete_products_managment);


//==================================== Support Managment ==============================
router.get('/get-all-support-tickets', supportControllers.get_all_support_tickets);
router.post('/admin-response-to-support-ticket', supportControllers.admin_response_to_support_ticket);

//==================================== Call Logs Managment ==============================

router.get('/call-logs',  authenticateAdmin,authControllers.get_all_call_logs);

//==================================== Appointments ==============================
 
router.get('/getAllappointments',authenticateAdmin, authControllers.get_all_appointments);

//==============================Enrollememt ===============================

router.get('/get-all-enrollments',authenticateAdmin, authControllers.get_all_enrollments);


//==============================Wallets ===================================

router.get('/wallets', authenticateAdmin, dashboardControllers.get_wallets);

router.get('/legal', getLegalDocuments);

router.put('/legal', authenticateAdmin, validate(updateLegalDocumentsSchema, "body"), updateLegalDocuments);

router.get('/payments/get-booked-appointments', authenticateAdmin, dashboardControllers.getBookedAppointments);


export default router;
