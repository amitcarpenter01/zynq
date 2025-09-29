import express from 'express';
import { upload } from '../services/multer.js';
import { authenticateAdmin, authenticateUser, optionalAuthenticateUser } from '../middleware/auth.js';
import { authenticate } from '../middleware/web_user_auth.js';;
import { uploadFile, uploadMultipleFiles } from '../services/multer.js';
import { validate } from '../middleware/validation.middleware.js';

//==================================== Import Controllers ==============================
import * as authControllers from "../controllers/api/authController.js";
import * as aiPromptControllers from "../controllers/api/aiPromptController.js";
import * as faceScanControllers from "../controllers/api/faceScanController.js";
import * as doctorControllers from "../controllers/api/doctorController.js";
import * as productControllers from "../controllers/api/productController.js";
import * as clinicControllers from "../controllers/api/clinicController.js";
import * as supportControllers from "../controllers/api/supportController.js";
import * as treatmentControllers from "../controllers/api/treatmentController.js";

import * as appointmentController from "../controllers/api/appointmentController.js";


import { uploadCertificationFieldsTo } from '../services/doctor_multer.js';

//==================================== Import Validations ==============================
import { rescheduleAppointmentSchema, rateAppointmentSchema, sendReportToChatSchema, contactUsSchema, guestLoginSchema, getGuestFaceScanSchema } from '../validations/appointment.validation.js';
import { getSingleDoctorSchema, getAllDoctorsSchema, requestCallbackSchema, getSingleDoctorRatingsSchema } from '../validations/doctor.validation.js';
import { getAllClinicsSchema, getSingleClinicSchema } from '../validations/clinic.validation.js';
import { getTipsByConcernsSchema, getTreatmentFiltersSchema, getTreatmentsByConcernSchema, getTreatmentsByConcersSchema, getTreatmentsSchema, sendFaceResultToEmailSchema } from '../validations/treatment.validation.js';
import { deleteNotifications, deleteSingleNotification, getNotifications, toggleNotification } from '../controllers/api/notificationController.js';
import { sendAppointmentNotifications } from '../services/notifications.service.js';
import { toggleLanguage } from '../controllers/web_users/authController.js';
import { getLegalDocuments } from '../controllers/api/legalController.js';
import { uploadMulterChatFiles } from '../services/multer.chat.js';
import { getAllProductsSchema, getSingleProductSchema } from '../validations/product.validation.js';
import { getWishlists, toggleWishlistProduct } from '../controllers/api/wishlistController.js';
import { toggleWishlistProductSchema } from '../validations/wishlist.validation.js';
import { addProductToCartSchema, deleteCartSchema, deleteProductFromCartSchema, getSingleCartSchema, } from '../validations/cart.validation.js';
import { addProductToCart, deleteCart, deleteProductFromCart, getCarts, getSingleCart, getSingleCartByClinic } from '../controllers/api/cartController.js';
import { getSinglePurchasedProductSchema, initiatePaymentSchema, klarnaWebhookSchema } from '../validations/payment.validation.js';
import { initiatePayment, stripeCancelHandler, stripeSuccessHandler, stripeWebhookHandler, testPayment } from '../controllers/api/paymentController.js';
import { getUserSkinTypes } from '../models/clinic.js';
import { addEditAddressSchema, deleteAddressSchema, getSingleAddressSchema } from '../validations/address.validation.js';
import { addEditAddress, deleteAddress, getAddresses, getSingleAddress } from '../controllers/api/addressController.js';
import { deleteSingleNotificationSchema } from '../validations/notification.validation.js';
import { getAllFAQCategories, getAllFAQs } from '../controllers/api/FAQController.js';
import { getAllFAQSchema } from '../validations/faq.validation.js';

const router = express.Router();


//==================================== AUTH ==============================
router.post("/login-with-mobile", authControllers.login_with_mobile);
router.post("/login-with-otp", authControllers.login_with_otp);
router.get("/profile", authenticateUser, authControllers.getProfile);
// router.post("/profile/update", authenticateUser, upload.single("file"), authControllers.updateProfile);
router.post("/profile/update", authenticateUser, uploadFile, authControllers.updateProfile);
router.delete("/delete-account", authenticateUser, authControllers.deleteAccount);
router.get("/privacy-policy", authControllers.render_privacy_policy);
router.post("/terms-and-conditions", authControllers.render_terms_and_condition);
router.post("/privacy-policy", authControllers.render_privacy_policy);
router.post("/enroll-user", authControllers.enroll_user);


//==================================== AI Prompt ==============================
router.post("/add-update-prompt", aiPromptControllers.add_and_update_prompt);
router.post("/get-prompt", aiPromptControllers.get_prompt_data_by_prompt_type);

