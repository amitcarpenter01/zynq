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
  clinic_id: stringValidation.optional(),
  doctor_id: stringValidation.optional(),
  address_id: stringValidation.optional(),
  payment_gateway: gatewayTypeValidation,
  redirect_url: stringValidation.optional(),
  cancel_url: stringValidation.optional(),
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

export const klarnaWebhookSchema = Joi.object({
  order_id: stringValidation,
});

export const updateShipmentStatusSchema = Joi.object({
  purchase_id: stringValidation,
  shipment_status: stringValidation.valid("PENDING", "SHIPPED", "DELIVERED"),
})

export const getSinglePurchasedProductSchema = Joi.object({
  purchase_id: stringValidation
})

export const addWalletAmountSchema = Joi.object({
  user_id: stringValidation,
  user_type: stringValidation.valid("DOCTOR", "CLINIC", "SOLO-DOCTOR"),
  amount: numberValidation,
  order_type: stringValidation.valid("PURCHASE", "APPOINTMENT"),
  order_id: stringValidation
})

export const getPaymentHistorySchema = Joi.object({
  page: numberValidation.optional().min(1).default(1),
  limit: numberValidation.optional().min(1).default(10)
}).optional()