import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint to get Firebase environment variables
app.get("/api/env/firebase", (req, res) => {
  res.json({
    VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || "",
    VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || "",
    VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || "",
    VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    VITE_FIREBASE_MEASUREMENT_ID: process.env.VITE_FIREBASE_MEASUREMENT_ID || "",
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