//==================================== Face Scan ==============================
const uploadVariousFields = uploadCertificationFieldsTo([
  { name: 'file', maxCount: 1, subfolder: 'certifications' },
  { name: 'pdf', maxCount: 1, subfolder: 'certifications' },

]);

// router.post("/add-face-scan-result", authenticateUser, upload.single("file"), faceScanControllers.add_face_scan_result);
router.post("/add-face-scan-result", authenticateUser, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'pdf', maxCount: 1 }
]), faceScanControllers.add_face_scan_result);
router.get("/get-face-scan-history", authenticateUser, faceScanControllers.get_face_scan_history);



//==================================== Doctor ==============================
// router.get("/get-all-doctors", authenticateUser, doctorControllers.get_all_doctors);
router.post("/get-all-doctors", authenticateUser, validate(getAllDoctorsSchema, "body"), doctorControllers.get_all_doctors_in_app_side);
router.post("/get-recommended-doctors", authenticateUser, validate(getAllDoctorsSchema, "body"), doctorControllers.get_recommended_doctors);
router.get("/doctor/get/ratings/:doctor_id", authenticateUser, validate(getSingleDoctorRatingsSchema, "params"), doctorControllers.getSingleDoctorRatings);
router.get("/doctor/get/:clinic_id/:doctor_id", authenticateUser, validate(getSingleDoctorSchema, "params"), doctorControllers.getSingleDoctor);

// //==================================== Product ==============================
router.post("/get-all-products", optionalAuthenticateUser, validate(getAllProductsSchema, "body"), productControllers.getAllProducts);
router.get("/product/:product_id", optionalAuthenticateUser, validate(getSingleProductSchema, "params"), productControllers.getSingleProduct);

// ==================================== Clinic ==============================
router.post("/get-all-clinics", authenticateUser, validate(getAllClinicsSchema, "body"), clinicControllers.get_all_clinics);
router.get("/clinic/:clinic_id", authenticateUser, validate(getSingleClinicSchema, "params"), clinicControllers.getSingleClinic);
router.post("/get-nearby-clinics", authenticateUser, validate(getAllClinicsSchema, "body"), clinicControllers.get_nearby_clinics);

//==================================== Support ==============================
router.post("/create-support-ticket", authenticateUser, supportControllers.create_support_ticket);
router.get("/get-support-tickets", authenticateUser, supportControllers.get_support_tickets);



router.post("/create-call-log-user", authenticateUser, authControllers.create_call_log_user);

router.post(
  "/create-call-log-doctor",
  authenticate(['DOCTOR']),
  authControllers.create_call_log_doctor
);
// -------------------------------------slot managment------------------------------------------------//


router.post("/get-all-doctors-by-clinic", authenticateUser, doctorControllers.get_all_doctors_by_clinic_id);

router.get('/getFutureDoctorSlots', authenticateUser, authControllers.getFutureDoctorSlots);

router.post("/isUserOfflineOrOnline", authenticateUser, authControllers.isUserOfflineOrOnline);

router.post('/bookAppointment', authenticateUser, appointmentController.bookAppointment);

router.post('/saveOrBookAppointment', authenticateUser, appointmentController.saveOrBookAppointment);

router.post('/cancelAppointment', authenticateUser, appointmentController.cancelAppointment);

router.get('/getMyAppointments', authenticateUser, appointmentController.getMyAppointmentsUser);

router.get('/wallet', authenticateUser, appointmentController.getMyWallet);

router.get('/getMyTreatmentPlans', authenticateUser, appointmentController.getMyTreatmentPlans);

router.patch('/update-appointment-status', appointmentController.updateAppointmentStatus);

router.post('/getMyAppointmentById', authenticateUser, appointmentController.getAppointmentsById);

router.post('/appointment/ratings', authenticateUser, validate(rateAppointmentSchema, "body"), appointmentController.rateAppointment);


// -------------------------------------Notifications------------------------------------------------//

router.get('/notifications/get', authenticateUser, getNotifications);
router.patch('/notifications/toggle-notification', authenticateUser, toggleNotification);
router.delete('/notifications/:notification_id', authenticateUser, validate(deleteSingleNotificationSchema, "params"), deleteSingleNotification);
router.delete('/notifications', authenticateUser, deleteNotifications);

// -------------------------------------Concerns------------------------------------------------//

router.post('/get_treatments_by_concern_id', faceScanControllers.get_treatments_by_concern_id);
router.post('/get_treatments_by_concerns', validate(getTreatmentsByConcersSchema, "body"), faceScanControllers.get_treatments_by_concerns);
router.post('/get_treatments', optionalAuthenticateUser, validate(getTreatmentFiltersSchema, "body"), faceScanControllers.get_treatments);
router.get('/get_all_concerns', faceScanControllers.get_all_concerns);
router.post('/get_tips_by_concerns', validate(getTipsByConcernsSchema, "body"), faceScanControllers.get_tips_by_concerns);
router.patch('/toggle-language', authenticateUser, toggleLanguage);

