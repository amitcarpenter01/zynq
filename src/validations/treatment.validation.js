import joi from "joi";
import {
  idArrayValidation,
  stringValidation,
} from "../utils/joi.util.js";
 
export const getTreatmentsByConcernSchema = joi.object({
  concern_id: stringValidation,
});
 
export const getTreatmentsByConcersSchema = joi.object({
  concern_ids: idArrayValidation,
})