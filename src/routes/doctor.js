
import express from 'express';
const router = express.Router();
import * as doctorController from "../controllers/doctor/profileController.js";
import { authenticate } from '../middleware/web_user_auth.js';
import { uploadCertificationFieldsTo, uploadFileTo } from '../services/doctor_multer.js';
import * as supportControllers from "../controllers/doctor/supportController.js";


router.get("/get_profile", authenticate(['DOCTOR']), doctorController.getDoctorProfile);

//======================================= Onboarding apis =========================================

router.post("/add_personal_info", authenticate(['DOCTOR']), uploadFileTo('profile_images'), doctorController.addPersonalInformation);

const uploadVariousFields = uploadCertificationFieldsTo([
    { name: 'medical_council', maxCount: 1, subfolder: 'certifications' },
    { name: 'deramatology_board', maxCount: 1, subfolder: 'certifications' },
    { name: 'laser_safety', maxCount: 1, subfolder: 'certifications' },
     { name: 'cosmetology_license', maxCount: 1, subfolder: 'certifications' },
]);

router.post('/add_education_experience', authenticate(['DOCTOR']), uploadVariousFields, doctorController.addEducationAndExperienceInformation);

router.post('/add_expertise', authenticate(['DOCTOR']), doctorController.addExpertise);

router.post('/add_fee_availability', authenticate(['DOCTOR']), doctorController.addConsultationFeeAndAvailability);

//======================================= Edit apis =========================================
router.post("/edit_personal_details", authenticate(['DOCTOR']), uploadFileTo('profile_images'), doctorController.editPersonalInformation);

router.post('/edit_education_experience', authenticate(['DOCTOR']), uploadVariousFields, doctorController.editEducationAndExperienceInformation);

router.post("/edit_personal_details", authenticate(['DOCTOR']), uploadFileTo('profile_images'), doctorController.editPersonalInformation);

router.post("/add_education", authenticate(['DOCTOR']), doctorController.addEducation);

router.put("/edit_education", authenticate(['DOCTOR']), doctorController.editEducation);

router.delete("/delete_education/:education_id", authenticate(['DOCTOR']), doctorController.deleteEducation);


router.post("/add_experience", authenticate(['DOCTOR']), doctorController.addExperince);

router.put("/edit_experience", authenticate(['DOCTOR']), doctorController.editExperience);

router.delete("/delete_experience/:experience_id", authenticate(['DOCTOR']), doctorController.deleteExperience);


router.post('/add_certification', authenticate(['DOCTOR']), uploadVariousFields, doctorController.addCertifications);

router.put('/edit_certification', authenticate(['DOCTOR']), uploadFileTo('certifications'), doctorController.editCertification);

router.delete('/delete_certification/:doctor_certification_id', authenticate(['DOCTOR']), doctorController.deleteCertification);

// Expertise
router.post("/edit_expertise", authenticate(['DOCTOR']), doctorController.editExpertise);

router.post('/edit_fee_availability', authenticate(['DOCTOR']), doctorController.editConsultationFeeAndAvailability);

router.get("/get_linked_clinics", authenticate(['DOCTOR']), doctorController.getLinkedClinics);

router.delete('/delete_profile_image', authenticate(['DOCTOR']), doctorController.deleteProfileImage);


//======================================= Support apis =========================================
router.get("/get-issue-categories", supportControllers.get_issue_categories);
router.post("/create-support-ticket", authenticate(['DOCTOR']), supportControllers.create_support_ticket);
router.get("/get-support-tickets-by-doctor-id", authenticate(['DOCTOR']), supportControllers.get_support_tickets_by_doctor_id);

export default router;