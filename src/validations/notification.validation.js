import joi from "joi";
import {
  stringValidation,
  objectValidation,
  userTypeValidation,
  booleanValidation,
} from "../utils/joi.util.js";

export const sendNotificationSchema = joi.object({
  userData: objectValidation.required(),
  type: stringValidation,
  type_id: stringValidation,
  notification_type: joi.alternatives().try(stringValidation, objectValidation).required(),
  receiver_type: userTypeValidation,
  receiver_id: stringValidation,
  system : booleanValidation.optional()
});