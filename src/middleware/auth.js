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
        req.user = user;
        next();
    } catch (error) {
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR")
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
        next();
    } catch (error) {
        console.error("Admin auth error:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};