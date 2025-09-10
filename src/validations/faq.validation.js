import Joi from "joi";
import {
  stringValidation,
  booleanValidation,
} from "../utils/joi.util.js";
import configs from "../config/config.js";

export const getSingleFAQSchema = Joi.object({
  faq_id: stringValidation,
})

export const deleteFAQSchema = Joi.object({
  faq_id: stringValidation,
})
const allowedCategories = configs.faq_categories.flatMap(cat =>
  [cat.en, cat.sv].filter(Boolean)
);

export const addEditFAQSchema = Joi.object({
  faq_id: stringValidation.optional(),
  category: stringValidation.valid(...allowedCategories),
  question: stringValidation,
  answer: stringValidation,
  question_sv: stringValidation.when('is_manual', { is: false, then: Joi.optional() }),
  answer_sv: stringValidation.when('is_manual', { is: false, then: Joi.optional() }),
  is_manual: booleanValidation
});

export const getAllFAQSchema = Joi.object({
  filters: Joi.object({
    category: stringValidation.valid(...configs.faq_categories).optional(),
    search: stringValidation.optional(),
  }).optional(),
})