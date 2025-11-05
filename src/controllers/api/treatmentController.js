import { addConcernModel, addSubTreatmentsModel, addTreatmentConcernsModel, addTreatmentModel, checkExistingConcernModel, checkExistingTreatmentModel, deleteClinicTreatmentsModel, deleteConcernModel, deleteDoctorTreatmentsModel, deleteExistingConcernsModel, deleteExistingParentTreatmentsModel, deleteExistingSubTreatmentsModel, deleteTreatmentModel, deleteZynqUserConcernsModel, deleteZynqUserTreatmentsModel, updateConcernModel, updateTreatmentApprovalStatusModel, updateTreatmentModel } from "../../models/admin.js";
import { getTreatmentsByConcernId } from "../../models/api.js";
import { NOTIFICATION_MESSAGES, sendNotification } from "../../services/notifications.service.js";
import { asyncHandler, handleError, handleSuccess, } from "../../utils/responseHandler.js";
import { isEmpty } from "../../utils/user_helper.js";
import { v4 as uuidv4 } from "uuid";
import { generateTreatmentEmbeddingsV2 } from "./embeddingsController.js";

export const getTreatmentsByConcern = asyncHandler(async (req, res) => {
    const { concern_id } = req.params;
    const treatmentsData = await getTreatmentsByConcernId(concern_id);
    if (isEmpty(treatmentsData)) return handleError(res, 404, "en", "TREATMENT_NOT_FOUND");
    return handleSuccess(res, 200, 'en', "TREATMENTS_FETCHED_SUCCESSFULLY", treatmentsData);
});

export const addEditTreatment = asyncHandler(async (req, res) => {
    const { treatment_id: input_treatment_id, ...body } = req.body;
    const role = req.user?.role;
    const user_id = req.user?.id;
    const language = req.user?.language || 'en';

    const isAdmin = role === "ADMIN";
    const dbData = { ...body };

    // 🧩 Creator metadata
    if (isAdmin) {
        dbData.is_admin_created = true;
        dbData.approval_status = "APPROVED";
    } else {
        dbData.created_by_zynq_user_id = user_id;
    }

    // Extract & remove relational arrays
    const { concerns = [], sub_treatments = [] } = dbData;
    delete dbData.concerns;
    delete dbData.sub_treatments;

    let treatment_id = input_treatment_id;

    // ✳️ EDIT FLOW
    if (treatment_id) {
        // 🛡️ Non-admin ownership check
        if (!isAdmin) {
            const [existing] = await checkExistingTreatmentModel(treatment_id, user_id);
            if (!existing) {
                return handleError(res, 403, language, "NOT_AUTHORIZED_TO_EDIT_TREATMENT");
            }
        }

        // 🧹 Cleanup + reinserts only if editing
        await Promise.all([
            updateTreatmentModel(treatment_id, dbData),
            deleteExistingConcernsModel(treatment_id),
            deleteExistingSubTreatmentsModel(treatment_id),
        ]);

        if (concerns.length) await addTreatmentConcernsModel(treatment_id, concerns);
        if (sub_treatments.length) await addSubTreatmentsModel(treatment_id, sub_treatments);
    }

    // ✳️ CREATE FLOW
    else {
        treatment_id = uuidv4();
        dbData.treatment_id = treatment_id;

        // Insert main + related tables together
        await addTreatmentModel(dbData);

        if (concerns.length) await addTreatmentConcernsModel(treatment_id, concerns);
        if (sub_treatments.length) await addSubTreatmentsModel(treatment_id, sub_treatments);
    }

    // ✅ Unified response
    const message = input_treatment_id
        ? "TREATMENT_UPDATED_SUCCESSFULLY"
        : "TREATMENT_ADDED_SUCCESSFULLY";


    handleSuccess(res, 200, language, message, { treatment_id });
    await generateTreatmentEmbeddingsV2(treatment_id)
});

export const deleteTreatment = asyncHandler(async (req, res) => {
    const { treatment_id } = req.params;
    const role = req.user?.role;
    const user_id = req.user?.id;

    const language = req.user?.language || 'en';

    if (role === "ADMIN") {
        await deleteTreatmentModel(treatment_id)
    } else {
        const deleted = await deleteZynqUserTreatmentsModel(treatment_id, user_id);
        if (deleted.affectedRows === 0) {
            return handleError(res, 403, language, "NOT_AUTHORIZED_TO_DELETE_TREATMENT");
        }
    }

    return handleSuccess(res, 200, language, "TREATMENT_DELETED_SUCCESSFULLY");
});

