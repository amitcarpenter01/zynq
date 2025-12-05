import {
    getAllConcerns,
    addConcernModel,
    addTreatmentConcernsModel, addTreatmentDeviceNameModel,
    getAllTreatmentsModel, getTreatmentsByTreatmentId, getSubTreatmentsByTreatmentId,
    addTreatmentModel, addSubTreatmentModel, checkExistingConcernModel, checkExistingTreatmentModel,
    deleteConcernModel, deleteExistingConcernsModel,
    deleteTreatmentDeviceNameModel,
    deleteTreatmentModel, deleteZynqUserConcernsModel, deleteZynqUserTreatmentsModel, updateConcernApprovalStatusModel,
    updateConcernModel, updateTreatmentApprovalStatusModel, updateTreatmentModel, updateSubtreatmentModel,
    deleteSubTreatmentModel,
    updateSubTreatmentUserMap,
    addSubTreatmentUserMap,
    getSubTreatmentModel,
    updateSubtreatmentMasterModel,
    addSubTreatmentMasterModel,
    getSubTreatmentMasterByName,
    deleteSubTreatmentMasterModel,
    getAllSubTreatmentsMasterModel,
    deleteTreatmentSubTreatmentsModel,
    addTreatmentSubTreatmentModel,
    deleteZynqUserSubTreatmentsModel,
    addTreatmentSubTreatmentUserModel,
    getUserSubTreatmentsByTreatmentId,
    getTreatmentsByZynqUserId,
    addUserMappedSubTreatmentsToMaster
} from "../../models/admin.js";
import { getTreatmentsByConcernId } from "../../models/api.js";
import { NOTIFICATION_MESSAGES, sendNotification } from "../../services/notifications.service.js";
import { asyncHandler, handleError, handleSuccess, } from "../../utils/responseHandler.js";
import { googleTranslator, isEmpty } from "../../utils/user_helper.js";
import { v4 as uuidv4 } from "uuid";
import { generateTreatmentEmbeddingsV2 } from "./embeddingsController.js";
import db from "../../config/db.js";
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { applyLanguageOverwrite } from "../../utils/misc.util.js";

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

    // Convert arrays → comma-separated for DB fields
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

        // 🧹 Cleanup & reinsert in EDIT mode
        await Promise.all([
            updateTreatmentModel(treatment_id, updateTreatment),
            deleteExistingConcernsModel(treatment_id),
            deleteTreatmentDeviceNameModel(treatment_id),
            !isAdmin
                ? deleteZynqUserSubTreatmentsModel(treatment_id)
                : deleteTreatmentSubTreatmentsModel(treatment_id)
        ]);

        // Insert fresh mappings
        if (dbData.concerns?.length > 0)
            await addTreatmentConcernsModel(treatment_id, dbData.concerns);

        if (req.body.device_name?.length > 0)
            await addTreatmentDeviceNameModel(treatment_id, req.body.device_name);

        if (req.body.sub_treatments?.length > 0)
            if (!isAdmin) await addTreatmentSubTreatmentUserModel(treatment_id, req.body.sub_treatments, user_id);
        if (isAdmin) await addTreatmentSubTreatmentModel(treatment_id, req.body.sub_treatments);

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

        await addTreatmentModel(addTreatment);

        if (dbData.concerns?.length > 0)
            await addTreatmentConcernsModel(dbData.treatment_id, dbData.concerns);

        if (req.body.device_name?.length > 0)
            await addTreatmentDeviceNameModel(dbData.treatment_id, req.body.device_name);

        if (req.body.sub_treatments?.length > 0)
            if (!isAdmin) await addTreatmentSubTreatmentUserModel(dbData.treatment_id, req.body.sub_treatments, user_id);
        if (isAdmin) await addTreatmentSubTreatmentModel(dbData.treatment_id, req.body.sub_treatments);
    }

    // FINAL RESPONSE
    const message = treatment_id
        ? "TREATMENT_UPDATED_SUCCESSFULLY"
        : "TREATMENT_ADDED_SUCCESSFULLY";

    handleSuccess(res, 200, language, message, {
        treatment_id: treatment_id || dbData.treatment_id
    });
});

