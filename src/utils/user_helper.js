import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import base64url from 'base64url';
import dotenv from "dotenv";
dotenv.config();
const APP_URL = process.env.APP_URL;

import { handleError, handleSuccess } from '../utils/responseHandler.js';

export const generateRandomString = async (length) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

export const generateVerificationLink = (token, baseUrl) => {
    return `${baseUrl}/api/verify-email?token=${token}`;
};

export const generateAccessTokenAdmin = (payload) => {
    const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
    const JWT_EXPIRY = process.env.JWT_EXPIRY;
    return jwt.sign(payload, ADMIN_JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

export const generateAccessToken = (payload) => {
    const USER_JWT_SECRET = process.env.USER_JWT_SECRET;
    const JWT_EXPIRY = process.env.JWT_EXPIRY;
    return jwt.sign(payload, USER_JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

export const generateAccessTokenVerifyAdmin = (payload) => {
    const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
    return jwt.verify(payload, ADMIN_JWT_SECRET);
};

export const generateAccessTokenVerify = (payload) => {
    const USER_JWT_SECRET = process.env.USER_JWT_SECRET;
    return jwt.verify(payload, USER_JWT_SECRET);
};

export const generateToken = () => {
    return Math.random().toString(36).substr(2, 12);
}

export const generatePassword = (email) => {
    const username = email.split('@')[0];
    const firstName = username.split('.')[0];

    const upperCaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerCaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const specialChars = '@#$%&';

    const getRandomChar = (chars) => chars.charAt(Math.floor(Math.random() * chars.length));

    const randomUpperCase = getRandomChar(upperCaseChars);
    const randomLowerCase = getRandomChar(lowerCaseChars);
    const randomNumber = getRandomChar(numberChars);
    const randomSpecial = getRandomChar(specialChars);

    let base = firstName.padEnd(4, 'x').slice(0, 4);

    const combined = base + randomUpperCase + randomLowerCase + randomNumber + randomSpecial;

    const shuffled = combined
        .split('')
        .sort(() => Math.random() - 0.5)
        .join('');

    return shuffled;
};

export const generateSupportTicketId = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const randomNumber = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    const ticketId = `#${dd}${mm}${yyyy}-000${randomNumber}`;
    return ticketId;
}

export const isEmpty = (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'boolean' || typeof value === 'number') return false;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (value instanceof Map || value instanceof Set) return value.size === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
};

export const splitIDs = (str = "") =>
    str
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
        
export const formatImagePath = (path, folder) =>
    !path ? null : path.startsWith('http') ? path : `${APP_URL}${folder}/${path}`;
