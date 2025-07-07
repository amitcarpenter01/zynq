import joi from "joi";
import {
  idValidation,
} from "../utils/joi.util.js";

export const getSingleDoctorSchema = joi.object({
  doctor_id: idValidation,
});