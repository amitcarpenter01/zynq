import { addSubTreatmentsModel, addTreatmentConcernsModel, addTreatmentModel, checkExistingTreatmentModel, deleteClinicTreatmentsModel, deleteDoctorTreatmentsModel, deleteExistingConcernsModel, deleteExistingParentTreatmentsModel, deleteExistingSubTreatmentsModel, deleteTreatmentModel, deleteZynqUserTreatmentsModel, updateTreatmentModel } from "../../models/admin.js";
import { getTreatmentsByConcernId } from "../../models/api.js";
import { asyncHandler, handleError, handleSuccess, } from "../../utils/responseHandler.js";
import { isEmpty } from "../../utils/user_helper.js";
import { v4 as uuidv4 } from "uuid";

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

    return handleSuccess(res, 200, language, message, { treatment_id });
});

export const deleteTreatment = asyncHandler(async (req, res) => {
    const { treatment_id } = req.params;
    const role = req.user?.role;
    const user_id = req.user?.id;
    console.log("user id = ", user_id);
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


