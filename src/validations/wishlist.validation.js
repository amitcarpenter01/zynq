import Joi from "joi";
import {
  stringValidation,
  dateValidation,
  numberValidation,
  orderValidation,
  ratingValidation,
  idArrayValidation,
} from "../utils/joi.util.js";


export const toggleWishlistProductSchema = Joi.object({
  product_id: stringValidation
})