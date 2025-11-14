import {
    getAllConcerns,
    addConcernModel, addSubTreatmentsModel,
    addTreatmentConcernsModel, addTreatmentDeviceNameModel,
    getAllTreatmentsModel, getTreatmentsByTreatmentId, getSubTreatmentsByTreatmentId,
    addTreatmentModel, addSubTreatmentModel, checkExistingConcernModel, checkExistingTreatmentModel,
    deleteClinicTreatmentsModel, deleteConcernModel, deleteDoctorTreatmentsModel, deleteExistingConcernsModel,
    deleteTreatmentDeviceNameModel, deleteExistingParentTreatmentsModel, deleteExistingSubTreatmentsModel,
    deleteTreatmentModel, deleteZynqUserConcernsModel, deleteZynqUserTreatmentsModel, updateConcernApprovalStatusModel,
    updateConcernModel, updateTreatmentApprovalStatusModel, updateTreatmentModel, updateSubtreatmentModel,
    deleteSubTreatmentModel, deleteZynqUserSubTreatmentsModel
} from "../../models/admin.js";
import { getTreatmentsByConcernId } from "../../models/api.js";
import { NOTIFICATION_MESSAGES, sendNotification } from "../../services/notifications.service.js";
import { asyncHandler, handleError, handleSuccess, } from "../../utils/responseHandler.js";
import { googleTranslator, isEmpty } from "../../utils/user_helper.js";
import { v4 as uuidv4 } from "uuid";
import { generateTreatmentEmbeddingsV2 } from "./embeddingsController.js";
import db from "../../config/db.js";

export const getTreatmentsByConcern = asyncHandler(async (req, res) => {
    const { concern_id } = req.params;
    const treatmentsData = await getTreatmentsByConcernId(concern_id);
    if (isEmpty(treatmentsData)) return handleError(res, 404, "en", "TREATMENT_NOT_FOUND");
    return handleSuccess(res, 200, 'en', "TREATMENTS_FETCHED_SUCCESSFULLY", treatmentsData);
});

export const addEditTreatment = asyncHandler(async (req, res) => {
    const { treatment_id, ...body } = req.body;
    const role = req.user?.role;
    const user_id = req.user?.id;
    const language = req.user?.language || 'en';

    const isAdmin = role === "ADMIN";

    const dbData = { ...body };
    dbData.swedish = await googleTranslator(dbData.name, "sv");
    dbData.benefits_sv = await googleTranslator(dbData.benefits_en, "sv");
    dbData.description_sv = await googleTranslator(dbData.description_en, "sv");

    // 🧩 Creator metadata
    if (isAdmin) {
        dbData.created_by_zynq_user_id = null;
        dbData.is_admin_created = true;
        dbData.approval_status = "APPROVED";
    } else {
        dbData.created_by_zynq_user_id = user_id;
        dbData.is_admin_created = false;
        dbData.approval_status = "PENDING";
    }

    if (Array.isArray(dbData.device_name)) dbData.device_name = dbData.device_name.join(',');
    if (Array.isArray(dbData.like_wise_terms)) dbData.like_wise_terms = dbData.like_wise_terms.join(',');

    // ✳️ EDIT FLOW
    if (treatment_id) {
        // 🛡️ Non-admin ownership check
        if (!isAdmin) {
            const [existing] = await checkExistingTreatmentModel(treatment_id, user_id);
            if (!existing) return handleError(res, 403, language, "NOT_AUTHORIZED_TO_EDIT_TREATMENT");
        }


        const updateTreatment = {
            name: dbData.name,
            swedish: dbData.swedish,
            device_name: dbData.device_name,
            like_wise_terms: dbData.like_wise_terms,
            classification_type: dbData.classification_type,
            benefits_en: dbData.benefits_en,
            benefits_sv: dbData.benefits_sv,
            description_en: dbData.description_en,
            description_sv: dbData.description_sv,
            source: dbData.source,
            is_device: dbData.is_device,
            is_admin_created: dbData.is_admin_created,
            created_by_zynq_user_id: dbData.created_by_zynq_user_id,
            approval_status: dbData.approval_status,
        };
        // 🧹 Cleanup + reinserts only if editing
        await Promise.all([
            updateTreatmentModel(treatment_id, updateTreatment),
            deleteExistingConcernsModel(treatment_id),
            deleteTreatmentDeviceNameModel(treatment_id),
        ]);

        if (dbData.concerns.length > 0) await addTreatmentConcernsModel(treatment_id, dbData.concerns);
        if (dbData.device_name.length > 0) await addTreatmentDeviceNameModel(treatment_id, req.body.device_name);
    }

    // ✳️ CREATE FLOW
    else {
        dbData.treatment_id = uuidv4();
        const addTreatment = {
            treatment_id: dbData.treatment_id,
            name: dbData.name,
            swedish: dbData.swedish,
            device_name: dbData.device_name,
            like_wise_terms: dbData.like_wise_terms,
            classification_type: dbData.classification_type,
            benefits_en: dbData.benefits_en,
            benefits_sv: dbData.benefits_sv,
            description_en: dbData.description_en,
            description_sv: dbData.description_sv,
            source: dbData.source,
            is_device: dbData.is_device,
            is_admin_created: dbData.is_admin_created,
            created_by_zynq_user_id: dbData.created_by_zynq_user_id,
            approval_status: dbData.approval_status,
        };

        // Insert main + related tables together
        await addTreatmentModel(addTreatment);
        if (dbData.concerns.length > 0) await addTreatmentConcernsModel(dbData.treatment_id, dbData.concerns);
        if (dbData.device_name.length > 0) await addTreatmentDeviceNameModel(dbData.treatment_id, req.body.device_name);
    }

    // ✅ Unified response
    const message = treatment_id
        ? "TREATMENT_UPDATED_SUCCESSFULLY"
        : "TREATMENT_ADDED_SUCCESSFULLY";

    // await generateTreatmentEmbeddingsV2(treatment_id ? treatment_id : dbData.treatment_id)
    handleSuccess(res, 200, language, message, { treatment_id: treatment_id ? treatment_id : dbData.treatment_id });
});

