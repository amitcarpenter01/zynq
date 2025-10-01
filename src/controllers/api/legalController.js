
import { getLegalDocumentsForUsers, updateLegalDocumentsService } from "../../models/api.js";
import { asyncHandler, handleError, handleSuccess, } from "../../utils/responseHandler.js";
import { isEmpty } from "../../utils/user_helper.js";
import axios from "axios";

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

export const openAIBackendEndpoint = asyncHandler(async (req, res) => {
    try {
        const { payload } = req.body;
        const openaiKey = process.env.OPENAI_API_KEY;
        
        console.log("OpenAI API Key:", openaiKey);
        if (!payload) {
            return handleError(res, 400, "en", "PAYLOAD_REQUIRED", { error: "Payload is required" });
        }

        // Ensure payload is JSON
        let parsedPayload;
        if (typeof payload === "string") {
            try {
                parsedPayload = JSON.parse(payload);
            } catch (err) {
                return handleError(res, 400, "en", "INVALID_PAYLOAD", { error: "Payload must be valid JSON string" });
            }
        } else if (typeof payload === "object") {
            parsedPayload = payload;
        } else {
            return handleError(res, 400, "en", "INVALID_PAYLOAD", { error: "Payload must be an object or JSON string" });
        }

        // Axios request to OpenAI
        const openAIResponse = await axios.post(
            "https://api.openai.com/v1/chat/completions", // fixed endpoint
            parsedPayload,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${openaiKey}`,
                },
                timeout: 30000, // optional, 30s timeout
            }
        );

        return handleSuccess(res, openAIResponse.status, "en", "OPENAI_RESPONSE", openAIResponse.data);

    } catch (error) {
        // Axios-specific error handling
        if (error.response) {
            // OpenAI returned an error response
            return handleError(
                res,
                error.response.status,
                "en",
                "OPENAI_ERROR",
                { error: error }
            );
        } else if (error.request) {
            // Request was made but no response received
            return handleError(res, 502, "en", "OPENAI_NO_RESPONSE", { error: "No response from OpenAI" });
        } else {
            // Other errors
            return handleError(res, 500, "en", "OPENAI_PROXY_ERROR", { error: error.message });
        }
    }
});

