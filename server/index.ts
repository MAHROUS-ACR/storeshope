import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import notificationsRouter from "./notifications";
import { sendEmail } from "./send-email";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
  });
  console.log("✅ Firebase Admin SDK initialized");
} catch (error: any) {
  if (!error.message?.includes('already exists')) {
    console.log("Firebase Admin already initialized or using emulator");
  }
}

// Routes
app.use("/api/notifications", notificationsRouter);

// Email endpoint
app.post("/api/send-email", async (req, res) => {
  const result = await sendEmail(req.body);
  res.json(result);
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Notification server running on port ${PORT}`);
});
