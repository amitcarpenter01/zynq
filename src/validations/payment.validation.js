import Joi from "joi";
import {
  stringValidation,
  dateValidation,
  numberValidation,
  orderValidation,
  ratingValidation,
  idArrayValidation,
  gatewayTypeValidation,
  currencyValidation,
} from "../utils/joi.util.js";


export const initiatePaymentSchema = Joi.object({
  user_id: stringValidation,
  doctor_id: stringValidation.optional(),
  clinic_id: stringValidation.optional(),
  payment_gateway: gatewayTypeValidation,
  amount: numberValidation,
  currency: currencyValidation,
  metadata: Joi.object({
    type: Joi.string().valid('APPOINTMENT', 'TREATMENT', 'PRODUCT').required(),
    type_ids: idArrayValidation.required().min(1),
  }).required(),
});
