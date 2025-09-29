import joi from "joi";
import {
  emailValidation,
  idArrayValidation,
  stringValidation,
} from "../utils/joi.util.js";


export const getTreatmentsByConcernSchema = joi.object({
  concern_id: stringValidation,
});

export const getTreatmentsByConcersSchema = joi.object({
  concern_ids: idArrayValidation,
})
export const getTipsByConcernsSchema = joi.object({
  concern_ids: idArrayValidation,
})

export const getTreatmentsSchema = joi.object({
  treatment_ids: idArrayValidation.optional(),
});

export const sendFaceResultToEmailSchema = joi.object({
  face_scan_result_id: stringValidation.optional().allow("", null),
})

export const getTreatmentFiltersSchema = joi.object({
  filters: joi.object({
    search: stringValidation.optional(),
    treatment_ids: idArrayValidation.optional(),
  }).optional()
}).optional()