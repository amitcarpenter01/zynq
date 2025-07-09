import joi from "joi";
import {
  stringValidation,
} from "../utils/joi.util.js";

export const getTreatmentsByConcernSchema = joi.object({
  concern_id: stringValidation,
});