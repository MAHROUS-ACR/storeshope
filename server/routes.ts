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

  // Get Firebase configuration from Firestore
  app.get("/api/firebase/config", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.json({
          projectId: "",
          privateKey: "",
          clientEmail: "",
          firebaseApiKey: "",
          firebaseProjectId: "",
          firebaseAppId: "",
          firebaseAuthDomain: "",
          firebaseStorageBucket: "",
          firebaseMessagingSenderId: "",
          firebaseMeasurementId: "",
        });
      }

      const db = getFirestore();
      const doc = await db.collection("settings").doc("store").get();
      const data = doc.data();

      console.log("📦 Firestore doc exists:", doc.exists);
      console.log("📦 Document data keys:", data ? Object.keys(data) : "null");
      console.log("📦 Firebase config field exists:", !!data?.firebase);
      if (data?.firebase) {
        console.log("📦 Firebase config data:", JSON.stringify(data.firebase, null, 2));
      }

      // Return saved Firebase config from Firestore, or empty config if not found
      if (!doc.exists || !data?.firebase) {
        console.log("⚠️ Returning empty Firebase config");
        return res.json({
          projectId: "",
          privateKey: "",
          clientEmail: "",
          firebaseApiKey: "",
          firebaseProjectId: "",
          firebaseAppId: "",
          firebaseAuthDomain: "",
          firebaseStorageBucket: "",
          firebaseMessagingSenderId: "",
          firebaseMeasurementId: "",
        });
      }

      console.log("✅ Returning Firebase config from Firestore");
      res.json(data.firebase);
    } catch (error) {
      console.error("❌ Error loading Firebase config:", error);
      res.status(500).json({ message: "Failed to get Firebase config" });
    }
  });

  // Update Firebase configuration in Firestore (save with store settings)
  app.post("/api/firebase/config", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const { projectId, privateKey, clientEmail, firebaseApiKey, firebaseProjectId, firebaseAppId, firebaseAuthDomain, firebaseStorageBucket, firebaseMessagingSenderId, firebaseMeasurementId } = req.body;

      // Save all fields (even if empty) - no validation
      const db = getFirestore();
      const firebaseConfig = {
        projectId: projectId || "",
        privateKey: privateKey || "",
        clientEmail: clientEmail || "",
        firebaseApiKey: firebaseApiKey || "",
        firebaseProjectId: firebaseProjectId || "",
        firebaseAppId: firebaseAppId || "",
        firebaseAuthDomain: firebaseAuthDomain || "",
        firebaseStorageBucket: firebaseStorageBucket || "",
        firebaseMessagingSenderId: firebaseMessagingSenderId || "",
        firebaseMeasurementId: firebaseMeasurementId || "",
      };

      // Get existing store settings
      const docRef = db.collection("settings").doc("store");
      const existingDoc = await docRef.get();

      console.log("Saving Firebase config:", JSON.stringify(firebaseConfig, null, 2));

      // Save using update to properly merge with existing data
      if (existingDoc.exists) {
        // Use update to add firebase field to existing document
        console.log("📝 Updating existing document with firebase config");
        await docRef.update({
          firebase: firebaseConfig,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Create new document with default store values
        console.log("📝 Creating new document with firebase config");
        await docRef.set({
          name: "",
          address: "",
          phone: "",
          email: "",
          firebase: firebaseConfig,
          updatedAt: new Date().toISOString(),
        });
      }

      console.log("✅ Firebase config saved to Firestore");
      
      // Verify the save by reading back immediately
      const savedDoc = await docRef.get();
      const savedData = savedDoc.data();
      console.log("✅ Verification - Firebase config in Firestore:", !!savedData?.firebase);
      if (savedData?.firebase) {
        console.log("✅ Saved firebase keys:", Object.keys(savedData.firebase).length, "fields");
      } else {
        console.log("❌ Firebase config NOT found in document!");
        console.log("📦 Document has these keys:", savedData ? Object.keys(savedData) : "null");
      }
      
      res.json({ message: "Firebase configuration saved successfully" });
    } catch (error: any) {
      console.error("❌ Error saving Firebase config:", error);
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

  // Get all products (admin)
  app.get("/api/products/admin", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.json([]);
      }

      const db = getFirestore();
      const snapshot = await db.collection("products").get();
      const products: any[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        products.push({
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          price: data.price || 0,
          category: data.category || "",
          image: data.image || null,
          units: data.units || null,
          sizes: data.sizes || null,
          colors: data.colors || null,
          available: data.available !== false,
        });
      });

      console.log(`✅ Fetched ${products.length} products from Firestore`);
      res.json(products);
    } catch (error: any) {
      console.error("❌ Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Add or update product
  app.post("/api/products/admin", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const { id, title, description, price, category, image, units, sizes, colors, available } = req.body;

      if (!title || !price || !category) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const db = getFirestore();
      const docId = id || Date.now().toString();
      
      await db.collection("products").doc(docId).set({
        title: title,
        description: description || null,
        price: parseFloat(price),
        category: category,
        image: image || null,
        units: units || null,
        sizes: sizes || null,
        colors: colors || null,
        available: available !== false,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      console.log(`✅ Product ${docId} saved to Firestore`);
      res.json({ 
        id: docId, 
        title, 
        description,
        price, 
        category,
        image,
        units,
        sizes,
        colors,
        available,
        message: "Product saved successfully" 
      });
    } catch (error: any) {
      console.error("❌ Error saving product:", error);
      res.status(500).json({ message: "Failed to save product" });
    }
  });

  // Delete product
  app.delete("/api/products/admin/:id", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const { id } = req.params;
      const db = getFirestore();
      
      await db.collection("products").doc(id).delete();

      console.log(`✅ Product ${id} deleted from Firestore`);
      res.json({ message: "Product deleted successfully" });
    } catch (error: any) {
      console.error("❌ Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Get single product by ID
  app.get("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!isFirebaseConfigured()) {
        return res.status(404).json({ message: "Product not found" });
      }

      const db = getFirestore();
      const doc = await db.collection("products").doc(id).get();
      
      if (!doc.exists) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json({ id: doc.id, ...doc.data() });
    } catch (error: any) {
      console.error("Error fetching product:", error);
      res.status(500).json({
        message: "Failed to fetch product",
        error: error.message,
      });
    }
  });

  // Get Firebase status
  app.get("/api/firebase/status", async (req, res) => {
    try {
      // Check if Firebase is configured from environment variables
      const envConfigured = isFirebaseConfigured();

      if (!envConfigured) {
        return res.json({
          configured: false,
          message: "Firebase is not configured",
        });
      }

      // Check if Firebase settings are saved in Firestore
      const db = getFirestore();
      const doc = await db.collection("settings").doc("store").get();
      const data = doc.data();

      // Firebase is only considered "configured" if Firestore has a valid Firebase config with required fields
      const hasValidFirebaseConfig =
        data?.firebase &&
        data.firebase.projectId &&
        data.firebase.privateKey &&
        data.firebase.clientEmail;

      res.json({
        configured: hasValidFirebaseConfig,
        message: hasValidFirebaseConfig
          ? "Firebase is configured and ready"
          : "Firebase is not configured",
      });
    } catch (error) {
      res.json({
        configured: false,
        message: "Error checking Firebase status",
      });
    }
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
      
      // Use the order ID from the client if provided, otherwise generate one
      const orderId = orderData.id || `order-${Date.now()}`;
      
      await db.collection("orders").doc(orderId).set({
        ...orderData,
        id: orderId,
        orderNumber: orderNumber,
        createdAt: orderData.createdAt || new Date().toISOString(),
      });

      console.log("Order saved:", orderId, "Order #", orderNumber);
      res.json({ id: orderId, orderNumber: orderNumber, message: "Order saved successfully" });
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

  // Get single order (allows admin to view any order, regular users can only view their own)
  app.get("/api/orders/:orderId", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const { orderId } = req.params;
      const userId = req.headers["x-user-id"] as string;

      const db = getFirestore();
      const doc = await db.collection("orders").doc(orderId).get();

      if (!doc.exists) {
        return res.status(404).json({ message: "Order not found" });
      }

      const order = { id: doc.id, ...doc.data() } as any;

      // Allow access if: admin, order belongs to user, or order has no userId
      const isAdmin = req.headers["x-user-role"] === "admin";
      if (!isAdmin && userId && order.userId && order.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      console.log("Order retrieved:", orderId);
      res.json(order);
    } catch (error: any) {
      console.error("Error fetching order:", error);
      res.status(500).json({
        message: "Failed to fetch order",
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
        console.log("No store settings document found in Firestore");
        return res.json({
          name: "",
          address: "",
          phone: "",
          email: "",
          logo: "",
          firebase: null,
        });
      }

      const data = doc.data();
      console.log("Fetched store settings from Firestore:", JSON.stringify(data, null, 2));
      console.log("Firebase config in response:", !!data?.firebase);
      res.json(data);
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

      const { name, address, phone, email, logo } = req.body;

      if (!name || !address || !phone || !email) {
        return res.status(400).json({ message: "All store fields are required" });
      }

      const db = getFirestore();
      const storeData = {
        name,
        address,
        phone,
        email,
        logo: logo || "",
        updatedAt: new Date().toISOString(),
      };

      // Use merge: true to preserve firebase config field
      await db.collection("settings").doc("store").set(storeData, { merge: true });

      console.log("✅ Store settings saved successfully to Firestore");
      res.json({ message: "Store settings saved successfully" });
    } catch (error: any) {
      console.error("❌ Error saving store settings:", error);
      res.status(500).json({
        message: "Failed to save store settings",
        error: error.message,
      });
    }
  });

  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.json([]);
      }

      const db = getFirestore();
      const snapshot = await db.collection("users").get();
      const users: any[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          id: doc.id,
          email: data.email || "",
          username: data.username || "",
          role: data.role || "user",
        });
      });

      console.log(`✅ Fetched ${users.length} users from Firestore`);
      res.json(users);
    } catch (error: any) {
      console.error("❌ Error fetching users:", error);
      res.status(500).json({
        message: "Failed to fetch users",
        error: error.message,
      });
    }
  });

  // Get specific user by ID
  app.get("/api/users/:userId", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const db = getFirestore();
      const doc = await db.collection("users").doc(userId).get();
      
      if (!doc.exists) {
        return res.status(404).json({ message: "User not found" });
      }

      const data = doc.data();
      const user = {
        id: doc.id,
        email: data?.email || "",
        username: data?.username || "",
        role: data?.role || "user",
      };

      console.log(`✅ Fetched user ${userId} from Firestore`);
      res.json(user);
    } catch (error: any) {
      console.error("❌ Error fetching user:", error);
      res.status(500).json({
        message: "Failed to fetch user",
        error: error.message,
      });
    }
  });

  // Update user role
  app.post("/api/user/role", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const { userId, role } = req.body;

      if (!userId || !role) {
        return res.status(400).json({ message: "User ID and role are required" });
      }

      const db = getFirestore();
      // Use set with merge to create or update the document
      await db.collection("users").doc(userId).set({
        role: role,
      }, { merge: true });

      console.log(`✅ User ${userId} role updated to ${role}`);
      res.json({ message: "User role updated successfully", role });
    } catch (error: any) {
      console.error("❌ Error updating user role:", error);
      res.status(500).json({
        message: "Failed to update user role",
        error: error.message,
      });
    }
  });

  // Get all categories
  app.get("/api/categories", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.json([]);
      }

      const db = getFirestore();
      const snapshot = await db.collection("categories").get();
      const categories: any[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        categories.push({
          id: doc.id,
          name: data.name || "",
        });
      });

      console.log(`✅ Fetched ${categories.length} categories from Firestore`);
      res.json(categories);
    } catch (error: any) {
      console.error("❌ Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Add or update category
  app.post("/api/categories", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const { id, name } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Category name is required" });
      }

      const db = getFirestore();
      const docId = id || name.toLowerCase().replace(/\s+/g, "_");
      
      await db.collection("categories").doc(docId).set({
        name: name,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      console.log(`✅ Category ${docId} saved to Firestore`);
      res.json({ id: docId, name, message: "Category saved successfully" });
    } catch (error: any) {
      console.error("❌ Error saving category:", error);
      res.status(500).json({ message: "Failed to save category" });
    }
  });

  // Delete category
  app.delete("/api/categories/:id", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const { id } = req.params;
      const db = getFirestore();
      
      await db.collection("categories").doc(id).delete();

      console.log(`✅ Category ${id} deleted from Firestore`);
      res.json({ message: "Category deleted successfully" });
    } catch (error: any) {
      console.error("❌ Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Get all shipping zones
  app.get("/api/shipping-zones", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.json([]);
      }

      const db = getFirestore();
      const snapshot = await db.collection("shippingZones").get();
      const zones: any[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        zones.push({
          id: doc.id,
          name: data.name || "",
          shippingCost: data.shippingCost || 0,
        });
      });

      console.log(`✅ Fetched ${zones.length} shipping zones from Firestore`);
      res.json(zones);
    } catch (error: any) {
      console.error("❌ Error fetching shipping zones:", error);
      res.status(500).json({ message: "Failed to fetch shipping zones" });
    }
  });

  // Add or update shipping zone
  app.post("/api/shipping-zones", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const { id, name, shippingCost } = req.body;

      if (!name || shippingCost === undefined) {
        return res.status(400).json({ message: "Zone name and shipping cost are required" });
      }

      const db = getFirestore();
      const docId = id || name.toLowerCase().replace(/\s+/g, "_");
      
      await db.collection("shippingZones").doc(docId).set({
        name: name,
        shippingCost: parseFloat(shippingCost),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      console.log(`✅ Shipping zone ${docId} saved to Firestore`);
      res.json({ id: docId, name, shippingCost: parseFloat(shippingCost), message: "Shipping zone saved successfully" });
    } catch (error: any) {
      console.error("❌ Error saving shipping zone:", error);
      res.status(500).json({ message: "Failed to save shipping zone" });
    }
  });

  // Delete shipping zone
  app.delete("/api/shipping-zones/:id", async (req, res) => {
    try {
      if (!isFirebaseConfigured()) {
        return res.status(503).json({ message: "Firebase not configured" });
      }

      const { id } = req.params;
      const db = getFirestore();
      
      await db.collection("shippingZones").doc(id).delete();

      console.log(`✅ Shipping zone ${id} deleted from Firestore`);
      res.json({ message: "Shipping zone deleted successfully" });
    } catch (error: any) {
      console.error("❌ Error deleting shipping zone:", error);
      res.status(500).json({ message: "Failed to delete shipping zone" });
    }
  });

  const server = createServer(app);
  return server;
}