// export const addEditSubtreatment = asyncHandler(async (req, res) => {
//     const { treatment_id, sub_treatment_id, ...body } = req.body;
//     const role = req.user?.role;
//     const user_id = req.user?.id;
//     const language = req.user?.language || 'en';

//     const isAdmin = role === "ADMIN";

//     const dbData = { ...body };

//     dbData.swedish = await googleTranslator(dbData.name, "sv");

//     // 🧩 Creator metadata
//     if (isAdmin) {
//         dbData.is_admin_created = true;
//         dbData.approval_status = "APPROVED";
//     } else {
//         dbData.created_by_zynq_user_id = user_id;
//         dbData.approval_status = "PENDING";
//     }

//     // ✳️ EDIT FLOW
//     if (sub_treatment_id) {
//         // 🛡️ Non-admin ownership check

//         const updateSubTreatment = {
//             treatment_id: treatment_id,
//             name: dbData.name,
//             swedish: dbData.swedish,
//             is_admin_created: dbData.is_admin_created,
//             approval_status: dbData.approval_status,
//         };
//         // 🧹 Cleanup + reinserts only if editing
//         await Promise.all([
//             updateSubtreatmentModel(sub_treatment_id, updateSubTreatment),
//         ]);
//     }

//     // ✳️ CREATE FLOW
//     else {
//         const addSubTreatment = {
//             treatment_id: treatment_id,
//             name: dbData.name,
//             swedish: dbData.swedish,
//             is_admin_created: dbData.is_admin_created,
//             approval_status: dbData.approval_status,
//         };

//         // Insert main + related tables together
//         await addSubTreatmentModel(addSubTreatment);
//     }

//     // ✅ Unified response
//     const message = sub_treatment_id
//         ? "SUBTREATMENT_UPDATED_SUCCESSFULLY"
//         : "SUBTREATMENT_ADDED_SUCCESSFULLY";

//     handleSuccess(res, 200, language, message, { sub_treatment_id: sub_treatment_id ? sub_treatment_id : dbData.sub_treatment_id });
//     // await generateTreatmentEmbeddingsV2(treatment_id)
// });

export const addEditSubtreatment = asyncHandler(async (req, res) => {
    const { treatment_id, sub_treatment_id, ...body } = req.body;
    const role = req.user?.role;
    const user_id = req.user?.id;
    const language = req.user?.language || "en";

    const isAdmin = role === "ADMIN";

    const dbData = { ...body };
    dbData.swedish = await googleTranslator(dbData.name, "sv");

    // 🧩 Creator metadata
    if (isAdmin) {
        dbData.is_admin_created = true;
        dbData.approval_status = "APPROVED";
    } else {
        dbData.is_admin_created = false;
        dbData.created_by_zynq_user_id = user_id;
        dbData.approval_status = "PENDING";
    }

    let newSubTreatmentId = sub_treatment_id;

    // ✳️ EDIT FLOW
    if (sub_treatment_id) {
        const updateSubTreatment = {
            treatment_id: treatment_id,
            name: dbData.name,
            swedish: dbData.swedish,
            is_admin_created: dbData.is_admin_created,
            approval_status: dbData.approval_status,
        };

        await updateSubtreatmentModel(sub_treatment_id, updateSubTreatment);

        // 👉 Update mapping if created by non-admin
        if (!isAdmin) {
            await updateSubTreatmentUserMap(
                sub_treatment_id,
                user_id,
                {
                    approval_status: dbData.approval_status
                }
            );
        }
    }

    // ✳️ CREATE FLOW
    else {
        console.log("user_id=>", user_id)
        const addSubTreatment = {
            treatment_id: treatment_id,
            name: dbData.name,
            swedish: dbData.swedish,
            is_admin_created: dbData.is_admin_created,
            approval_status: dbData.approval_status,
            created_by_zynq_user_id: user_id
        };

        const insertResult = await addSubTreatmentModel(addSubTreatment);
        const newData = await getSubTreatmentModel(treatment_id, dbData.name);
        console.log("newData", newData)
        newSubTreatmentId = newData?.sub_treatment_id;

        // 👉 Insert mapping if created by non-admin
        if (!isAdmin) {
            await addSubTreatmentUserMap({
                sub_treatment_id: newSubTreatmentId,
                zynq_user_id: user_id,
                approval_status: dbData.approval_status
            });
        }
    }

    // Response
    handleSuccess(res, 200, language,
        sub_treatment_id
            ? "SUBTREATMENT_UPDATED_SUCCESSFULLY"
            : "SUBTREATMENT_ADDED_SUCCESSFULLY",
        { sub_treatment_id: newSubTreatmentId }
    );
});

