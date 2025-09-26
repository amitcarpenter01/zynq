import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import * as adminModels from "../models/admin.js";
import * as apiModels from "../models/api.js";
import { handleError } from "../utils/responseHandler.js";

dotenv.config();

const USER_JWT_SECRET = process.env.USER_JWT_SECRET;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

export const authenticateUser = async (req, res, next) => {
    try {
        const authorizationHeader = req.headers['authorization'];
        if (!authorizationHeader) {
            return handleError(res, 401, 'en', "UNAUTH")
        }
        const tokenParts = authorizationHeader.split(' ');
        if (tokenParts[0] !== 'Bearer' || tokenParts[1] === 'null' || !tokenParts[1]) {
            return handleError(res, 401, 'en', "UNAUTHMISSINGTOKEN");
        }
        const token = tokenParts[1];
        let decodedToken;
        try {
            decodedToken = jwt.verify(token, USER_JWT_SECRET);
        } catch (err) {
            return handleError(res, 401, 'en', "UNAUTH")
        }
        console.log(decodedToken.mobile_number, "User Connected");

        let [user] = await apiModels.get_user_by_user_id(decodedToken.user_id)

        if (!user) {
            return handleError(res, 404, 'en', "USER_NOT_FOUND")
        }

        const statusErrors = {
            REJECTED: "USER_REJECTED",
            PENDING: "USER_PENDING",
        };

        const currentStatus = user?.approval_status;
        const language = user?.language || req?.headers['language'] || "en";

        const bypassRoutes = ["/profile", "/delete-account"];

        const isBypassed = bypassRoutes.some(route => req.path.includes(route));

        if (!isBypassed && statusErrors[currentStatus]) return handleError(res, 401, language, statusErrors[currentStatus]);

        req.user = user;
        req.user.role = "USER";

        next();
    } catch (error) {
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR")
    }
};

export const optionalAuthenticateUser = async (req, res, next) => {
    try {
        const authorizationHeader = req.headers['authorization'];
        if (!authorizationHeader) {
            req.user = {};
            req.user.language = req?.headers['language'] || 'en';
            return next();
        }

        const tokenParts = authorizationHeader.split(' ');

        // Malformed or missing token → treat as guest (not error)
        if (tokenParts[0] !== 'Bearer' || !tokenParts[1] || tokenParts[1] === 'null') {
            req.user = null;
            return next();
        }

        const token = tokenParts[1];

        try {
            const decodedToken = jwt.verify(token, USER_JWT_SECRET);

            const [user] = await apiModels.get_user_by_user_id(decodedToken.user_id);

            if (!user) {
                // If token is valid but user not found → treat as guest
                req.user = null;
                return next();
            }

            req.user = { ...user, role: "USER" };
            console.log(decodedToken.mobile_number, "User Connected");
        } catch (err) {
            // Invalid/expired token → treat as guest
            req.user = null;
        }

        next();
    } catch (error) {
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};


export const authenticateAdmin = async (req, res, next) => {
    try {
        const authorizationHeader = req.headers["authorization"];
        if (!authorizationHeader) {
            return handleError(res, 401, "en", "UNAUTH");
        }

        const tokenParts = authorizationHeader.split(" ");
        if (tokenParts[0] !== "Bearer" || tokenParts[1] === "null" || !tokenParts[1]) {
            return handleError(res, 401, "en", "UNAUTHMISSINGTOKEN");
        }

        const token = tokenParts[1];

        let decodedToken;
        try {
            decodedToken = jwt.verify(token, ADMIN_JWT_SECRET);
        } catch (err) {
            return handleError(res, 401, "en", "UNAUTH");
        }

        const [admin] = await adminModels.findById(decodedToken.id);
        if (!admin) {
            return handleError(res, 404, "en", "ADMIN_NOT_FOUND");
        }

        req.admin = admin;
        req.user = admin;
        req.user.role = "ADMIN";
        next();
    } catch (error) {
        console.error("Admin auth error:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};