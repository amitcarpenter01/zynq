import joi from "joi";
import {
  stringValidation,
  objectValidation,
  userTypeValidation,
  booleanValidation,
} from "../utils/joi.util.js";

export const updateLegalDocumentsSchema = joi.object({
  TERMS_CONDITIONS: stringValidation.optional(),
  PRIVACY_POLICY: stringValidation.optional(),
  TERMS_CONDITIONS_SV: stringValidation.optional(),
  PRIVACY_POLICY_SV: stringValidation.optional(),
}).or('TERMS_CONDITIONS', 'PRIVACY_POLICY', 'TERMS_CONDITIONS_SV', 'PRIVACY_POLICY_SV');