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

  // Note: Authentication is now handled entirely by Firebase Auth on the client
  // Server endpoints are deprecated and replaced with direct Firebase Auth

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
      
      // Get total count of orders to generate sequential order number
      const allOrders = await db.collection("orders").get();
      const orderNumber = allOrders.size + 1;
      
      const docRef = await db.collection("orders").add({
        ...orderData,
        orderNumber: orderNumber,
        createdAt: new Date().toISOString(),
      });

      console.log("Order saved:", docRef.id, "Order #", orderNumber);
      res.json({ id: docRef.id, orderNumber: orderNumber, message: "Order saved successfully" });
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

  // Get all orders (admin endpoint)
  app.get("/api/orders/admin/all", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      console.log("Fetching all orders (admin)");

      const db = getFirestore();
      const snapshot = await db.collection("orders").get();
      
      const orders: any[] = [];
      snapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
      });

      // Sort by creation date (newest first)
      orders.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      console.log("Found total orders:", orders.length);
      res.json(orders);
    } catch (error: any) {
      console.error("Error fetching all orders:", error);
      res.status(500).json({
        message: "Failed to fetch orders",
        error: error.message,
      });
    }
  });

  // Update order status (admin endpoint)
  app.put("/api/orders/:orderId", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const { orderId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      console.log("Updating order status:", orderId, "to:", status);

      const db = getFirestore();
      await db.collection("orders").doc(orderId).update({
        status: status,
        updatedAt: new Date().toISOString(),
      });

      console.log("Order updated successfully:", orderId);
      res.json({ message: "Order updated successfully" });
    } catch (error: any) {
      console.error("Error updating order:", error);
      res.status(500).json({
        message: "Failed to update order",
        error: error.message,
      });
    }
  });

  // Get store settings
  app.get("/api/store-settings", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const db = getFirestore();
      const doc = await db.collection("settings").doc("store").get();

      if (!doc.exists) {
        return res.json({
          name: "",
          address: "",
          phone: "",
          email: "",
        });
      }

      res.json(doc.data());
    } catch (error: any) {
      console.error("Error fetching store settings:", error);
      res.status(500).json({
        message: "Failed to fetch store settings",
        error: error.message,
      });
    }
  });

  // Save store settings
  app.post("/api/store-settings", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const { name, address, phone, email } = req.body;

      if (!name || !address || !phone || !email) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const db = getFirestore();
      await db.collection("settings").doc("store").set({
        name,
        address,
        phone,
        email,
        updatedAt: new Date().toISOString(),
      });

      console.log("Store settings saved successfully");
      res.json({ message: "Store settings saved successfully" });
    } catch (error: any) {
      console.error("Error saving store settings:", error);
      res.status(500).json({
        message: "Failed to save store settings",
        error: error.message,
      });
    }
  });

  const server = createServer(app);
  return server;
}
