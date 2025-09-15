import multer from "multer";
import multerS3 from "multer-s3";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../utils/aws_s3_client.js";
import dotenv from "dotenv";

dotenv.config();

export const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.S3_BUCKET_NAME,
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            const fileName = `${Date.now()}_${file.originalname}`;
            cb(null, fileName);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE,
        cacheControl: "public, max-age=31536000",
        acl: "public-read",
    }),
});


export const deleteFileFromS3 = async (fileUrl) => {
    const bucketName = process.env.S3_BUCKET_NAME;
    const key = fileUrl.split("/").slice(3).join("/");

    try {
        const deleteParams = {
            Bucket: bucketName,
            Key: key,
        };
        await s3Client.send(new DeleteObjectCommand(deleteParams));
    } catch (error) {
        console.error("Error deleting file from S3:", error);
        throw error;
    }
};
