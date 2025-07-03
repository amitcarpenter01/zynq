import _ from "lodash";
import messages from "./messages.util.js";

const apiHandler = (requestHandler) => {
    return async (req, res, next) => {
        try {
            await requestHandler(req, res, next);
        } catch (err) {
            console.log(err);
            return apiError(messages.SERVER_ERROR, null, err, res);
        }
    };
};

const apiResponse = async ([statusCode, msg], item, data, res) => {
    const message = msg.replace(/:item/g, item);
    const success = statusCode < 400;
    const response = {
        success,
        message,
        status: statusCode
    };

    if (!_.isEmpty(data)) {
        response["data"] = data;
    }

    if (res) {
        return res.status(statusCode).json(response);
    }
    return response;
};

const apiError = async ([statusCode, msg], item, err, res) => {
    const message = msg.replace(/:item/g, item);
    const success = statusCode < 400;
    const error = {
        success,
        message,
        status: statusCode
    };

    if (process.env.NODE_ENV === "local" && err) {
        if (Array.isArray(err)) {
            error["errors"] = err;
        } else {
            error["error"] = err.message;
            const stackLines = err.stack.split("\n");
            if (stackLines.length >= 2) {
                error["stack"] = stackLines[1].trim();
            }
        }
    }

    if (res) {
        return res.status(statusCode).json(error);
    }
    return error;
};


export {
    apiHandler,
    apiResponse,
    apiError,
};