export const addEditSubTreatmentMaster = asyncHandler(async (req, res) => {
    const { sub_treatment_id, ...body } = req.body;

    const user_id = req.user?.id;
    const role = req.user?.role;
    const language = req.user?.language || "en";

    const isAdmin = role === "ADMIN";

    let dbData = { ...body };

    // 🌍 Auto translate name → Swedish
    dbData.swedish = await googleTranslator(dbData.name, "sv");

    // 🔐 Set creator & approval logic
    if (isAdmin) {
        dbData.approval_status = "APPROVED";
        dbData.is_admin_created = 1;
        dbData.created_by = null;
    } else {
        dbData.approval_status = "PENDING";
        dbData.is_admin_created = 0;
        dbData.created_by = user_id;
    }

    let newId = sub_treatment_id;

    /*
    |--------------------------------------------------------------------------
    | ✳️ UPDATE FLOW
    |--------------------------------------------------------------------------
    */
    if (sub_treatment_id) {
        const updateData = {
            name: dbData.name,
            swedish: dbData.swedish,
            approval_status: dbData.approval_status,
            is_admin_created: dbData.is_admin_created,
            created_by: dbData.created_by
        };

        await updateSubtreatmentMasterModel(sub_treatment_id, updateData);
    }

    /*
    |--------------------------------------------------------------------------
    | ✳️ CREATE FLOW
    |--------------------------------------------------------------------------
    */
    else {
        const insertData = {
            name: dbData.name,
            swedish: dbData.swedish,
            approval_status: dbData.approval_status,
            is_admin_created: dbData.is_admin_created,
            created_by: dbData.created_by
        };

        await addSubTreatmentMasterModel(insertData);

        // Fetch newly created ID using name (assuming unique name)
        const newRow = await getSubTreatmentMasterByName(dbData.name);
        newId = newRow?.sub_treatment_id;
    }

    // Response
    handleSuccess(
        res,
        200,
        language,
        sub_treatment_id
            ? "SUB_TREATMENT_MASTER_UPDATED_SUCCESSFULLY"
            : "SUB_TREATMENT_MASTER_ADDED_SUCCESSFULLY",
        { sub_treatment_id: newId }
    );
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
    console.log(user_id, '<=user_id')

    const language = req.user?.language || 'en';
    if (role === "ADMIN") {
        await deleteSubTreatmentModel(sub_treatment_id)
    } else {
        const deleted = await deleteZynqUserSubTreatmentsModel(sub_treatment_id, user_id);
        console.log(deleted, '<=data')
        if (deleted.affectedRows === 0) {
            return handleError(res, 403, language, "NOT_AUTHORIZED_TO_DELETE_SUB_TREATMENT");
        }
    }


    return handleSuccess(res, 200, language, "SUB_TREATMENT_DELETED_SUCCESSFULLY");
});

export const deleteSubTreatmentMaster = asyncHandler(async (req, res) => {
    const { sub_treatment_id } = req.params;
    // const role = req.user?.role;
    // const user_id = req.user?.id;
    // console.log(user_id, '<=user_id')

    const language = req.user?.language || 'en';

    await deleteSubTreatmentMasterModel(sub_treatment_id)

    return handleSuccess(res, 200, language, "SUB_TREATMENT_DELETED_SUCCESSFULLY");
});


// export const updateTreatmentApprovalStatus = asyncHandler(async (req, res) => {
//     const { approval_status, treatment_id } = req.body;
//     const { language = "en" } = req.user;

//     const statusMessages = {
//         APPROVED: "TREATMENT_APPROVED_SUCCESSFULLY",
//         REJECTED: "TREATMENT_REJECTED_SUCCESSFULLY",
//     };

