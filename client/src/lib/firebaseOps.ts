/**
 * Firebase Operations - Direct Firestore/Firebase calls from client
 * Replaces all Express API endpoints
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
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

let db: any = null;
let currentFirebaseConfig: any = null;

async function loadFirebaseConfigFromFirestore() {
  try {
    // Initialize with default config first
    if (!currentFirebaseConfig) {
      currentFirebaseConfig = getFirebaseConfig();
      initializeApp(currentFirebaseConfig);
    }
    
    const database = getFirestore();
    const configRef = doc(database, "settings", "firebase");
    const configSnap = await getDoc(configRef);
    
    if (configSnap.exists()) {
      const firestoreConfig = configSnap.data();
      const newConfig = {
        apiKey: firestoreConfig.firebaseApiKey || currentFirebaseConfig.apiKey,
        authDomain: firestoreConfig.firebaseAuthDomain || currentFirebaseConfig.authDomain,
        projectId: firestoreConfig.firebaseProjectId || currentFirebaseConfig.projectId,
        storageBucket: firestoreConfig.firebaseStorageBucket || currentFirebaseConfig.storageBucket,
        messagingSenderId: firestoreConfig.firebaseMessagingSenderId || currentFirebaseConfig.messagingSenderId,
        appId: firestoreConfig.firebaseAppId || currentFirebaseConfig.appId,
      };
      
      // Only reinitialize if config changed
      if (JSON.stringify(newConfig) !== JSON.stringify(currentFirebaseConfig)) {
        console.log("🔄 Updating Firebase config from Firestore");
        currentFirebaseConfig = newConfig;
        // Note: In a real app, you'd need to properly reinitialize Firebase
        // For now, we reload the page to apply new config
        window.location.reload();
      }
    }
  } catch (error) {
    console.error("Error loading Firebase config from Firestore:", error);
  }
}

function initDb() {
  if (!db) {
    try {
      if (!currentFirebaseConfig) {
        currentFirebaseConfig = getFirebaseConfig();
      }
      initializeApp(currentFirebaseConfig);
    } catch (error: any) {
      if (!error.message?.includes('duplicate-app')) {
        console.error('Firebase initialization error:', error);
      }
    }
    db = getFirestore();
  }
  return db;
}

// Check Firebase config on first call
let configCheckDone = false;
async function ensureConfigLoaded() {
  if (!configCheckDone) {
    configCheckDone = true;
    await loadFirebaseConfigFromFirestore();
  }
}

// ============= PRODUCTS =============
export async function getProducts() {
  try {
    await ensureConfigLoaded();
    const db = initDb();
    const productsRef = collection(db, "products");
    const snapshot = await getDocs(productsRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
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
  try {
    console.log("📝 saveOrder called with order:", order);
    
    // Ensure database is initialized
    const db = initDb();
    console.log("✅ Database initialized - db object:", !!db);
    
    if (!db) {
      console.error("❌ Database initialization failed - db is null");
      throw new Error("Database not initialized");
    }
    
    const ordersRef = collection(db, "orders");
    console.log("✅ Orders collection reference created");
    
    const docRef = doc(ordersRef);
    console.log("✅ New document reference created:", docRef.id);
    
    // Keep createdAt as ISO string - don't convert to Timestamp
    const orderData = {
      ...order,
    };
    console.log("📋 Order data prepared - fields:", Object.keys(orderData));
    console.log("📋 Full order data:", orderData);
    
    console.log("📤 Calling setDoc...");
    const result = await setDoc(docRef, orderData);
    console.log("✅ setDoc returned:", result);
    
    console.log("✅ Order saved successfully with ID:", docRef.id);
    console.log("🎉 SUCCESS - Order ID:", docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error("❌ CRITICAL ERROR saving order:");
    console.error("Error code:", error?.code);
    console.error("Error message:", error?.message);
    console.error("Error name:", error?.name);
    console.error("Full error:", error);
    console.error("Error stack:", error?.stack);
    
    // Additional debugging
    if (error?.code === "permission-denied") {
      console.error("🔒 Firestore security rule blocked the write operation");
    }
    
    return null;
  }
}

export async function updateOrder(id: string, updates: any) {
  try {
    const db = initDb();
    const orderRef = doc(db, "orders", id);
    await updateDoc(orderRef, updates);
    return true;
  } catch (error) {
    console.error("Error updating order:", error);
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
    const db = initDb();
    const zonesRef = collection(db, "shippingZones");
    const snapshot = await getDocs(zonesRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching shipping zones:", error);
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
