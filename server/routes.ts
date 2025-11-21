import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeFirebase, getFirestore, isFirebaseConfigured } from "./firebase";

export async function registerRoutes(app: Express): Promise<Server> {
  // Firebase Configuration Route
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
        return res.status(503).json({ 
          message: "Firebase not configured" 
        });
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
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ 
          message: "Firebase not configured" 
        });
      }

      const { items, total, status = "pending", createdAt } = req.body;

      if (!items || !total) {
        return res.status(400).json({ 
          message: "Missing required fields: items or total" 
        });
      }

      const db = getFirestore();
      const orderRef = await db.collection("orders").add({
        items,
        total: parseFloat(total),
        status,
        createdAt: createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const newOrder = await orderRef.get();
      res.status(201).json({ id: newOrder.id, ...newOrder.data() });
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
