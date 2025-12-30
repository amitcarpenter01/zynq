import AWS from "aws-sdk";
import multer from "multer";
import { handleError, handleSuccess } from "../utils/responseHandler.js";
import dotenv from "dotenv";

dotenv.config();

/* ──────────────────────────────
   1️⃣ AWS Rekognition Configuration
   ────────────────────────────── */

AWS.config.update({
    region: "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const rekognition = new AWS.Rekognition();

/* ──────────────────────────────
   2️⃣ Multer (Memory Storage Only)
   ────────────────────────────── */

export const uploadImageToMemory = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/png"];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error("Only JPG and PNG images are allowed"));
        }
        cb(null, true);
    }
}).single("image");

/* ──────────────────────────────
   3️⃣ Single Rekognition Analyzer
   ────────────────────────────── */

const analyzeImageBuffer = async (buffer) => {
    const [
        faces,
        labels,
        text,
        moderation
    ] = await Promise.all([
        rekognition.detectFaces({
            Image: { Bytes: buffer },
            Attributes: ["ALL"]
        }).promise(),

        rekognition.detectLabels({
            Image: { Bytes: buffer },
            MaxLabels: 10,
            MinConfidence: 80
        }).promise(),

        rekognition.detectText({
            Image: { Bytes: buffer }
        }).promise(),

        rekognition.detectModerationLabels({
            Image: { Bytes: buffer },
            MinConfidence: 70
        }).promise()
    ]);

    return {
        faces: faces.FaceDetails,                 // Sections 1–8
        labels: labels.Labels,                    // Scene / objects
        text: text.TextDetections,                // OCR
        moderation: moderation.ModerationLabels   // Section 9 (SAFETY)
    };
};


/* ──────────────────────────────
   4️⃣ Single Express Controller
   ────────────────────────────── */

export const analyzeImageController = async (req, res) => {
    try {
        // const { language = "en" } = req.user;
        let language = "en"
        if (!req.file) {
            return handleError(res, 404, language, "FILE_NOT_FOUND");
        }

        const analysis = await analyzeImageBuffer(req.file.buffer);

        // return res.json({
        //   success: true,
        //   analysis
        // });

        return handleSuccess(
            res,
            200,
            language,
            "AWS_RECOGNITION_RESULT",
            analysis
        );

    } catch (err) {
        console.error("Error in aws recognition:", err);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};
