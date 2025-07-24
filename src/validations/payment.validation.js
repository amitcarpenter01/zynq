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
  doctor_id: stringValidation.optional(),
  clinic_id: stringValidation.optional(),
  payment_gateway: gatewayTypeValidation,
  currency: currencyValidation,
  metadata: Joi.object({
    type: Joi.string().valid('APPOINTMENT', 'TREATMENT', 'CART').required(),
    type_data: Joi.array().items(
      Joi.object({
        type_id: stringValidation,
        quantity: numberValidation
      })
    ).min(1).required()
  }).required()
});