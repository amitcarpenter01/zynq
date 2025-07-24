import Joi from "joi";
import {
  stringValidation,
  dateValidation,
  numberValidation,
  orderValidation,
  ratingValidation,
  idArrayValidation,
} from "../utils/joi.util.js";


export const getAllClinicsSchema = Joi.object({
  filters: Joi.object({
    treatment_ids: idArrayValidation.optional(),
    skin_condition_ids: idArrayValidation.optional(),
    aesthetic_device_ids: idArrayValidation.optional(),
    skin_type_ids: idArrayValidation.optional(),
    surgery_ids: idArrayValidation.optional(),
    concern_ids: idArrayValidation.optional(),
    distance: Joi.object({
      min: numberValidation.min(0),
      max: numberValidation.min(0)
    }).optional(),
    price: Joi.object({
      min: numberValidation.min(0),
      max: numberValidation.min(0)
    }).optional(),
    search: stringValidation.optional(),
    min_rating: ratingValidation.optional(),
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

export const getSingleClinicSchema = Joi.object({
  clinic_id: stringValidation
})