import fs from "fs";
import http from "http"
import path from 'path';
import https from "https";
import dotenv from "dotenv";
import express from "express";
import db from "./src/config/db.js";
import configureApp from "./src/config/routes.js"
import { send_clinic_email_cron, appointmentReminderCron } from "./src/utils/cronJob.js";
import initializeSocket from './src/utils/socket.js';
import cors from 'cors';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
import Stripe from "stripe";
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import { loadTreatmentEmbeddings } from "./src/utils/vectorIndex.js";
dotenv.config()
const app = express();
const PORT = process.env.PORT;
const APP_URL = process.env.APP_URL;
const IS_LIVE = process.env.IS_LIVE === "false" ? false : true;

app.use(cors());
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use('/', express.static(path.join(__dirname, 'src/uploads')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

(async () => {
  configureApp(app);
  // send_clinic_email_cron()
  // appointmentReminderCron()
})()

app.get("/", (req, res) => {
  return res.send("Zynq App Working")
});

let server;
if (IS_LIVE) {
  console.log("SSL is enabled");

  const sslOptions = {
    ca: fs.readFileSync("/var/www/html/ssl/ca_bundle.crt"),
    key: fs.readFileSync("/var/www/html/ssl/private.key"),
    cert: fs.readFileSync("/var/www/html/ssl/certificate.crt"),
  };

  server = https.createServer(sslOptions, app);
} else {
  server = http.createServer(app);
}

initializeSocket(server);


await loadTreatmentEmbeddings();
server.listen(PORT, () => {
  console.log(`Server is working on ${APP_URL}`);
});