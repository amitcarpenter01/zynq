import { getTreatmentsByConcernId } from "../../models/api.js";
import { asyncHandler, handleError, handleSuccess, } from "../../utils/responseHandler.js";
import { isEmpty } from "../../utils/user_helper.js";

export const getTreatmentsByConcern = asyncHandler(async (req, res) => {
    const { concern_id } = req.params;
    const treatmentsData = await getTreatmentsByConcernId(concern_id);
    if (isEmpty(treatmentsData)) return handleError(res, 404, "en", "TREATMENT_NOT_FOUND");
    return handleSuccess(res, 200, 'en', "TREATMENTS_FETCHED_SUCCESSFULLY", treatmentsData);
});
