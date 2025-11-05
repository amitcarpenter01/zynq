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
import { updateLegalDocumentsSchema, updateUserApprovalStatusSchema, updateZynqUserApprovalStatusSchema } from '../validations/legal.validation.js';
import { validate } from '../middleware/validation.middleware.js';
import { updateAdminCommissionRatesSchema } from '../validations/commission.validation.js';
import { deleteNotifications, deleteSingleNotification, getNotifications } from '../controllers/api/notificationController.js';
import { addWalletAmountSchema, getPaymentHistorySchema, getSinglePurchasedProductSchema } from '../validations/payment.validation.js';
import { deleteSingleNotificationSchema } from '../validations/notification.validation.js';
import { get_treatments } from '../controllers/api/faceScanController.js';
import { updateRatingStatusSchema } from '../validations/appointment.validation.js';
import { addEditFAQCategorySchema, addEditFAQSchema, deleteFAQCategorySchema, getAllFAQSchema, getSingleFAQCategorySchema, getSingleFAQSchema } from '../validations/faq.validation.js';
import { addEditFAQ, addEditFAQCategory, deleteFAQ, deleteFAQCategory, getAllFAQCategories, getAllFAQs, getSingleFAQ, getSingleFAQCategory } from '../controllers/api/FAQController.js';
import { getContactUs } from '../controllers/api/authController.js';
import { updateProductApprovalStatusSchema } from '../validations/product.validation.js';
import { addEditConcernSchema, addEditTreatmentSchema, deleteConcernSchema, deleteTreatmentSchema, updateConcernApprovalStatusSchema, updateTreatmentApprovalStatusSchema } from '../validations/treatment.validation.js';
import { addEditConcern, addEditTreatment, deleteConcern, deleteTreatment, updateConcernApprovalStatus, updateTreatmentApprovalStatus } from '../controllers/api/treatmentController.js';

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
router.get('/get-dashboard', authenticateAdmin, dashboardControllers.get_dashboard);

//==================================== User Managment ==============================
router.get('/get-users-managment', authenticateAdmin, userControllers.get_users_managment);
router.post('/update-user-status', authenticateAdmin, userControllers.update_user_status);

//==================================== Clinic Managment ==============================
router.post('/import-clinics-from-CSV', authenticateAdmin, upload.single("file"), clinicControllers.import_clinics_from_CSV);
router.post('/add-clinic-managment', authenticateAdmin, clinicControllers.add_clinic_managment);
router.get('/get-clinic-managment', authenticateAdmin, clinicControllers.get_clinic_managment);
router.post('/delete-clinic-management', authenticateAdmin, clinicControllers.delete_clinic_management);
router.post('/send-invitation', authenticateAdmin, clinicControllers.send_invitation);
router.get('/subscribed/:is_subscribed', clinicControllers.subscribed);
router.get('/unsubscribed/:is_unsubscribed', clinicControllers.unsubscribed);

//==================================== Doctor Managment ==============================

router.get('/get-dcotors-managment', authenticateAdmin, doctorControllers.get_doctors_management);

//==================================== Product Managment ==============================
router.get('/get-products-managment', authenticateAdmin, productControllers.get_products_managment);
router.get('/get-products-managment/:product_id', authenticateAdmin, productControllers.get_single_products_managment);
router.post('/delete-products-managment', authenticateAdmin, productControllers.delete_products_managment);


//==================================== Support Managment ==============================
router.get('/get-all-support-tickets', authenticateAdmin, supportControllers.get_all_support_tickets);
router.post('/admin-response-to-support-ticket', authenticateAdmin, supportControllers.admin_response_to_support_ticket);

//==================================== Call Logs Managment ==============================

router.get('/call-logs', authenticateAdmin, authControllers.get_all_call_logs);

//==================================== Appointments ==============================

router.get('/getAllappointments', authenticateAdmin, authControllers.get_all_appointments);
router.get('/getAllappointments/:appointment_id', authenticateAdmin, authControllers.get_single_all_appointments);

//==============================Enrollememt ===============================

router.get('/get-all-enrollments', authenticateAdmin, authControllers.get_all_enrollments);


//==============================Wallets ===================================

router.get('/wallets', authenticateAdmin, dashboardControllers.get_wallets);

router.get('/legal', authenticateAdmin, getLegalDocuments);

router.put('/legal', authenticateAdmin, validate(updateLegalDocumentsSchema, "body"), updateLegalDocuments);

router.get('/payments/get-booked-appointments', authenticateAdmin, dashboardControllers.getBookedAppointments);

