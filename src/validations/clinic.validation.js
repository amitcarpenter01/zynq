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
    concern_ids : idArrayValidation.optional(),
    min_rating: ratingValidation.optional(),
  }).optional(),
 
  sort: Joi.object({
    by: Joi.string().valid('nearest', 'rating').default('nearest'),
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