import Joi from "joi";
import {
  stringValidation,
  dateValidation,
  numberValidation,
  orderValidation,
  ratingValidation,
  idArrayValidation,
  booleanValidation,
} from "../utils/joi.util.js";


export const getAllProductsSchema = Joi.object({
  filters: Joi.object({
    treatment_ids: idArrayValidation.optional(),
    concern_ids: idArrayValidation.optional(),
    search: stringValidation.optional(),
    price: Joi.object({
      min: numberValidation.min(0),
      max: numberValidation.min(0)
    }).optional(),
    recommended: booleanValidation.optional()
  }).optional(),

  sort: Joi.object({
    by: Joi.string().valid('nearest', 'rating', 'price').default('nearest'),
    order: orderValidation
  }).optional(),

  pagination: Joi.object({
    page: numberValidation.min(1).default(1),
    limit: numberValidation.min(1).default(20)
  }).optional()
});

export const deleteClinicImageSchema = Joi.object({
  clinic_image_id: stringValidation
})

export const getSingleProductSchema = Joi.object({
  product_id: stringValidation
})

export const updateProductApprovalStatusSchema = Joi.object({
  product_id: stringValidation,
  approval_status: stringValidation.valid('APPROVED', 'REJECTED')
})