router.get('/payments/get-purchased-products/:purchase_id', authenticateAdmin, validate(getSinglePurchasedProductSchema, "params"), dashboardControllers.getSinglePurchasedProducts);

router.get('/payments/get-purchased-products', authenticateAdmin, dashboardControllers.getPurchasedProducts);

router.get('/reviews-ratings', authenticateAdmin, dashboardControllers.getAdminReviewsRatings);

router.get('/commission-rates', authenticateAdmin, dashboardControllers.getAdminCommissionRates);

router.put('/commission-rates', authenticateAdmin, validate(updateAdminCommissionRatesSchema, "body"), dashboardControllers.updateAdminCommissionRates);

router.get('/payments/get-payment-history', authenticateAdmin, validate(getPaymentHistorySchema, "query"), dashboardControllers.getPaymentHistory);

router.get('/payments/get-earnings', authenticateAdmin, dashboardControllers.getEarnings);

//=======================================Notifications=============================
router.get('/notifications/get', authenticateAdmin, getNotifications);
router.delete('/notifications/:notification_id', authenticateAdmin, validate(deleteSingleNotificationSchema, "params"), deleteSingleNotification);
router.delete('/notifications', authenticateAdmin, deleteNotifications);

//=======================================Appointment=============================

router.post('/cancelAppointment', authenticateAdmin, authControllers.cancelAppointment);

router.post('/completeRefundToWallet', authenticateAdmin, authControllers.completeRefundToWallet);

router.get('/refundHistory', authenticateAdmin, authControllers.getRefundHistory);

router.get('/getUserAppointments/:user_id', authenticateAdmin, authControllers.getUserAppointmentOfUser);

router.post('/payments/add-wallet-amount', authenticateAdmin, validate(addWalletAmountSchema, "body"), dashboardControllers.addWalletAmount);

router.get('/get_treatments', get_treatments);

router.post('/update-rating-status', authenticateAdmin, validate(updateRatingStatusSchema, 'body'), dashboardControllers.updateRatingStatus)

//=======================================FAQs===============================================

router.post('/faq', authenticateAdmin, validate(addEditFAQSchema, 'body'), addEditFAQ);
router.post('/faq/get-all-faqs', authenticateAdmin, validate(getAllFAQSchema, "body"), getAllFAQs);
router.get('/faq/:faq_id', authenticateAdmin, validate(getSingleFAQSchema, 'params'), getSingleFAQ);
router.delete('/faq/:faq_id', authenticateAdmin, validate(getSingleFAQSchema, 'params'), deleteFAQ);

//=======================================FAQ Categories======================================

router.get('/faq-categories', authenticateAdmin, getAllFAQCategories);
router.get('/faq-categories/:faq_category_id', authenticateAdmin, validate(getSingleFAQCategorySchema, 'params'), getSingleFAQCategory);
router.post('/faq-categories', authenticateAdmin, validate(addEditFAQCategorySchema, 'body'), addEditFAQCategory);
router.delete('/faq-categories/:faq_category_id', authenticateAdmin, validate(deleteFAQCategorySchema, 'params'), deleteFAQCategory);

router.get('/contact-us', authenticateAdmin, getContactUs);

router.patch('/user/approval-status', authenticateAdmin, validate(updateUserApprovalStatusSchema, 'body'), userControllers.updateUserApprovalStatus);

router.patch('/zynq-user/approval-status', authenticateAdmin, validate(updateZynqUserApprovalStatusSchema, 'body'), userControllers.updateZynqUserApprovalStatus);

router.patch('/product/approval-status', authenticateAdmin, validate(updateProductApprovalStatusSchema, 'body'), productControllers.updateProductApprovalStatus);

router.post('/treatment', authenticateAdmin, validate(addEditTreatmentSchema, 'body'), addEditTreatment);

router.delete('/treatment/:treatment_id', authenticateAdmin, validate(deleteTreatmentSchema, 'params'), deleteTreatment);

router.patch('/treatment/approval-status', authenticateAdmin, validate(updateTreatmentApprovalStatusSchema, 'body'), updateTreatmentApprovalStatus);

router.post('/concern', authenticateAdmin, validate(addEditConcernSchema, 'body'), addEditConcern);

router.delete('/concern/:concern_id', authenticateAdmin, validate(deleteConcernSchema, 'params'), deleteConcern);

router.patch('/concern/approval-status', authenticateAdmin, validate(updateConcernApprovalStatusSchema, 'body'), updateConcernApprovalStatus);

export default router;
