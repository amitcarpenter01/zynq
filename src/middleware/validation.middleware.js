import { populateMessage } from "../utils/joi.util.js";
import { handleError } from "../utils/responseHandler.js";


const validate = (schema, type) => (req, res, next) => {
    const { error } = schema.validate(req[type]);
    if (error) {
        return handleError(res, 400, "en", populateMessage(error));
    }
    next();
};


const validateMultiple = (schema, types) => (req, res, next) => {
    const validationData = {};
    types.forEach((type) => {
        validationData[type] = req[type];
    });


    const { error } = schema.validate(validationData);
    if (error) {
        return handleError(res, 400, "en", populateMessage(error));
    }
    next();
};


const validateSchema = (schema, data) => {
    const { error, value } = schema.validate(data);
    if (error) {
        throw new Error(populateMessage(error));
    }
    return value;
};

export { validate, validateMultiple, validateSchema };