export const updateProductApprovalStatus = asyncHandler(async (req, res) => {
    const { approval_status, product_id } = req.body;
    const { language = "en" } = req.user;

    const statusMessages = {
        APPROVED: "PRODUCT_APPROVED_SUCCESSFULLY",
        REJECTED: "PRODUCT_REJECTED_SUCCESSFULLY",
    };

    const notificationUpdates = {
        APPROVED: "product_approved",
        REJECTED: "product_rejected",
    };

    const [productData] = await adminModels.updateProductApprovalStatus(product_id, approval_status)

    handleSuccess(res, 200, language, statusMessages[approval_status],)

    if (productData) {
        console.log("productData", productData)
        await sendNotification({
            userData: req.user,
            type: "PRODUCT",
            type_id: product_id,
            notification_type: NOTIFICATION_MESSAGES[notificationUpdates[approval_status]],
            receiver_id: productData.role === "CLINIC" ? productData.clinic_id : productData.doctor_id,
            receiver_type: productData.role === "CLINIC" ? "CLINIC" : "DOCTOR",
        })
    }

})

export const updateTreatmentApprovalStatus = asyncHandler(async (req, res) => {
    const { approval_status, treatment_id } = req.body;
    const { language = "en" } = req.user;

    const statusMessages = {
        APPROVED: "TREATMENT_APPROVED_SUCCESSFULLY",
        REJECTED: "TREATMENT_REJECTED_SUCCESSFULLY",
    };

    const notificationUpdates = {
        APPROVED: "treatment_approved",
        REJECTED: "treatment_rejected",
    };

    const [treatmentData] = await updateTreatmentApprovalStatusModel(treatment_id, approval_status)

    handleSuccess(res, 200, language, statusMessages[approval_status],)

    if (treatmentData) {
        await sendNotification({
            userData: req.user,
            type: "TREATMENT",
            type_id: treatment_id,
            notification_type: NOTIFICATION_MESSAGES[notificationUpdates[approval_status]],
            receiver_id: treatmentData.role === "CLINIC" ? treatmentData.clinic_id : treatmentData.doctor_id,
            receiver_type: treatmentData.role === "CLINIC" ? "CLINIC" : "DOCTOR",
        })
    }
})

export const addEditConcern = asyncHandler(async (req, res) => {
    const { concern_id: input_concern_id, ...body } = req.body;
    const role = req.user?.role;
    const user_id = req.user?.id;
    const language = req.user?.language || "en";

    const isAdmin = role === "ADMIN";
    const dbData = { ...body };

    dbData.tips = JSON.stringify(dbData.tips);

    // 🧩 Metadata
    if (isAdmin) {
        dbData.is_admin_created = true;
        dbData.approval_status = "APPROVED";
    } else {
        dbData.created_by_zynq_user_id = user_id;
    }

    let concern_id = input_concern_id;

    // ✳️ EDIT FLOW
    if (concern_id) {
        if (!isAdmin) {
            const [existing] = await checkExistingConcernModel(concern_id, user_id);
            if (!existing) {
                return handleError(res, 403, language, "NOT_AUTHORIZED_TO_EDIT_CONCERN");
            }
        }

        await updateConcernModel(concern_id, dbData);
    }
    // ✳️ CREATE FLOW
    else {
        concern_id = uuidv4();
        dbData.concern_id = concern_id;

        await addConcernModel(dbData);
    }

    const message = input_concern_id
        ? "CONCERN_UPDATED_SUCCESSFULLY"
        : "CONCERN_ADDED_SUCCESSFULLY";

    return handleSuccess(res, 200, language, message, { concern_id });
});

export const deleteConcern = asyncHandler(async (req, res) => {
    const { concern_id } = req.params;
    const role = req.user?.role;
    const user_id = req.user?.id;

    const language = req.user?.language || 'en';

    if (role === "ADMIN") {
        await deleteConcernModel(concern_id)
    } else {
        const deleted = await deleteZynqUserConcernsModel(concern_id, user_id);
        if (deleted.affectedRows === 0) {
            return handleError(res, 403, language, "NOT_AUTHORIZED_TO_DELETE_CONCERN");
        }
    }

    return handleSuccess(res, 200, language, "CONCERN_DELETED_SUCCESSFULLY");
});