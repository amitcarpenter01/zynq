
import { getLegalDocumentsForUsers, updateLegalDocumentsService } from "../../models/api.js";
import { asyncHandler, handleError, handleSuccess, } from "../../utils/responseHandler.js";
import { isEmpty } from "../../utils/user_helper.js";

export const getLegalDocuments = asyncHandler(async (req, res) => {
    const {language = "en", role} = req.user;
    const legalDocuments = await getLegalDocumentsForUsers(role, language);
    if (isEmpty(legalDocuments)) return handleError(res, 404, "en", "DOCUMENTS_NOT_FOUND");
    return handleSuccess(res, 200, 'en', "DOCUMENTS_FETCHED_SUCCESSFULLY", legalDocuments);
});

export const updateLegalDocuments = asyncHandler(async (req, res) => {
    const { TERMS_CONDITIONS, PRIVACY_POLICY, TERMS_CONDITIONS_SV, PRIVACY_POLICY_SV } = req.body;
    const result = await updateLegalDocumentsService({ TERMS_CONDITIONS, PRIVACY_POLICY, TERMS_CONDITIONS_SV, PRIVACY_POLICY_SV });
    if (!result || result.affectedRows === 0) return handleError(res, 404, "en", "DOCUMENTS_NOT_FOUND");
    return handleSuccess(res, 200, 'en', "DOCUMENTS_UPDATED_SUCCESSFULLY");
});

