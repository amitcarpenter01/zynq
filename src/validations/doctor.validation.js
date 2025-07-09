import joi from "joi";
import {
  idArrayValidation,
  stringValidation,
  numberValidation,
  orderValidation,
  ratingValidation,
} from "../utils/joi.util.js";

export const getSingleDoctorSchema = joi.object({
  doctor_id: stringValidation,
});

export const getAllDoctorsSchema = joi.object({
  filters: joi.object({
    treatment_ids: idArrayValidation.optional(),
    skin_condition_ids: idArrayValidation.optional(),
    aesthetic_device_ids: idArrayValidation.optional(),
    skin_type_ids: idArrayValidation.optional(),
    surgery_ids: idArrayValidation.optional(),
    min_rating: ratingValidation.optional(),
  }).optional(),

  sort: joi.object({
    by: joi.string().valid('nearest', 'rating').default('nearest'),
    order: orderValidation
  }).optional(),

  pagination: joi.object({
    page: numberValidation.min(1).default(1),
    limit: numberValidation.min(1).default(20)
  }).optional()
});