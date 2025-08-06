import joi from "joi";
import {
  stringValidation,
  objectValidation,
  userTypeValidation,
  booleanValidation,
  numberValidation,
} from "../utils/joi.util.js";

export const updateAdminCommissionRatesSchema = joi.object({
  APPOINTMENT_COMMISSION: numberValidation.optional(),
  PRODUCT_COMMISSION: numberValidation.optional()
}).or('APPOINTMENT_COMMISSION', 'PRODUCT_COMMISSION');