export const addEditSubtreatment = asyncHandler(async (req, res) => {
    const { treatment_id, sub_treatment_id, ...body } = req.body;
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
        dbData.approval_status = "PENDING";
    }

    // ✳️ EDIT FLOW
    if (sub_treatment_id) {
        // 🛡️ Non-admin ownership check

        const updateSubTreatment = {
            treatment_id: treatment_id,
            name: dbData.name,
            swedish: dbData.swedish,
            is_admin_created: dbData.is_admin_created,
            approval_status: dbData.approval_status,
        };
        // 🧹 Cleanup + reinserts only if editing
        await Promise.all([
            updateSubtreatmentModel(sub_treatment_id, updateSubTreatment),
        ]);
    }

    // ✳️ CREATE FLOW
    else {
        const addSubTreatment = {
            treatment_id: treatment_id,
            name: dbData.name,
            swedish: dbData.swedish,
            is_admin_created: dbData.is_admin_created,
            approval_status: dbData.approval_status,
        };

        // Insert main + related tables together
        await addSubTreatmentModel(addSubTreatment);
    }

    // ✅ Unified response
    const message = sub_treatment_id
        ? "SUBTREATMENT_UPDATED_SUCCESSFULLY"
        : "SUBTREATMENT_ADDED_SUCCESSFULLY";

    handleSuccess(res, 200, language, message, { sub_treatment_id: sub_treatment_id ? sub_treatment_id : dbData.sub_treatment_id });
    // await generateTreatmentEmbeddingsV2(treatment_id)
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

export const deleteSubTreatment = asyncHandler(async (req, res) => {
    const { sub_treatment_id } = req.params;
    const role = req.user?.role;
    const user_id = req.user?.id;


    const language = req.user?.language || 'en';
    if (role === "ADMIN") {
        await deleteSubTreatmentModel(sub_treatment_id)
    } else {
        const deleted = await deleteZynqUserSubTreatmentsModel(sub_treatment_id, user_id);
        if (deleted.affectedRows === 0) {
            return handleError(res, 403, language, "NOT_AUTHORIZED_TO_DELETE_SUB_TREATMENT");
        }
    }


    return handleSuccess(res, 200, language, "SUB_TREATMENT_DELETED_SUCCESSFULLY");
});


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

export const get_all_concerns = async (req, res) => {
    try {
        const language = req?.user?.language || 'en';
        const concerns = await getAllConcerns(language);

        return handleSuccess(res, 200, "en", "CONCERNS_FETCHED", concerns);
    } catch (error) {
        console.error("Error fetching concerns:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const getAllTreatments = asyncHandler(async (req, res) => {
    const language = req?.user?.language || 'en';
    const treatments = await getAllTreatmentsModel();
    return handleSuccess(res, 200, "en", "TREATMENTS_FETCHED", treatments);
});

export const getAllTreatmentById = asyncHandler(async (req, res) => {
    const { treatment_id } = req.query;
    const language = req?.user?.language || 'en';
    const treatments = await getTreatmentsByTreatmentId(treatment_id);
    if (treatments.length === 0) return handleError(res, 404, language, "TREATMENT_NOT_FOUND");
    await Promise.all(
        treatments.map(async (t) => {
            t.sub_treatments =
                await getSubTreatmentsByTreatmentId(
                    t.treatment_id,
                    language
                );
        })
    );
    return handleSuccess(res, 200, "en", "TREATMENTS_FETCHED", treatments);
});

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

export const updateConcernApprovalStatus = asyncHandler(async (req, res) => {
    const { approval_status, concern_id } = req.body;
    const { language = "en" } = req.user;

    // 🧩 Map messages dynamically based on status
    const statusMessages = {
        APPROVED: "CONCERN_APPROVED_SUCCESSFULLY",
        REJECTED: "CONCERN_REJECTED_SUCCESSFULLY",
    };

    const notificationUpdates = {
        APPROVED: "concern_approved",
        REJECTED: "concern_rejected",
    };

    // 🔹 Update approval status and fetch concern creator details
    const [concernData] = await updateConcernApprovalStatusModel(concern_id, approval_status);

    // ✅ Respond immediately to client
    handleSuccess(res, 200, language, statusMessages[approval_status]);

    // 🔔 Send notification asynchronously (non-blocking)
    if (concernData) {
        await sendNotification({
            userData: req.user,
            type: "CONCERN",
            type_id: concern_id,
            notification_type: NOTIFICATION_MESSAGES[notificationUpdates[approval_status]],
            receiver_id: concernData.role === "CLINIC" ? concernData.clinic_id : concernData.doctor_id,
            receiver_type: concernData.role === "CLINIC" ? "CLINIC" : "DOCTOR",
        });
    }
});
