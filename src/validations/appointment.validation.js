import joi from "joi";
import {
  stringValidation,
  idValidation,
  dateValidation,
} from "../utils/joi.util.js";

export const rescheduleAppointmentSchema = joi.object({
  appointment_id: idValidation,
  doctor_id: idValidation,
  start_time: dateValidation,
  end_time: dateValidation
});

export const rateAppointmentSchema = joi.object({
  appointment_id: idValidation,
  rating: joi.number().min(1).max(5).required(),
  review: stringValidation
});