import { getMessage } from './getMessage.js';


export const handleError = (res, statusCode, lang = 'en', messageKey) => {
  return res.status(statusCode).send({
    success: false,
    status: statusCode,
    message: getMessage(messageKey, lang)
  });
};

export const handleSuccess = (res, statusCode, lang = 'en', messageKey, ...data) => {  
  return res.status(200).json({
    success: true,
    status: statusCode,
    message: getMessage(messageKey, lang),
    data: data.length > 0 ? data[0] : undefined,
  });
};

export const joiErrorHandle = (res, error) => {
  return res.status(200).send({
    success: false,
    status: 400,
    message: error.details[0].message
  });
};

