
import { gemini, openai } from "../../../app.js";
import configs from "../../config/config.js";
import { addConsentModel, getLegalDocumentsForUsers, updateLegalDocumentsService } from "../../models/api.js";
import { asyncHandler, handleError, handleSuccess, } from "../../utils/responseHandler.js";
import { isEmpty } from "../../utils/user_helper.js";
import axios from "axios";

export const getLegalDocuments = asyncHandler(async (req, res) => {
  const { language = "en", role } = req.user;
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

function sanitizeMessageContent(content) {
  if (typeof content !== "string") return "";
  return content
    .replace(/\n{3,}/g, '\n\n')   // collapse 3+ newlines into 2
    .replace(/[ \t]+/g, ' ')      // collapse tabs/spaces
    .trim();
}

export const openAIBackendEndpoint = asyncHandler(async (req, res) => {
  try {
    const { payload } = req.body;

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

    // --- Retry Logic (1 extra attempt) ---
    let attempt = 0;
    let openAIResponse;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      try {
        openAIResponse = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          parsedPayload,
          {
            headers: {
              "Content-Type": "application/json",
              "Authorization": `bearer ${configs.openaiKey}`,
            },
          }
        );
        break; // success → exit retry loop
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) throw error; // retry only once
        console.warn(`OpenAI request failed (attempt ${attempt}). Retrying...`);
        await new Promise((r) => setTimeout(r, 500)); // small delay
      }
    }

    return handleSuccess(res, openAIResponse.status, "en", "OPENAI_RESPONSE", openAIResponse.data);

  } catch (error) {
    // Axios-specific error handling
    if (error.response) {
      return handleError(
        res,
        error.response.status,
        "en",
        error.response.data.error.message,
      );
    } else if (error.request) {
      return handleError(res, 502, "en", "OPENAI_NO_RESPONSE", { error: "No response from OpenAI" });
    } else {
      return handleError(res, 500, "en", "OPENAI_PROXY_ERROR", { error: error.message });
    }
  }
});

export const openAIBackendEndpointV2 = asyncHandler(async (req, res) => {
  try {
    console.log("API RAN");

    const { payload } = req.body;

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

    // const sanitizedMessages = parsedPayload.messages.map(msg => ({
    //     role: msg.role,
    //     content: sanitizeMessageContent(msg.content),
    // }));


    // Call OpenAI
    const openAIResponse = await openai.responses.create({
      model: "gpt-5",
      input: parsedPayload.messages
    });

    return handleSuccess(res, 200, "en", "OPENAI_RESPONSE", openAIResponse);

  } catch (error) {
    if (error.response) {
      return handleError(
        res,
        error.response.status,
        "en",
        "OPENAI_ERROR",
        { error }
      );
    } else if (error.request) {
      return handleError(res, 502, "en", "OPENAI_NO_RESPONSE", { error: "No response from OpenAI" });
    } else {
      console.log(error);
      return handleError(res, 500, "en", "OPENAI_PROXY_ERROR", { error: error.message });
    }
  }
});

export const geminiBackendEndpoint = asyncHandler(async (req, res) => {
  try {
    console.log("Gemini API RAN");

    const { payload } = req.body;

    // Parse payload
    let parsedPayload;
    if (typeof payload === "string") {
      try {
        parsedPayload = JSON.parse(payload);
      } catch (err) {
        return handleError(res, 400, "en", "INVALID_PAYLOAD", {
          error: "Payload must be valid JSON string",
        });
      }
    } else if (typeof payload === "object") {
      parsedPayload = payload;
    } else {
      return handleError(res, 400, "en", "INVALID_PAYLOAD", {
        error: "Payload must be an object or JSON string",
      });
    }

    const sanitizedMessages = parsedPayload.map((msg) => ({
      role: msg.role,
      content: sanitizeMessageContent(msg.content),
    }));

    const prompt = sanitizedMessages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });
    const responseText = response.text();

    return handleSuccess(res, 200, "en", "GEMINI_RESPONSE", {
      text: responseText,
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    if (error.response) {
      return handleError(res, error.response.status, "en", "GEMINI_ERROR", {
        error,
      });
    } else if (error.request) {
      return handleError(res, 502, "en", "GEMINI_NO_RESPONSE", {
        error: "No response from Gemini",
      });
    } else {
      return handleError(res, 500, "en", "GEMINI_PROXY_ERROR", {
        error: error.message,
      });
    }
  }
});

export const addConsent = asyncHandler(async (req, res) => {
  const { device_id } = req.body;
  const user_id = req?.user?.user_id ?? null;

  if (!user_id && isEmpty(device_id)) {
    return handleError(res, 400, "en", "DEVICE_OR_USER_REQUIRED");
  }

  await addConsentModel({
    user_id,
    device_id: user_id ? null : device_id
  });

  return handleSuccess(res, 200, "en", "CONSENT_ADDED_SUCCESSFULLY");
});
