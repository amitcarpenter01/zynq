import joi from "joi";
import {
  idValidation,
} from "../utils/joi.util.js";

export const getTreatmentsByConcernSchema = joi.object({
  concern_id: idValidation,
});