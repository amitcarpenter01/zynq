import joi from "joi";
import {
  booleanValidation,
  emailValidation,
  idArrayValidation,
  numberValidation,
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
    recommended: booleanValidation.optional()
  }).optional()
}).optional()

export const addAppointmentDraftSchema = joi.object({
  user_id: stringValidation,
  clinic_id: stringValidation,
  report_id: stringValidation,
  discount_type: stringValidation.valid('PERCENTAGE', 'SEK'),
  discount_value: numberValidation.min(0),
  treatments: joi.array().items(joi.object({
    treatment_id: stringValidation,
    price: numberValidation.min(0),

  }))
})