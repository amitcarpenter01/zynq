import Joi from "joi";
import {
  stringValidation,
  dateValidation,
  numberValidation,
  orderValidation,
  ratingValidation,
  idArrayValidation,
} from "../utils/joi.util.js";


export const addProductToCartSchema = Joi.object({
  clinic_id: stringValidation,
  product_id: stringValidation,
  quantity: numberValidation,
})

export const deleteProductFromCartSchema = Joi.object({
  product_id: stringValidation,
})

export const getSingleCartSchema = Joi.object({
  cart_id: stringValidation,
})

export const deleteCartSchema = Joi.object({
  cart_id: stringValidation,
})