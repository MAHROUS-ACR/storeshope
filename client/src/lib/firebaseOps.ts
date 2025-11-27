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
    console.error("❌ Error fetching products:", error?.message || error);
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
    console.error("Error fetching product:", error);
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
    console.error("Error saving product:", error);
    return false;
  }
}

export async function deleteProduct(id: string) {
  try {
    const db = initDb();
    await deleteDoc(doc(db, "products", id));
    return true;
  } catch (error) {
    console.error("Error deleting product:", error);
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
    console.error("Error fetching orders:", error);
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
    console.error("Error fetching order:", error);
    return null;
  }
}

export async function saveOrder(order: any) {
  console.log("🔵 saveOrder START - Order ID:", order?.id);
  
  try {
    // Validate required fields
    if (!order?.userId || !order?.id || !order?.items?.length) {
      throw new Error("Missing userId, id, or items");
    }

    // Get fresh DB connection
    const db = initDb();
    console.log("✅ DB ready");

    // Clean order data - remove undefined fields
    const cleanOrder: any = {};
    Object.keys(order).forEach(key => {
      const value = order[key];
      if (value !== undefined && value !== null && value !== "") {
        cleanOrder[key] = value;
      }
    });

    // Set defaults for required string fields
    if (!cleanOrder.status) cleanOrder.status = "pending";
    if (!cleanOrder.paymentMethod) cleanOrder.paymentMethod = "";
    if (!cleanOrder.shippingType) cleanOrder.shippingType = "";
    if (!cleanOrder.shippingZone) cleanOrder.shippingZone = "";
    
    // Ensure numbers are valid
    cleanOrder.subtotal = Number(cleanOrder.subtotal) || 0;
    cleanOrder.shippingCost = Number(cleanOrder.shippingCost) || 0;
    cleanOrder.total = Number(cleanOrder.total) || 0;
    cleanOrder.orderNumber = Number(cleanOrder.orderNumber) || 0;

    // Add timestamp
    cleanOrder.createdAt = new Date().toISOString();

    console.log("📦 Clean order data:", JSON.stringify(cleanOrder, null, 2));

    await setDoc(doc(db, "orders", order.id), cleanOrder);
    console.log("✅ saveOrder SUCCESS - Order saved:", order.id);
    return order.id;
  } catch (error: any) {
    console.error("❌ saveOrder FAILED:", error?.message || error);
    console.error("❌ Full error:", error);
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
      console.error("❌ updateOrder FAILED - Document not found with ID:", id);
      return false;
    }
    
    // Document exists, now update it safely
    await updateDoc(orderRef, updates);
    console.log("✅ updateOrder SUCCESS - Document updated");
    return true;
  } catch (error: any) {
    console.error("❌ updateOrder ERROR:", error?.message);
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
    console.error("Error fetching store settings:", error);
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
    console.error("Error saving store settings:", error);
    return false;
  }
}

// ============= SHIPPING ZONES =============
export async function getShippingZones() {
  try {
    console.log("📍 getShippingZones START");
    const db = initDb();
    const zonesRef = collection(db, "shippingZones");
    const snapshot = await getDocs(zonesRef);
    const zones = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    console.log("📍 getShippingZones SUCCESS - Found:", zones.length, "zones");
    return zones;
  } catch (error: any) {
    console.error("❌ Error fetching shipping zones:", error?.message || error);
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
    console.error("Error saving shipping zone:", error);
    return null;
  }
}

export async function deleteShippingZone(id: string) {
  try {
    const db = initDb();
    await deleteDoc(doc(db, "shippingZones", id));
    return true;
  } catch (error) {
    console.error("Error deleting shipping zone:", error);
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
    console.error("Error fetching notifications:", error);
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
    console.error("Error marking notification as read:", error);
    return false;
  }
}

export async function deleteNotification(id: string) {
  try {
    const db = initDb();
    await deleteDoc(doc(db, "notifications", id));
    return true;
  } catch (error) {
    console.error("Error deleting notification:", error);
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
    console.error("Error fetching discounts:", error);
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
    console.error("Error saving discount:", error);
    return null;
  }
}

export async function deleteDiscount(id: string) {
  try {
    const db = initDb();
    await deleteDoc(doc(db, "discounts", id));
    return true;
  } catch (error) {
    console.error("Error deleting discount:", error);
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
    console.error("Error fetching users:", error);
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
    console.error("Error fetching user:", error);
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
    console.error("Error updating user:", error);
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
    console.error("Error fetching categories:", error);
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
    console.error("Error saving category:", error);
    return null;
  }
}

export async function deleteCategory(id: string) {
  try {
    const db = initDb();
    await deleteDoc(doc(db, "categories", id));
    return true;
  } catch (error) {
    console.error("Error deleting category:", error);
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
    console.error("Error saving FCM token:", error);
    return false;
  }
}
