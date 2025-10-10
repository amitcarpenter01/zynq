import fs from "fs";
import http from "http";
import https from "https";
import path from "path";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import { fileURLToPath } from "url";

import configureApp from "./src/config/routes.js";
import initializeSocket from "./src/utils/socket.js";
import { send_clinic_email_cron, appointmentReminderCron, invitationReminderCron } from "./src/utils/cronJob.js";
import { connectDB } from "./src/config/db.js"; 
 
// --------------------- ENV + PATH CONFIG ---------------------
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

// --------------------- APP SETUP ---------------------
const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const IS_LIVE = process.env.IS_LIVE === "false" ? false : true;
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// --------------------- MIDDLEWARE ---------------------
app.use(cors());
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use("/", express.static(path.join(__dirname, "src/uploads")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src/views"));

// --------------------- ROUTES ---------------------
configureApp(app);

app.get("/", (req, res) => {
  res.send("Zynq App Working 🚀");
});

// --------------------- START SERVER FUNCTION ---------------------
function startServer() {
  let server;

  if (IS_LIVE) {
    console.log("🔒 SSL is enabled");
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

  server.listen(PORT, () => {
    console.log(`✅ Server running at ${APP_URL}`);
  });

  // 🕒 Start all cron jobs once DB + server are ready
  appointmentReminderCron();
  invitationReminderCron();
  console.log("📅 Cron jobs initialized successfully");
}

// --------------------- MAIN STARTUP LOGIC ---------------------
(async () => {
  try {
    await connectDB(); // ✅ connect to DB first
    console.log("🟢 Database connection successful. Starting server...");
    startServer();
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    process.exit(1);
  }
})();
