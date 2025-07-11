import express from 'express';
import { upload } from '../services/multer.js';
import { authenticateAdmin, authenticateUser } from '../middleware/auth.js';
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
import { rescheduleAppointmentSchema, rateAppointmentSchema } from '../validations/appointment.validation.js';
import { getSingleDoctorSchema, getAllDoctorsSchema } from '../validations/doctor.validation.js';
import { getAllClinicsSchema } from '../validations/clinic.validation.js';
import { getTreatmentsByConcernSchema } from '../validations/treatment.validation.js';
import { getNotifications, toggleNotification } from '../controllers/api/notificationController.js';

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
router.get("/doctor/get/:doctor_id", authenticateUser, validate(getSingleDoctorSchema, "params"), doctorControllers.getSingleDoctor);
// //==================================== Product ==============================
router.post("/get-all-products", authenticateUser, productControllers.getAllProducts);

// ==================================== Clinic ==============================
router.post("/get-all-clinics", authenticateUser, validate(getAllClinicsSchema, "body"), clinicControllers.get_all_clinics);

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

router.get('/getMyAppointments', authenticateUser, appointmentController.getMyAppointmentsUser);

router.patch('/update-appointment-status', appointmentController.updateAppointmentStatus);

router.post('/getMyAppointmentById', authenticateUser, appointmentController.getAppointmentsById);

router.post('/appointment/ratings', authenticateUser, validate(rateAppointmentSchema, "body"), appointmentController.rateAppointment);


// -------------------------------------Notifications------------------------------------------------//

router.get('/notifications/get', authenticateUser, getNotifications);
router.patch('/notifications/toggle-notification', authenticateUser, toggleNotification);

// -------------------------------------Concerns------------------------------------------------//

router.post('/get_treatments_by_concern_id', faceScanControllers.get_treatments_by_concern_id);
router.get('/get_all_concerns', faceScanControllers.get_all_concerns);

export default router;