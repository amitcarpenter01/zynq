import { apiError } from "../utils/api.util.js";
import messages from "../utils/messages.util.js";
import { populateMessage } from "../utils/joi.util.js";

const validate = (schema, type) => (req, res, next) => {
    const { error } = schema.validate(req[type]);
    if (error) {
        return apiError(messages.CUSTOM_ERROR, populateMessage(error), null, res);
    }
    next();
};

const validateMultiple = (schema, types) => (req, res, next) => {
    validationData = {};
    types.forEach((type) => {
        validationData[type] = req[type];
    });
    const { error } = schema.validate(validationData);
    if (error) {
        return apiError(messages.CUSTOM_ERROR, populateMessage(error), null, res);
    }
    next();
};

export { validate, validateMultiple };