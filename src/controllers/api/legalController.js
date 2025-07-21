
import { getLegalDocumentsForUsers, updateLegalDocumentsService } from "../../models/api.js";
import { asyncHandler, handleError, handleSuccess, } from "../../utils/responseHandler.js";
import { isEmpty } from "../../utils/user_helper.js";
 
export const getLegalDocuments = asyncHandler(async (req, res) => {
    const legalDocuments = await getLegalDocumentsForUsers();
    if (isEmpty(legalDocuments)) return handleError(res, 404, "en", "DOCUMENTS_NOT_FOUND");
    return handleSuccess(res, 200, 'en', "DOCUMENTS_FETCHED_SUCCESSFULLY", legalDocuments);
});
 
export const updateLegalDocuments = asyncHandler(async (req, res) => {
    const { TERMS_CONDITIONS, PRIVACY_POLICY } = req.body;
    const result = await updateLegalDocumentsService({ TERMS_CONDITIONS, PRIVACY_POLICY });
    if (!result || result.affectedRows === 0) return handleError(res, 404, "en", "DOCUMENTS_NOT_FOUND");
    return handleSuccess(res, 200, 'en', "DOCUMENTS_UPDATED_SUCCESSFULLY");
});
 
 