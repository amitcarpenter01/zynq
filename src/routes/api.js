import express from 'express';
import { upload } from '../services/multer.js';
import { authenticateUser } from '../middleware/auth.js';
import { authenticate } from '../middleware/web_user_auth.js';;
import { uploadFile, uploadMultipleFiles } from '../services/multer.js';


//==================================== Import Controllers ==============================
import * as authControllers from "../controllers/api/authController.js";
import * as aiPromptControllers from "../controllers/api/aiPromptController.js";
import * as faceScanControllers from "../controllers/api/faceScanController.js";
import * as doctorControllers from "../controllers/api/doctorController.js";
import * as productControllers from "../controllers/api/productController.js";
import * as clinicControllers from "../controllers/api/clinicController.js";
import * as supportControllers from "../controllers/api/supportController.js";

import * as appointmentController from "../controllers/api/appointmentController.js";


import { uploadCertificationFieldsTo } from '../services/doctor_multer.js';

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
router.get("/get-all-doctors", authenticateUser, doctorControllers.get_all_doctors_in_app_side);

// //==================================== Product ==============================
router.get("/get-all-products", authenticateUser, productControllers.getAllProducts);

// ==================================== Clinic ==============================
router.post("/get-all-clinics", authenticateUser, clinicControllers.get_all_clinics);

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


router.post("/get-all-doctors-by-clinic", authenticateUser, doctorControllers.get_all_doctors_by_clinic_id);

router.get('/getFutureDoctorSlots', authenticateUser, authControllers.getFutureDoctorSlots);

router.post("/isUserOfflineOrOnline", authenticateUser, authControllers.isUserOfflineOrOnline);

router.post('/bookAppointment', authenticateUser, appointmentController.bookAppointment);

router.get('/getMyAppointments', authenticateUser, appointmentController.getMyAppointmentsUser);

router.patch('/update-appointment-status', appointmentController.updateAppointmentStatus);

export default router;