import joi from "joi";
import {
  stringValidation,
  idValidation,
  dateValidation,
  numberValidation,
} from "../utils/joi.util.js";

export const rescheduleAppointmentSchema = joi.object({
  appointment_id: idValidation,
  doctor_id: idValidation,
  start_time: dateValidation,
  end_time: dateValidation
});

export const rateAppointmentSchema = joi.object({
  appointment_id: idValidation,
  rating: numberValidation.min(1).max(5),
  review: stringValidation.optional()
});