//     const notificationUpdates = {
//         APPROVED: "treatment_approved",
//         REJECTED: "treatment_rejected",
//     };

//     const [treatmentData] = await updateTreatmentApprovalStatusModel(treatment_id, approval_status)

//     handleSuccess(res, 200, language, statusMessages[approval_status],)

//     if (treatmentData) {
//         await sendNotification({
//             userData: req.user,
//             type: "TREATMENT",
//             type_id: treatment_id,
//             notification_type: NOTIFICATION_MESSAGES[notificationUpdates[approval_status]],
//             receiver_id: treatmentData.role === "CLINIC" ? treatmentData.clinic_id : treatmentData.doctor_id,
//             receiver_type: treatmentData.role === "CLINIC" ? "CLINIC" : "DOCTOR",
//         })
//     }
// })


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

    const [treatmentData] = await updateTreatmentApprovalStatusModel(treatment_id, approval_status);
    // NEW FEATURE: Auto-add user sub-treatments to admin table
    if (approval_status === "APPROVED") {
        await addUserMappedSubTreatmentsToMaster(treatment_id, treatmentData.created_by_zynq_user_id);
    }

    handleSuccess(res, 200, language, statusMessages[approval_status]);

    // Send Notification
    if (treatmentData) {
        await sendNotification({
            userData: req.user,
            type: "TREATMENT",
            type_id: treatment_id,
            notification_type: NOTIFICATION_MESSAGES[notificationUpdates[approval_status]],
            receiver_id: treatmentData.role === "CLINIC" ? treatmentData.clinic_id : treatmentData.doctor_id,
            receiver_type: treatmentData.role === "CLINIC" ? "CLINIC" : "DOCTOR",
        });
    }
});

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

// export const getAllTreatments = asyncHandler(async (req, res) => {
//     const language = req?.user?.language || 'en';
//     const treatments = await getAllTreatmentsModel();

//     treatments.APPROVED = [];
//     treatments.OTHERS = [];
//     treatments.map((treatment) => {
//         if (treatment.approval_status === "APPROVED") {
//             treatments.APPROVED.push(treatment);
//         } else {
//             treatments.OTHERS.push(treatment);
//         }
//     })

//     return handleSuccess(res, 200, "en", "TREATMENTS_FETCHED", treatments);
// });
export const getAllTreatments = asyncHandler(async (req, res) => {
    const role = req.user?.role;
    const zynq_user_id = req.user?.id;
    const language = req.user?.language || 'en';

    const isAdmin = role === "ADMIN";

    let treatments = [];
    if (!isAdmin) {
        treatments = await getTreatmentsByZynqUserId(zynq_user_id);
    } else {
        treatments = await getAllTreatmentsModel();
    }

    const approved = [];
    const others = [];

    for (const item of treatments) {
        if (item.approval_status === "APPROVED") {
            approved.push(item);
        } else {
            others.push(item);
        }
    }

    const response = {
        ALL: treatments,
        APPROVED: approved,
        OTHERS: others
    };

    return handleSuccess(res, 200, language, "TREATMENTS_FETCHED", applyLanguageOverwrite(response, language));
});

export const getAllSubTreatmentMasters = asyncHandler(async (req, res) => {
    const language = req?.user?.language || "en";

    const subTreatments = await getAllSubTreatmentsMasterModel();

    const approved = [];
    const others = [];

    for (const item of subTreatments) {
        if (item.approval_status === "APPROVED") {
            approved.push(item);
        } else {
            others.push(item);
        }
    }

    const response = {
        ALL: subTreatments,
        APPROVED: approved,
        OTHERS: others
    };

    return handleSuccess(res, 200, language, "SUB_TREATMENTS_FETCHED", applyLanguageOverwrite(response, language));
});


