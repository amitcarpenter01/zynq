
import express from 'express';
const router = express.Router();
import * as doctorController from "../controllers/doctor/profileController.js";
import { authenticate } from '../middleware/web_user_auth.js';
import { uploadCertificationFieldsTo, uploadFileTo } from '../services/doctor_multer.js';
import * as supportControllers from "../controllers/doctor/supportController.js";
import * as embeddingsController from "../controllers/api/embeddingsController.js";
import * as appointmentControllers from "../controllers/doctor/appointmentController.js";
import { validate } from '../middleware/validation.middleware.js';
import { getSinglePatientRecordSchema, rescheduleAppointmentSchema } from '../validations/appointment.validation.js';



router.get("/generateTreatmentEmbeddings", embeddingsController.generateTreatmentEmbeddings);
router.get("/generateProductsEmbedding", embeddingsController.generateProductsEmbedding);
router.get("/generateDoctorsEmbedding", embeddingsController.generateDoctorsEmbedding);
router.get("/generateClinicEmbedding", embeddingsController.generateClinicEmbedding);
router.post("/getTreatmentsSuggestions", embeddingsController.getTreatmentsSuggestions);
router.post("/getProductSuggestions", embeddingsController.getProductSuggestions);
router.post("/getDoctorSuggestions", embeddingsController.getDoctorSuggestions);
router.post("/getClinicSuggestions", embeddingsController.getClinicSuggestions);
router.post("/generateTreatmentEmbeddings2", embeddingsController.generateTreatmentEmbeddings2);
router.get("/generateTreatmentDevices", embeddingsController.generateTreatmentDevices);

export default router;  