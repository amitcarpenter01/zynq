import joi from "joi";
import {
  stringValidation,
  objectValidation,
  userTypeValidation,
  booleanValidation,
} from "../utils/joi.util.js";
 
export const updateLegalDocumentsSchema = joi.object({
  TERMS_CONDITIONS: stringValidation.optional(),
  PRIVACY_POLICY: stringValidation.optional()
}).or('TERMS_CONDITIONS', 'PRIVACY_POLICY');