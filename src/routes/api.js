import express from 'express';
import { upload } from '../services/aws.s3.js';
import { authenticateUser } from '../middleware/auth.js';
import { uploadFile, uploadMultipleFiles } from '../services/multer.js';


//==================================== Import Controllers ==============================
import * as authControllers from "../controllers/api/authController.js";
import * as aiPromptControllers from "../controllers/api/aiPromptController.js";
import * as faceScanControllers from "../controllers/api/faceScanController.js";
import * as doctorControllers from "../controllers/api/doctorController.js";
import * as productControllers from "../controllers/api/productController.js";
import * as clinicControllers from "../controllers/api/clinicController.js";


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


//==================================== AI Prompt ==============================
router.post("/add-update-prompt", aiPromptControllers.add_and_update_prompt);
router.post("/get-prompt", aiPromptControllers.get_prompt_data_by_prompt_type);

//==================================== Face Scan ==============================
// router.post("/add-face-scan-result", authenticateUser, upload.single("file"), faceScanControllers.add_face_scan_result);
router.post("/add-face-scan-result", authenticateUser, uploadFile, faceScanControllers.add_face_scan_result);
router.get("/get-face-scan-history", authenticateUser, faceScanControllers.get_face_scan_history);


//==================================== Doctor ==============================
router.get("/get-all-doctors", authenticateUser, doctorControllers.get_all_doctors);

// //==================================== Product ==============================
router.get("/get-all-products", authenticateUser, productControllers.getAllProducts);

// ==================================== Clinic ==============================
router.get("/get-all-clinics", authenticateUser, clinicControllers.get_all_clinics);


export default router;