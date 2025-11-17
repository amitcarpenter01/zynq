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
  doctor_id: stringValidation.optional(),
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
  origin_appointment_id: stringValidation,
  discount_type: stringValidation.valid('PERCENTAGE', 'SEK'),
  discount_value: numberValidation.min(0),
  treatments: joi.array().items(joi.object({
    treatment_id: stringValidation,
    price: numberValidation.min(0),

  }))
})

export const addEditTreatmentSchema = joi.object({
  treatment_id: stringValidation.optional(),
  name: stringValidation,
  // swedish: stringValidation,
  classification_type: stringValidation.valid('Medical', 'Non-Medical'),
  benefits_en: stringValidation,
  // benefits_sv: stringValidation,
  description_en: stringValidation,
  // description_sv: stringValidation,
  // source: stringValidation.valid("old", "new"),
  embeddings: joi.array().items(numberValidation).min(1),
  is_device: booleanValidation,
  concerns: idArrayValidation,
  device_name: idArrayValidation.optional().allow(null),
  like_wise_terms: idArrayValidation.optional().allow(null),
})

export const addEditSubtreatmentSchema = joi.object({
  treatment_id: stringValidation.optional(),
  sub_treatment_id: stringValidation.optional(),
  name: stringValidation,
  swedish: stringValidation.optional()
})

export const deleteTreatmentSchema = joi.object({
  treatment_id: stringValidation,
})

export const deleteSubTreatmentSchema = joi.object({
  sub_treatment_id: stringValidation,
})

export const updateTreatmentApprovalStatusSchema = joi.object({
  treatment_id: stringValidation,
  approval_status: stringValidation.valid('APPROVED', 'REJECTED')
})

export const addEditConcernSchema = joi.object({
  concern_id: stringValidation.optional(),
  name: stringValidation,
  swedish: stringValidation,
  tips: joi.object({
    en: joi.string().allow("").required(),
    sv: joi.string().allow("").required(),
  }).required(),
});

export const deleteConcernSchema = joi.object({
  concern_id: stringValidation,
})

export const updateConcernApprovalStatusSchema = joi.object({
  concern_id: stringValidation,
  approval_status: stringValidation.valid('APPROVED', 'REJECTED')
})