export const getAllTreatmentById = asyncHandler(async (req, res) => {
    const { treatment_id } = req.query;
    const role = req.user?.role;
    const zynq_user_id = req.user?.id;
    const language = req.user?.language || 'en';

    const isAdmin = role === "ADMIN";

    let treatments = [];

    // Different fetch logic for admin vs user
    if (!isAdmin) {
        treatments = await getTreatmentsByTreatmentId(treatment_id);
    } else {
        treatments = await getTreatmentsByTreatmentId(treatment_id, zynq_user_id);
    }

    if (treatments.length === 0) {
        return handleError(res, 404, language, "TREATMENT_NOT_FOUND");
    }

    // Add sub-treatments for each treatment
    await Promise.all(
        treatments.map(async (t) => {
            if (!isAdmin) {
                // Non-admin: fetch user-based sub-treatments
                t.sub_treatments = await getUserSubTreatmentsByTreatmentId(
                    t.treatment_id,
                    zynq_user_id,
                    language
                );
            } else {
                // Admin: fetch all approved sub-treatments
                t.sub_treatments = await getSubTreatmentsByTreatmentId(
                    t.treatment_id,
                    language
                );
            }
        })
    );

    return handleSuccess(res, 200, language, "TREATMENTS_FETCHED", treatments[0]);
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

export const import_treatments_from_CSV = async (req, res) => {
    const role = req.user?.role;
    const language = req.user?.language || "en";

    // Admin only
    if (role !== "ADMIN") {
        return handleError(res, 403, language, "ONLY_ADMIN_CAN_IMPORT_TREATMENTS");
    }

    const filePath = req.file?.path;
    if (!filePath) return handleError(res, 400, language, "CSV_REQUIRED");

    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet);

        if (!rows.length) {
            fs.unlinkSync(filePath);
            return handleError(res, 400, language, "CSV_EMPTY");
        }

        // Fetch existing treatments (by name for duplicate prevention)
        const existingRows = await db.query(
            `SELECT name FROM tbl_treatments`
        );

        const existingList = Array.isArray(existingRows) ? existingRows : [];
        const existingNames = new Set(existingList.map(r => (r.name || "").trim().toLowerCase()));

        const seenCSV = new Set(); // for deduplication inside CSV
        const toInsert = [];

        for (const row of rows) {
            const name = (row.name || "").trim();

            if (!name) continue;

            const lowerName = name.toLowerCase();

            // Skip duplicates
            if (existingNames.has(lowerName) || seenCSV.has(lowerName)) continue;

            seenCSV.add(lowerName);

            const treatment_id = uuidv4();

            // Clean fields
            const concernsArr = (row.concerns || "").split(",").map(c => c.trim()).filter(Boolean);
            const deviceArr = (row.device_name || "").split(",").map(d => d.trim()).filter(Boolean);

            // Prepare translated fields
            const swedish = await googleTranslator(name, "sv");
            const benefits_sv = await googleTranslator(row.benefits_en || "", "sv");
            const description_sv = await googleTranslator(row.description_en || "", "sv");

            const treatmentObject = {
                treatment_id,
                name,
                swedish,
                device_name: row.device_name || "",
                like_wise_terms: row.like_wise_terms || "",
                classification_type: row.classification_type || "",
                benefits_en: row.benefits_en || "",
                benefits_sv,
                description_en: row.description_en || "",
                description_sv,
                source: row.source || "",
                is_device: row.is_device === "true" || row.is_device === "1",
                is_admin_created: true,
                created_by_zynq_user_id: null,
                approval_status: "APPROVED",
                _concerns: concernsArr,
                _devices: deviceArr
            };

            toInsert.push(treatmentObject);
        }

        if (!toInsert.length) {
            fs.unlinkSync(filePath);
            return handleError(res, 400, language, "NO_NEW_RECORDS");
        }

        // Insert each treatment and its related rows
        for (const t of toInsert) {
            await addTreatmentModel(t);

            if (t._concerns.length > 0) {
                await addTreatmentConcernsModel(t.treatment_id, t._concerns);
            }

            if (t._devices.length > 0) {
                await addTreatmentDeviceNameModel(t.treatment_id, t._devices);
            }
        }

        fs.unlinkSync(filePath);
        return handleSuccess(res, 200, language, "TREATMENT_IMPORT_SUCCESS", {
            inserted: toInsert.length,
        });

    } catch (error) {
        console.error("Import failed:", error);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return handleError(res, 500, language, "INTERNAL_SERVER_ERROR " + error.message);
    }
};