import express from 'express';
import { upload } from '../services/aws.s3.js';
import { authenticate } from '../middleware/web_user_auth.js';
import { uploadDynamicClinicFiles } from '../services/clinic_multer.js';
import * as clinicModels from '../models/clinic.js';

//==================================== Import Controllers ==============================
import * as authControllers from "../controllers/clinic/authController.js";
import * as doctorControllers from "../controllers/clinic/doctorController.js";
import * as productControllers from "../controllers/clinic/productController.js";
import * as authControllerWeb from "../controllers/web_users/authController.js";
import * as supportControllers from "../controllers/clinic/supportController.js";
import * as appointmentControllers from "../controllers/clinic/appointmentController.js"
import { validate } from '../middleware/validation.middleware.js';
import { deleteClinicImageSchema } from '../validations/clinic.validation.js';
import { updateShipmentStatus } from '../controllers/api/paymentController.js';
import { updateShipmentStatusSchema } from '../validations/payment.validation.js';
import { toggleHideProductSchema } from '../validations/product.validation.js';
import { deleteSubTreatmentSchema, deleteTreatmentSchema } from '../validations/treatment.validation.js';
import { deleteSubTreatment, deleteTreatment } from '../controllers/api/treatmentController.js';


const router = express.Router();


//==================================== upload ==============================


const getFieldsFn = async (req) => {
    const certificationType = await clinicModels.getCertificateType();
    if (certificationType.length === 0) {
        return [];
    }
    const dynamicFields = certificationType.map(type => ({
        name: type.file_name ? type.file_name.toLowerCase() : '',
        maxCount: 10
    }));
    dynamicFields.push({ name: 'logo', maxCount: 1 });
    return dynamicFields;
};

const getProductFields = () => [
    { name: 'product_image', maxCount: 10 },
    { name: 'cover_image', maxCount: 1 }
];

const uploadProductImage = uploadDynamicClinicFiles(getProductFields);


//==================================== AUTH ==============================
router.get("/get-profile", authenticate(['CLINIC', 'DOCTOR']), authControllers.getProfile);
router.post("/onboard-clinic", authenticate(['CLINIC']), uploadDynamicClinicFiles(getFieldsFn), authControllers.onboardClinic);
router.post("/update-clinic", authenticate(['CLINIC']), uploadDynamicClinicFiles(getFieldsFn), authControllers.updateClinic);
router.delete("/images/:clinic_image_id", authenticate(['CLINIC', 'SOLO_DOCTOR']), validate(deleteClinicImageSchema, "params"), authControllers.deleteClinicImage);


//==================================== Get Data For Onboarding ==============================
router.get("/get-treatments", authControllers.getAllTreatments);
router.get("/get-equipments", authControllers.getClinicEquipments);
router.get("/get-skin-types", authControllers.getClinicSkinTypes);
router.get("/get-severity-levels", authControllers.getClinicSeverityLevels);
router.get("/get-certificate-type", authControllers.getCertificateType);
router.get("/search-location", authControllers.searchLocation);
router.get("/get-lat-long", authControllers.getLatLong);

router.get("/get-SkinConditions", authControllers.getAllSkinConditions)
router.get("/get-surgery", authControllers.getAllSurgery)
router.get("/get-devices", authControllers.getAllDevices)

//==================================== Roles ==============================
router.get("/get-roles", authControllers.getAllRoles);


//==================================== Doctor ==============================
router.post("/send-doctor-invitation", authenticate(['CLINIC']), doctorControllers.sendDoctorInvitation);
router.get("/get-all-doctors", authenticate(['CLINIC']), doctorControllers.getAllDoctors);

router.get("/get-all-doctors/:clinic_id", authenticate(['CLINIC']), doctorControllers.getAllDoctorsById);
router.post("/unlink-doctor", authenticate(['CLINIC']), doctorControllers.unlinkDoctor);
router.get("/accept-invitation", doctorControllers.acceptInvitation);

//==================================== Product ==============================
router.post("/add-product", authenticate(['CLINIC', 'SOLO_DOCTOR']), uploadProductImage, productControllers.addProduct);
router.get("/get-all-products", authenticate(['CLINIC', 'SOLO_DOCTOR']), productControllers.getAllProducts);
router.post("/update-product", authenticate(['CLINIC', 'SOLO_DOCTOR']), uploadProductImage, productControllers.updateProduct);
router.delete("/delete-product/:product_id", authenticate(['CLINIC', 'SOLO_DOCTOR']), productControllers.deleteProduct);
router.delete("/delete-product-image/:product_image_id", authenticate(['CLINIC', 'SOLO_DOCTOR']), productControllers.deleteProductImage);
router.post("/get-product-by-id", authenticate(['CLINIC', 'SOLO_DOCTOR']), productControllers.getProductById);

//==================================== Support ==============================
router.post("/create-support-ticket", authenticate(['CLINIC', 'SOLO_DOCTOR']), supportControllers.create_support_ticket);
router.get("/get-support-tickets", authenticate(['CLINIC', 'SOLO_DOCTOR']), supportControllers.get_support_tickets_by_clinic_id);
router.get("/get-support-tickets-to-clinic", authenticate(['CLINIC']), supportControllers.get_support_tickets_by_doctor_id_to_clinic);
router.post("/send-response-to-doctor", authenticate(['CLINIC']), supportControllers.send_response_to_doctor);


// -------------------------------------slot managment------------------------------------------------//

router.get('/getMyAppointments', authenticate(['CLINIC', 'SOLO_DOCTOR']), appointmentControllers.getMyAppointmentsClinic);

router.patch('/update-shipment-status', authenticate(['CLINIC', 'SOLO_DOCTOR']), validate(updateShipmentStatusSchema, "body"), updateShipmentStatus);

router.patch('/product/toggle-hide/:product_id', authenticate(['CLINIC', 'SOLO_DOCTOR']), validate(toggleHideProductSchema, "params"), productControllers.toggleHideProduct);


router.delete('/treatment/:treatment_id', authenticate(['CLINIC', 'SOLO_DOCTOR']), validate(deleteTreatmentSchema, 'params'), deleteTreatment);
router.delete('/sub_treatment/:sub_treatment_id', authenticate(['CLINIC', 'SOLO_DOCTOR']), validate(deleteSubTreatmentSchema, 'params'), deleteSubTreatment);

export default router;
