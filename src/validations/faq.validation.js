import Joi from "joi";
import {
  stringValidation,
  booleanValidation,
  idArrayValidation
} from "../utils/joi.util.js";

export const getSingleFAQSchema = Joi.object({
  faq_id: stringValidation,
})

export const deleteFAQSchema = Joi.object({
  faq_id: stringValidation,
})

export const addEditFAQSchema = Joi.object({
  faq_id: stringValidation.optional(),
  category: stringValidation,
  question: stringValidation,
  answer: stringValidation,
  question_sv: stringValidation.when('is_manual', { is: false, then: Joi.optional() }),
  answer_sv: stringValidation.when('is_manual', { is: false, then: Joi.optional() }),
  is_manual: booleanValidation
});

export const getAllFAQSchema = Joi.object({
  filters: Joi.object({
    category: idArrayValidation.optional(),
    search: stringValidation.optional(),
  }).optional(),
})

export const getSingleFAQCategorySchema = Joi.object({
  faq_category_id: stringValidation,
})

export const deleteFAQCategorySchema = Joi.object({
  faq_category_id: stringValidation,
})

export const addEditFAQCategorySchema = Joi.object({
  faq_category_id: stringValidation.optional(),
  english: stringValidation,
  swedish: stringValidation
});