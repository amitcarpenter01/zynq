
import fs from "fs";
import http from "http"
import path from 'path';
import https from "https";
import dotenv from "dotenv";
import express from "express";
import db from "./src/config/db.js";
import configureApp from "./src/config/routes.js"
import { send_clinic_email_cron } from "./src/utils/cronJob.js";
import initializeSocket from './src/utils/socket.js';
import cors from 'cors';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config()
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT;
const APP_URL = process.env.APP_URL;
const IS_LIVE = process.env.IS_LIVE === "false";

app.use(cors());
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use('/', express.static(path.join(__dirname, 'src/uploads')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));
initializeSocket(server);

(async () => {
  configureApp(app);
  // await send_clinic_email_cron()
})()

app.get("/", (req, res) => {
  return res.send("Zynq App Working")
});


if (IS_LIVE) {
  console.log("SSL is enabled");
  const sslOptions = {
    ca: fs.readFileSync("/var/www/html/ssl/ca_bundle.crt"),
    key: fs.readFileSync("/var/www/html/ssl/private.key"),
    cert: fs.readFileSync("/var/www/html/ssl/certificate.crt"),
  };

  https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`Server is working on ${APP_URL}`);
  });
} else {
  server.listen(PORT, () => {
    console.log(`Server is working on ${APP_URL}`);
  });






// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

// Looking for ways to speed up your queries, or scale easily with your serverless or edge functions?
// Try Prisma Accelerate: https://pris.ly/cli/accelerate-init


