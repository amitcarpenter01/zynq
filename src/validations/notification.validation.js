import joi from "joi";
import {
  stringValidation,
  objectValidation,
} from "../utils/joi.util.js";

export const sendNotificationSchema = joi.object({
  userData: objectValidation.required(),
  type: stringValidation,
  type_id: stringValidation,
  notification_type: joi.alternatives().try(stringValidation, objectValidation).required(),
  receiver_type: stringValidation,
  receiver_id: stringValidation
});