import joi from "joi";
import {
  stringValidation,
  dateValidation,
  numberValidation,
} from "../utils/joi.util.js";

export const rescheduleAppointmentSchema = joi.object({
  appointment_id: stringValidation,
  doctor_id: stringValidation,
  start_time: dateValidation,
  end_time: dateValidation
});

export const rateAppointmentSchema = joi.object({
  appointment_id: stringValidation,
  rating: numberValidation.min(1).max(5),
  review: stringValidation.optional()
});