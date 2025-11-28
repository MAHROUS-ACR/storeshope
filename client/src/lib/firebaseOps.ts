/**
 * Firebase Operations - Direct Firestore/Firebase calls from client
 * Replaces all Express API endpoints
 */

import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Get Firebase config - first from environment variables, can be overridden from Firestore
function getFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

function initDb() {
  const config = getFirebaseConfig();
  if (!getApps().length) {
    initializeApp(config);
  }
  return getFirestore();
}

// ============= PRODUCTS =============
export async function getProducts() {
  try {
    const db = initDb();
    const productsRef = collection(db, "products");
    const snapshot = await getDocs(productsRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error: any) {

    return [];
  }
}

export async function getProductById(id: string) {
  try {
    const db = initDb();
    const productRef = doc(db, "products", id);
    const snapshot = await getDoc(productRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  } catch (error) {

    return null;
  }
}

export async function saveProduct(product: any) {
  try {
    const db = initDb();
    const productRef = doc(db, "products", product.id);
    await setDoc(productRef, product);
    return true;
  } catch (error) {

    return false;
  }
}

export async function deleteProduct(id: string) {
  try {
    const db = initDb();
    await deleteDoc(doc(db, "products", id));
    return true;
  } catch (error) {

    return false;
  }
}

// ============= ORDERS =============
export async function getOrders(userId?: string) {
  try {
    const db = initDb();
    const ordersRef = collection(db, "orders");
    
    if (userId) {
      const q = query(ordersRef, where("userId", "==", userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } else {
      const snapshot = await getDocs(ordersRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    }
  } catch (error) {

    return [];
  }
}

export async function getOrderById(id: string) {
  try {
    const db = initDb();
    const orderRef = doc(db, "orders", id);
    const snapshot = await getDoc(orderRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  } catch (error) {

    return null;
  }
}

// ============= EMAIL SENDING (BREVO) =============
export async function sendOrderEmailWithBrevo(order: any, userEmail: string) {
  try {
    // Get store settings for Brevo credentials
    const db = initDb();
    const storeRef = doc(db, "settings", "store");
    const storeSnap = await getDoc(storeRef);
    
    if (!storeSnap.exists()) {
      console.warn("⚠️ Store settings not found - email not sent");
      return false;
    }

    const storeData = storeSnap.data();
    const brevoApiKey = storeData?.brevoApiKey;
    const brevoFromEmail = storeData?.brevoFromEmail;
    const brevoFromName = storeData?.brevoFromName || "Order System";
    const adminEmail = storeData?.adminEmail;
    
    if (!brevoApiKey || !brevoFromEmail) {
      console.warn("⚠️ Brevo credentials not configured - email not sent");
      console.warn("📝 Go to Settings and add: Brevo API Key + From Email");
      return false;
    }

    console.log("📧 Sending email via Brevo...", {
      from: brevoFromEmail,
      to: [userEmail, adminEmail],
    });

    // Format order items
    const itemsList = (order.items || [])
      .map((item: any) => `<li>${item.title} × ${item.quantity} = L.E ${(item.price * item.quantity).toFixed(2)}</li>`)
      .join("");

    // Email template
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Confirmation #${order.orderNumber || order.id}</h2>
        <p><strong>Status:</strong> ${order.status}</p>
        <p><strong>Total:</strong> L.E ${order.total?.toFixed(2) || 0}</p>
        <h3 style="color: #333;">Items:</h3>
        <ul>${itemsList}</ul>
        <p><strong>Shipping Address:</strong> ${order.shippingAddress || "N/A"}</p>
        <p><strong>Phone:</strong> ${order.shippingPhone || "N/A"}</p>
        <p style="margin-top: 20px; color: #666; font-size: 12px;">Thank you for your order!</p>
      </div>
    `;

    // Send email via Brevo REST API
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          email: brevoFromEmail,
          name: brevoFromName,
        },
        to: [
          { email: userEmail },
          ...(adminEmail ? [{ email: adminEmail }] : []),
        ],
        subject: `Order Confirmation #${order.orderNumber || order.id}`,
        htmlContent: emailHTML,
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log("✅ Email sent successfully via Brevo!", {
        messageId: result.messageId,
        to: [userEmail, adminEmail],
      });
      return true;
    } else {
      console.error("❌ Brevo API Error:", {
        status: response.status,
        statusText: response.statusText,
        error: result,
        details: result.message || result.error,
      });
      
      return false;
    }
  } catch (error: any) {
    console.error("❌ Email error:", error?.message || error);
    return false;
  }
}

export async function saveOrder(order: any) {
  try {
    // Validate required fields
    if (!order?.userId || !order?.id || !order?.items?.length) {
      console.error("❌ saveOrder validation failed:", { userId: order?.userId, id: order?.id, itemsLength: order?.items?.length });
      throw new Error("Missing userId, id, or items");
    }

    console.log("📦 Saving order with coordinates:", { 
      deliveryLat: order.deliveryLat, 
      deliveryLng: order.deliveryLng,
      driverLat: order.driverLat,
      driverLng: order.driverLng
    });

    // Get fresh DB connection
    const db = initDb();

    // Clean order data - preserve numeric fields including coordinates
    const cleanOrder: any = {};
    Object.keys(order).forEach(key => {
      const value = order[key];
      // Keep all values except undefined, but allow null for driver location
      if (value !== undefined && value !== "") {
        cleanOrder[key] = value;
      }
    });

    // Ensure coordinate numbers are valid
    if (typeof cleanOrder.deliveryLat === 'number') cleanOrder.deliveryLat = cleanOrder.deliveryLat;
    if (typeof cleanOrder.deliveryLng === 'number') cleanOrder.deliveryLng = cleanOrder.deliveryLng;
    if (typeof cleanOrder.driverLat === 'number') cleanOrder.driverLat = cleanOrder.driverLat;
    if (typeof cleanOrder.driverLng === 'number') cleanOrder.driverLng = cleanOrder.driverLng;

    // Set defaults for required string fields
    if (!cleanOrder.status) cleanOrder.status = "pending";
    if (!cleanOrder.paymentMethod) cleanOrder.paymentMethod = "";
    if (!cleanOrder.shippingType) cleanOrder.shippingType = "";
    if (!cleanOrder.shippingZone) cleanOrder.shippingZone = "";
    
    // Ensure numbers are valid
    cleanOrder.subtotal = Number(cleanOrder.subtotal) || 0;
    cleanOrder.discountedTotal = Number(cleanOrder.discountedTotal) || 0;
    cleanOrder.discountAmount = Number(cleanOrder.discountAmount) || 0;
    cleanOrder.shippingCost = Number(cleanOrder.shippingCost) || 0;
    cleanOrder.total = Number(cleanOrder.total) || 0;
    cleanOrder.orderNumber = Number(cleanOrder.orderNumber) || 0;

    // Add timestamp
    cleanOrder.createdAt = new Date().toISOString();

    console.log("💾 Saving to Firebase with data:", { 
      id: cleanOrder.id,
      userId: cleanOrder.userId,
      deliveryLat: cleanOrder.deliveryLat,
      deliveryLng: cleanOrder.deliveryLng
    });

    await setDoc(doc(db, "orders", order.id), cleanOrder);
    console.log("✅ Order saved successfully:", order.id);

    // Send order confirmation email via Brevo (non-blocking)
    const emailAddress = order.userEmail || order.customerEmail || order.email;
    if (emailAddress) {
      await sendOrderEmailWithBrevo(cleanOrder, emailAddress).catch((err: any) => {
        console.log("⚠️ Email sending failed (non-blocking):", err?.message);
      });
    }

    return order.id;
  } catch (error: any) {
    console.error("❌ saveOrder error:", error?.message || error);
    return null;
  }
}

export async function updateOrder(id: string, updates: any) {
  try {
    const db = initDb();
    
    // First verify document exists
    const orderRef = doc(db, "orders", id);
    const existingDoc = await getDoc(orderRef);
    
    if (!existingDoc.exists()) {

      return false;
    }
    
    // Document exists, now update it safely
    await updateDoc(orderRef, updates);

    return true;
  } catch (error: any) {

    return false;
  }
}

// ============= STORE SETTINGS =============
export async function getStoreSettings() {
  try {
    const db = initDb();
    const storeRef = doc(db, "settings", "store");
    const snapshot = await getDoc(storeRef);
    return snapshot.exists() ? snapshot.data() : null;
  } catch (error) {

    return null;
  }
}

export async function saveStoreSettings(settings: any) {
  try {
    const db = initDb();
    const storeRef = doc(db, "settings", "store");
    await setDoc(storeRef, {
      ...settings,
      updatedAt: Timestamp.now(),
    });
    return true;
  } catch (error) {

    return false;
  }
}

// ============= SHIPPING ZONES =============
export async function getShippingZones() {
  try {

    const db = initDb();
    const zonesRef = collection(db, "shippingZones");
    const snapshot = await getDocs(zonesRef);
    const zones = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return zones;
  } catch (error: any) {

    return [];
  }
}

export async function saveShippingZone(zone: any) {
  try {
    const db = initDb();
    if (zone.id) {
      const zoneRef = doc(db, "shippingZones", zone.id);
      await setDoc(zoneRef, zone);
    } else {
      const zonesRef = collection(db, "shippingZones");
      const docRef = doc(zonesRef);
      await setDoc(docRef, zone);
      return docRef.id;
    }
    return zone.id;
  } catch (error) {

    return null;
  }
}

export async function deleteShippingZone(id: string) {
  try {
    const db = initDb();
    await deleteDoc(doc(db, "shippingZones", id));
    return true;
  } catch (error) {

    return false;
  }
}

// ============= NOTIFICATIONS =============
export async function getNotifications(userId: string, isAdmin: boolean) {
  try {
    const db = initDb();
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where(isAdmin ? "adminId" : "userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {

    return [];
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    const db = initDb();
    const notifRef = doc(db, "notifications", id);
    await updateDoc(notifRef, { read: true });
    return true;
  } catch (error) {

    return false;
  }
}

export async function deleteNotification(id: string) {
  try {
    const db = initDb();
    await deleteDoc(doc(db, "notifications", id));
    return true;
  } catch (error) {

    return false;
  }
}

// ============= DISCOUNTS =============
export async function getDiscounts() {
  try {
    const db = initDb();
    const discountsRef = collection(db, "discounts");
    const snapshot = await getDocs(discountsRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {

    return [];
  }
}

export async function saveDiscount(discount: any) {
  try {
    const db = initDb();
    if (discount.id) {
      const discountRef = doc(db, "discounts", discount.id);
      await setDoc(discountRef, discount);
    } else {
      const discountsRef = collection(db, "discounts");
      const docRef = doc(discountsRef);
      await setDoc(docRef, {
        ...discount,
        createdAt: Timestamp.now(),
      });
      return docRef.id;
    }
    return discount.id;
  } catch (error) {

    return null;
  }
}

export async function deleteDiscount(id: string) {
  try {
    const db = initDb();
    await deleteDoc(doc(db, "discounts", id));
    return true;
  } catch (error) {

    return false;
  }
}

// ============= USERS =============
export async function getUsers() {
  try {
    const db = initDb();
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {

    return [];
  }
}

export async function getUserById(id: string) {
  try {
    const db = initDb();
    const userRef = doc(db, "users", id);
    const snapshot = await getDoc(userRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  } catch (error) {

    return null;
  }
}

export async function updateUser(id: string, updates: any) {
  try {
    const db = initDb();
    const userRef = doc(db, "users", id);
    await updateDoc(userRef, updates);
    return true;
  } catch (error) {

    return false;
  }
}

// ============= CATEGORIES =============
export async function getCategories() {
  try {
    const db = initDb();
    const categoriesRef = collection(db, "categories");
    const snapshot = await getDocs(categoriesRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {

    return [];
  }
}

export async function saveCategory(category: any) {
  try {
    const db = initDb();
    if (category.id) {
      const catRef = doc(db, "categories", category.id);
      await setDoc(catRef, category);
    } else {
      const categoriesRef = collection(db, "categories");
      const docRef = doc(categoriesRef);
      await setDoc(docRef, category);
      return docRef.id;
    }
    return category.id;
  } catch (error) {

    return null;
  }
}

export async function deleteCategory(id: string) {
  try {
    const db = initDb();
    await deleteDoc(doc(db, "categories", id));
    return true;
  } catch (error) {

    return false;
  }
}

// ============= FCM TOKENS =============
export async function saveFCMToken(userId: string, token: string) {
  try {
    const db = initDb();
    const tokensRef = collection(db, "fcmTokens");
    const q = query(tokensRef, where("userId", "==", userId));
    const existing = await getDocs(q);
    
    if (!existing.empty) {
      const docRef = existing.docs[0].ref;
      await updateDoc(docRef, { 
        token,
        updatedAt: Timestamp.now(),
      });
    } else {
      const docRef = doc(tokensRef);
      await setDoc(docRef, {
        userId,
        token,
        createdAt: Timestamp.now(),
      });
    }
    return true;
  } catch (error) {

    return false;
  }
}
