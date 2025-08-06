import Joi from "joi";
import {
  stringValidation,
  dateValidation,
  numberValidation,
  orderValidation,
  ratingValidation,
  idArrayValidation,
  emailValidation,
} from "../utils/joi.util.js";

export const getSingleAddressSchema = Joi.object({
  address_id: stringValidation,
})

export const deleteAddressSchema = Joi.object({
  address_id: stringValidation,
})

export const addEditAddressSchema = Joi.object({
  address_id: stringValidation.optional(),
  name: stringValidation,
  email: emailValidation,
  address: stringValidation,
  city: stringValidation,
  state: stringValidation,
  zip_code: stringValidation,
  phone_number: stringValidation,
})