// -------------------------------------Terms & Conditions------------------------------------------------//

router.get('/legal', optionalAuthenticateUser, getLegalDocuments);

// -------------------------------------Chat Files------------------------------------------------//

router.post('/upload-files', uploadMulterChatFiles, authControllers.uploadChatFiles);

// -------------------------------------Wishlists------------------------------------------------//

router.get('/wishlists', authenticateUser, getWishlists);
router.patch('/wishlists/:product_id', authenticateUser, validate(toggleWishlistProductSchema, "params"), toggleWishlistProduct);

// -------------------------------------Carts------------------------------------------------//

router.post('/cart/add', authenticateUser, validate(addProductToCartSchema, "body"), addProductToCart);
router.get('/cart', authenticateUser, getCarts);
router.get('/cart/clinic/:clinic_id', authenticateUser, validate(getSingleClinicSchema, "params"), getSingleCartByClinic);
router.get('/cart/:cart_id', authenticateUser, validate(getSingleCartSchema, "params"), getSingleCart);
router.delete('/cart/product/:product_id', authenticateUser, validate(deleteProductFromCartSchema, "params"), deleteProductFromCart);
router.delete('/cart/:cart_id', authenticateUser, validate(deleteCartSchema, "params"), deleteCart);

// -------------------------------------Payments------------------------------------------------//

router.post('/payments/initiate', authenticateUser, validate(initiatePaymentSchema, "body"), initiatePayment);
// router.post('/payments/webhook', stripeWebhookHandler);
router.get('/payments/success', stripeSuccessHandler);
router.get('/payments/cancel', stripeCancelHandler);
router.post('/payments/test', testPayment)
// -------------------------------------Generic------------------------------------------------//

router.get('/skin-types', authenticateUser, faceScanControllers.getClinicSkinTypes);
router.get('/treatments', optionalAuthenticateUser, faceScanControllers.getTreatments);
router.post('/get-treatments-by-ids', authenticateUser, validate(getTreatmentsSchema, "body"), faceScanControllers.get_treatments_by_treatments);
router.post("/get-all-search-results", authenticateUser, validate(getAllDoctorsSchema, "body"), doctorControllers.search_home_entities);

router.get('/payments/get-booked-appointments', authenticateUser, appointmentController.getBookedAppointments);
router.get('/payments/get-purchased-products/:purchase_id', authenticateUser, validate(getSinglePurchasedProductSchema, "params"), productControllers.getSingleUserPurchasedProducts);
router.get('/payments/get-purchased-products', authenticateUser, productControllers.getUserPurchasedProducts);

router.post('/address', authenticateUser, validate(addEditAddressSchema, "body"), addEditAddress);
router.get('/address/:address_id', authenticateUser, validate(getSingleAddressSchema, "params"), getSingleAddress);
router.get('/address', authenticateUser, getAddresses);
router.patch('/address', authenticateUser, validate(addEditAddressSchema, "body"), addEditAddress);
router.delete('/address/:address_id', authenticateUser, validate(deleteAddressSchema, "params"), deleteAddress);

router.post('/request-callback/:doctor_id', authenticateUser, validate(requestCallbackSchema, "params"), appointmentController.requestCallback);

// -------------------------------------Appointment Payment Flow------------------------------------------------//

router.post('/save-appointment-draft', authenticateUser, appointmentController.saveAppointmentAsDraft);

router.post('/book-direct-appointment', authenticateUser, appointmentController.bookDirectAppointment);

router.post('/mark-appointment-paid', authenticateUser, appointmentController.markAppointmentAsPaid);

router.post('/send-face-result', authenticateUser, validate(sendFaceResultToEmailSchema, "body"), faceScanControllers.sendFaceResultToEmail);

router.post('/get-all-faqs', optionalAuthenticateUser, validate(getAllFAQSchema, "body"), getAllFAQs);

router.get('/faq-categories', optionalAuthenticateUser, getAllFAQCategories);

router.post('/send-report-to-chat', authenticateUser, validate(sendReportToChatSchema, "body"), faceScanControllers.sendReportToChat);

router.delete('/delete-my-account', authenticateUser, authControllers.deleteMyAccount);

//=======================================CONTACT US===============================================

router.post('/contact-us', optionalAuthenticateUser, validate(contactUsSchema, "body"), authControllers.submitContactUs);

router.post('/guest/login', validate(guestLoginSchema, "body"), authControllers.guestLogin);
router.post('/guest/get-face-scan', validate(getGuestFaceScanSchema, "body"), authControllers.getGuestFaceScan);

export default router;