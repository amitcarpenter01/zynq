import joi from "joi";
import {
  stringValidation,
  idValidation,
} from "../utils/joi.util.js";

export const rescheduleAppointmentSchema = joi.object({
  appointment_id: idValidation,
  doctor_id: idValidation,
  start_time: stringValidation,
  end_time: stringValidation
});