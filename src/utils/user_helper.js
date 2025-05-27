import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import base64url from 'base64url';

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

    const randomUpperCase = upperCaseChars.charAt(Math.floor(Math.random() * upperCaseChars.length));
    const randomLowerCase = lowerCaseChars.charAt(Math.floor(Math.random() * lowerCaseChars.length));
    const randomNumber = numberChars.charAt(Math.floor(Math.random() * numberChars.length));
    const randomSpecial = specialChars.charAt(Math.floor(Math.random() * specialChars.length));

    let basePassword = firstName.slice(0, 4);

    const combined = basePassword + randomUpperCase + randomLowerCase + randomNumber + randomSpecial;

    const shuffledPassword = combined
        .split('')
        .sort(() => Math.random() - 0.5)
        .join('');

    return shuffledPassword.slice(0, 8);
};

