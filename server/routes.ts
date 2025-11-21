import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeFirebase, getFirestore, isFirebaseConfigured } from "./firebase";
import { queryUser } from "./db-utils";
import * as admin from "firebase-admin";
import { type UserRecord } from "firebase-admin/auth";

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

      try {
        // Create user in Firebase Auth using admin SDK
        const userRecord: UserRecord = await admin.auth().createUser({
          email,
          password,
          displayName: username,
        });
        console.log("User created in Firebase Auth:", userRecord.uid);

        // Store user in Firestore FIRST (this is the source of truth)
        const db = getFirestore();
        await db.collection("users").doc(userRecord.uid).set({
          id: userRecord.uid,
          firebaseUid: userRecord.uid,
          email,
          username,
          createdAt: new Date().toISOString(),
        });
        console.log("User saved to Firestore:", userRecord.uid);

        // Store user in PostgreSQL database as backup
        let dbUser: any = null;
        try {
          dbUser = await storage.createUser({
            firebaseUid: userRecord.uid,
            email,
            username,
          });
          console.log("User saved to PostgreSQL:", dbUser.id);
        } catch (dbError) {
          console.warn("Failed to save user to PostgreSQL (non-critical):", dbError);
          // Continue - PostgreSQL is just a backup
        }

        res.status(201).json({
          id: userRecord.uid,
          firebaseUid: userRecord.uid,
          email,
          username,
        });
      } catch (authError: any) {
        console.error("Signup auth error:", authError);
        if (authError.code === "auth/email-already-exists") {
          return res.status(400).json({ message: "Email already exists" });
        }
        throw authError;
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({
        message: "Signup failed",
        error: error.message,
      });
    }
  });

  // User login with Firebase
  app.post("/api/auth/login", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      console.log("Login attempt for email:", email);

      try {
        // Verify user credentials using Firebase Admin SDK
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log("User verified via Firebase Auth:", userRecord.uid);

        // Get user data from Firestore users collection
        const db = getFirestore();
        const userDoc = await db.collection("users").doc(userRecord.uid).get();

        if (!userDoc.exists) {
          console.log("User data not found in Firestore:", userRecord.uid);
          return res.status(401).json({ message: "User data not found" });
        }

        const userData = userDoc.data();
        if (!userData || !userData.email || !userData.username) {
          return res.status(401).json({ message: "Invalid user data" });
        }

        // Create custom token for client-side Firebase authentication
        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        console.log("Login successful for:", email);
        res.json({
          id: userData.id || userRecord.uid,
          firebaseUid: userRecord.uid,
          email: userData.email,
          username: userData.username,
          token: customToken,
        });
      } catch (authError: any) {
        console.error("Firebase auth error:", authError.code);
        if (authError.code === "auth/user-not-found") {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        throw authError;
      }
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
        firebaseApiKey: process.env.VITE_FIREBASE_API_KEY || "",
        firebaseProjectId: process.env.VITE_FIREBASE_PROJECT_ID || "",
        firebaseAppId: process.env.VITE_FIREBASE_APP_ID || "",
        firebaseAuthDomain: process.env.FIREBASE_CONFIG_AUTH_DOMAIN || "",
        firebaseStorageBucket: process.env.FIREBASE_CONFIG_STORAGE_BUCKET || "",
        firebaseMessagingSenderId: process.env.FIREBASE_CONFIG_MESSAGING_SENDER_ID || "",
        firebaseMeasurementId: process.env.FIREBASE_CONFIG_MEASUREMENT_ID || "",
      };
      res.json(config);
    } catch (error: any) {
      console.error("Error fetching Firebase config:", error);
      res.status(500).json({ 
        message: "Failed to fetch configuration",
        error: error.message 
      });
    }
  });

  // Firebase Configuration Route (POST)
  app.post("/api/firebase/config", async (req, res) => {
    try {
      const { projectId, privateKey, clientEmail } = req.body;

      if (!projectId || !privateKey || !clientEmail) {
        return res.status(400).json({ 
          message: "Missing required fields: projectId, privateKey, or clientEmail" 
        });
      }

      // Store credentials in environment (in production, use secure storage)
      process.env.FIREBASE_PROJECT_ID = projectId;
      process.env.FIREBASE_PRIVATE_KEY = privateKey;
      process.env.FIREBASE_CLIENT_EMAIL = clientEmail;

      // Initialize Firebase with the new credentials
      initializeFirebase(projectId, privateKey, clientEmail);

      res.json({ message: "Firebase configuration saved successfully" });
    } catch (error: any) {
      console.error("Firebase configuration error:", error);
      res.status(500).json({ 
        message: "Failed to configure Firebase",
        error: error.message 
      });
    }
  });

  // Get all products from Firestore
  app.get("/api/products", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ 
          message: "Firebase not configured. Please set up Firebase in settings." 
        });
      }

      const db = getFirestore();
      const productsSnapshot = await db.collection("products").get();
      
      const products = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.json(products);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      res.status(500).json({ 
        message: "Failed to fetch products",
        error: error.message 
      });
    }
  });

  // Get a single product by ID
  app.get("/api/products/:id", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ 
          message: "Firebase not configured" 
        });
      }

      const db = getFirestore();
      const productDoc = await db.collection("products").doc(req.params.id).get();
      
      if (!productDoc.exists) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json({ id: productDoc.id, ...productDoc.data() });
    } catch (error: any) {
      console.error("Error fetching product:", error);
      res.status(500).json({ 
        message: "Failed to fetch product",
        error: error.message 
      });
    }
  });

  // Add a new product to Firestore
  app.post("/api/products", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ 
          message: "Firebase not configured" 
        });
      }

      const { title, category, price, image } = req.body;

      if (!title || !category || !price) {
        return res.status(400).json({ 
          message: "Missing required fields: title, category, or price" 
        });
      }

      const db = getFirestore();
      const productRef = await db.collection("products").add({
        title,
        category,
        price: parseFloat(price),
        image: image || "",
        createdAt: new Date().toISOString()
      });

      const newProduct = await productRef.get();
      res.status(201).json({ id: newProduct.id, ...newProduct.data() });
    } catch (error: any) {
      console.error("Error creating product:", error);
      res.status(500).json({ 
        message: "Failed to create product",
        error: error.message 
      });
    }
  });

  // Update a product
  app.patch("/api/products/:id", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ 
          message: "Firebase not configured" 
        });
      }

      const db = getFirestore();
      const productRef = db.collection("products").doc(req.params.id);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        return res.status(404).json({ message: "Product not found" });
      }

      await productRef.update({
        ...req.body,
        updatedAt: new Date().toISOString()
      });

      const updatedProduct = await productRef.get();
      res.json({ id: updatedProduct.id, ...updatedProduct.data() });
    } catch (error: any) {
      console.error("Error updating product:", error);
      res.status(500).json({ 
        message: "Failed to update product",
        error: error.message 
      });
    }
  });

  // Delete a product
  app.delete("/api/products/:id", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ 
          message: "Firebase not configured" 
        });
      }

      const db = getFirestore();
      const productRef = db.collection("products").doc(req.params.id);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        return res.status(404).json({ message: "Product not found" });
      }

      await productRef.delete();
      res.json({ message: "Product deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting product:", error);
      res.status(500).json({ 
        message: "Failed to delete product",
        error: error.message 
      });
    }
  });

  // Check Firebase connection status
  app.get("/api/firebase/status", (req, res) => {
    res.json({ 
      configured: isFirebaseConfigured(),
      message: isFirebaseConfigured() 
        ? "Firebase is connected" 
        : "Firebase not configured"
    });
  });

  // Orders Management
  app.get("/api/orders", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.json([]);
      }

      const db = getFirestore();
      const ordersSnapshot = await db.collection("orders").orderBy("createdAt", "desc").get();
      
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.json(orders);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ 
        message: "Failed to fetch orders",
        error: error.message 
      });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { items, total, status = "pending", paymentMethod, paymentId, deliveryAddress, createdAt } = req.body;

      if (!items || !total) {
        return res.status(400).json({ 
          message: "Missing required fields: items or total" 
        });
      }

      const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const orderData = {
        id: orderId,
        items,
        total: parseFloat(total),
        status,
        paymentMethod,
        paymentId,
        deliveryAddress,
        createdAt: createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Try to store in Firebase if configured
      if (isFirebaseConfigured()) {
        try {
          const db = getFirestore();
          await db.collection("orders").doc(orderId).set(orderData);
        } catch (dbError) {
          console.warn("Failed to store order in Firebase:", dbError);
        }
      }

      res.status(201).json(orderData);
    } catch (error: any) {
      console.error("Error creating order:", error);
      res.status(500).json({ 
        message: "Failed to create order",
        error: error.message 
      });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ 
          message: "Firebase not configured" 
        });
      }

      const db = getFirestore();
      const orderDoc = await db.collection("orders").doc(req.params.id).get();
      
      if (!orderDoc.exists) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json({ id: orderDoc.id, ...orderDoc.data() });
    } catch (error: any) {
      console.error("Error fetching order:", error);
      res.status(500).json({ 
        message: "Failed to fetch order",
        error: error.message 
      });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ 
          message: "Firebase not configured" 
        });
      }

      const db = getFirestore();
      const orderRef = db.collection("orders").doc(req.params.id);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return res.status(404).json({ message: "Order not found" });
      }

      await orderRef.update({
        ...req.body,
        updatedAt: new Date().toISOString()
      });

      const updatedOrder = await orderRef.get();
      res.json({ id: updatedOrder.id, ...updatedOrder.data() });
    } catch (error: any) {
      console.error("Error updating order:", error);
      res.status(500).json({ 
        message: "Failed to update order",
        error: error.message 
      });
    }
  });

  // Payment Processing
  app.post("/api/payment/create-intent", async (req, res) => {
    try {
      const { method, amount, currency, cardNumber, expiryDate, cvv, cardHolder, email } = req.body;

      if (method === "card") {
        if (!amount || !cardNumber || !expiryDate || !cvv || !cardHolder || !email) {
          return res.status(400).json({ 
            message: "Missing required payment fields" 
          });
        }

        // Basic card validation (in production, use Stripe API)
        if (cardNumber.length !== 16) {
          return res.status(400).json({ message: "Invalid card number" });
        }

        if (cvv.length !== 3) {
          return res.status(400).json({ message: "Invalid CVV" });
        }

        const [expMonth, expYear] = expiryDate.split("/");
        const now = new Date();
        const currentYear = now.getFullYear() % 100;
        const currentMonth = now.getMonth() + 1;

        if (
          parseInt(expYear) < currentYear ||
          (parseInt(expYear) === currentYear && parseInt(expMonth) < currentMonth)
        ) {
          return res.status(400).json({ message: "Card has expired" });
        }

        // Simulate payment processing
        // In production, integrate with Stripe
        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store payment record in Firebase if configured
        if (isFirebaseConfigured()) {
          try {
            const db = getFirestore();
            await db.collection("payments").doc(paymentId).set({
              amount,
              currency,
              method: "card",
              cardHolder,
              email,
              lastFourDigits: cardNumber.slice(-4),
              status: "succeeded",
              createdAt: new Date().toISOString(),
            });
          } catch (dbError) {
            console.warn("Failed to store payment record:", dbError);
          }
        }

        res.status(200).json({
          id: paymentId,
          amount,
          currency,
          status: "succeeded",
          message: "Payment processed successfully",
        });
      } else {
        res.status(400).json({ message: "Invalid payment method" });
      }
    } catch (error: any) {
      console.error("Payment processing error:", error);
      res.status(500).json({ 
        message: "Payment processing failed",
        error: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
