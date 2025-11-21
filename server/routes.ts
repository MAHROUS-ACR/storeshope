import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeFirebase, getFirestore, isFirebaseConfigured } from "./firebase";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Firebase from environment variables on server startup
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    try {
      initializeFirebase(
        process.env.FIREBASE_PROJECT_ID,
        process.env.FIREBASE_PRIVATE_KEY,
        process.env.FIREBASE_CLIENT_EMAIL
      );
      console.log("✅ Firebase initialized from environment variables");
    } catch (error) {
      console.warn("⚠️ Failed to initialize Firebase on startup:", error);
    }
  }

  // User signup with Firebase
  app.post("/api/auth/signup", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const { email, password, username } = req.body;

      if (!email || !password || !username) {
        return res.status(400).json({ message: "Email, password, and username are required" });
      }

      console.log("Signup request:", email, username);

      try {
        // Save user to Firestore (source of truth)
        const db = getFirestore();
        
        // Generate a simple ID based on email
        const userId = email.replace(/[^a-zA-Z0-9]/g, '_');
        
        await db.collection("users").doc(userId).set({
          id: userId,
          firebaseUid: userId,
          email,
          username,
          password: password, // Store plaintext password for demo (NOT for production)
          createdAt: new Date().toISOString(),
        });
        
        console.log("User saved to Firestore:", userId);

        res.status(201).json({
          id: userId,
          firebaseUid: userId,
          email,
          username,
        });
      } catch (error: any) {
        console.error("Firestore save error:", error);
        throw error;
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({
        message: "Signup failed",
        error: error.message,
      });
    }
  });

  // User login
  app.post("/api/auth/login", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      console.log("Login attempt:", email);

      // Get user from Firestore
      const db = getFirestore();
      const userId = email.replace(/[^a-zA-Z0-9]/g, '_');
      const userDoc = await db.collection("users").doc(userId).get();

      if (!userDoc.exists) {
        console.log("User not found in Firestore:", email);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const userData = userDoc.data();
      
      // Verify password
      if (userData.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log("Login successful:", email);
      
      res.json({
        id: userData.id,
        firebaseUid: userData.firebaseUid,
        email: userData.email,
        username: userData.username,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({
        message: "Login failed",
        error: error.message,
      });
    }
  });

  // Get current user by Firebase UID
  app.get("/api/auth/me", async (req, res) => {
    try {
      const firebaseUid = req.headers["x-firebase-uid"] as string | undefined;

      if (!firebaseUid) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      console.log("Fetching user for Firebase UID:", firebaseUid);
      
      // Firestore is the source of truth for user data
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const db = getFirestore();
      const userDoc = await db.collection("users").doc(firebaseUid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        console.log("User found in Firestore:", firebaseUid);
        if (userData && userData.email && userData.username) {
          return res.json({
            id: userData.id || firebaseUid,
            firebaseUid: firebaseUid,
            email: userData.email,
            username: userData.username,
          });
        }
      }

      console.log("User not found in Firestore:", firebaseUid);
      return res.status(404).json({ message: "User not found" });
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({
        message: "Failed to get user",
        error: error.message,
      });
    }
  });

  // Get current Firebase configuration
  app.get("/api/firebase/config", (req, res) => {
    try {
      const config = {
        projectId: process.env.FIREBASE_PROJECT_ID || "",
        privateKey: process.env.FIREBASE_PRIVATE_KEY || "",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
      };

      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to get Firebase config" });
    }
  });

  // Update Firebase configuration
  app.post("/api/firebase/config", (req, res) => {
    try {
      const { projectId, privateKey, clientEmail } = req.body;

      if (!projectId || !privateKey || !clientEmail) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Initialize Firebase with the provided credentials
      initializeFirebase(projectId, privateKey, clientEmail);

      res.json({ message: "Firebase configured successfully" });
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to configure Firebase",
        error: error.message,
      });
    }
  });

  // Get products
  app.get("/api/products", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        // Return mock products if Firebase is not configured
        return res.json([
          {
            id: "mock-1",
            name: "Product 1",
            price: 99.99,
            image: "https://via.placeholder.com/300x200?text=Product+1",
          },
          {
            id: "mock-2",
            name: "Product 2",
            price: 149.99,
            image: "https://via.placeholder.com/300x200?text=Product+2",
          },
        ]);
      }

      const db = getFirestore();
      const snapshot = await db.collection("products").get();
      const products: any[] = [];

      snapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
      });

      res.json(products);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      res.status(500).json({
        message: "Failed to fetch products",
        error: error.message,
      });
    }
  });

  // Get Firebase status
  app.get("/api/firebase/status", (req, res) => {
    res.json({
      configured: isFirebaseConfigured(),
      message: isFirebaseConfigured()
        ? "Firebase is configured and ready"
        : "Firebase is not configured",
    });
  });

  // Create order
  app.post("/api/orders", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const orderData = req.body;
      if (!orderData.userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      console.log("Saving order for user:", orderData.userId);
      
      const db = getFirestore();
      const docRef = await db.collection("orders").add({
        ...orderData,
        createdAt: new Date().toISOString(),
      });

      console.log("Order saved:", docRef.id);
      res.json({ id: docRef.id, message: "Order saved successfully" });
    } catch (error: any) {
      console.error("Error saving order:", error);
      res.status(500).json({
        message: "Failed to save order",
        error: error.message,
      });
    }
  });

  // Get orders for user
  app.get("/api/orders", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      console.log("Fetching orders for user:", userId);

      const db = getFirestore();
      const snapshot = await db.collection("orders").where("userId", "==", userId).get();
      
      const orders: any[] = [];
      snapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
      });

      console.log("Found orders:", orders.length);
      res.json(orders);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      res.status(500).json({
        message: "Failed to fetch orders",
        error: error.message,
      });
    }
  });

  const server = createServer(app);
  return server;
}
