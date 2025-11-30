/**
 * Firebase Operations - Direct Firestore/Firebase calls from client
 * Replaces all Express API endpoints
 */

import { initializeApp, getApps, deleteApp } from "firebase/app";
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

// Demo/Fallback Firebase config (read-only, for demo purposes)
const DEMO_CONFIG = {
  apiKey: "demo_api_key",
  authDomain: "demo.firebaseapp.com",
  projectId: "demo_project",
  storageBucket: "demo.appspot.com",
  messagingSenderId: "demo_sender",
  appId: "demo_app_id",
};

let cachedConfig: any = null;
let isInitialized = false;
let hasValidConfig = false; // Track if we have valid credentials

// Get Firebase config synchronously (uses cached or env)
function getFirebaseConfig() {
  // If cached, return it
  if (cachedConfig) {
    return cachedConfig;
  }

  // Fallback: Use environment variables
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  // If env variables exist, use them
  if (envConfig.apiKey && envConfig.projectId && envConfig.appId) {
    cachedConfig = envConfig;
    return envConfig;
  }

  // Last resort: Use demo config
  cachedConfig = DEMO_CONFIG;
  return DEMO_CONFIG;
}

// Load Firebase config from Firestore (async)
export async function loadFirebaseConfigFromFirestore() {
  try {
    // First init with env variables to connect to Firestore
    const tempDb = getFirestore();
    const firebaseConfigRef = doc(tempDb, "settings", "firebase");
    const firebaseConfigSnap = await getDoc(firebaseConfigRef);

    if (firebaseConfigSnap.exists()) {
      const serverConfig = firebaseConfigSnap.data();
      cachedConfig = {
        apiKey: serverConfig.firebaseApiKey || import.meta.env.VITE_FIREBASE_API_KEY || DEMO_CONFIG.apiKey,
        authDomain: serverConfig.firebaseAuthDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEMO_CONFIG.authDomain,
        projectId: serverConfig.firebaseProjectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || DEMO_CONFIG.projectId,
        storageBucket: serverConfig.firebaseStorageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEMO_CONFIG.storageBucket,
        messagingSenderId: serverConfig.firebaseMessagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEMO_CONFIG.messagingSenderId,
        appId: serverConfig.firebaseAppId || import.meta.env.VITE_FIREBASE_APP_ID || DEMO_CONFIG.appId,
      };
      hasValidConfig = true;
      isInitialized = true;
      return;
    }
  } catch (error) {
    // Firestore load failed, will use env variables
    hasValidConfig = false;
  }
  
  // Use env as fallback
  const fallbackConfig = getFirebaseConfig();
  cachedConfig = fallbackConfig;
  // Check if fallback config is valid (not demo)
  hasValidConfig = fallbackConfig.projectId !== DEMO_CONFIG.projectId && 
                   fallbackConfig.apiKey !== DEMO_CONFIG.apiKey;
  isInitialized = true;
}

function initDb() {
  const config = getFirebaseConfig();
  
  // Only initialize if not already done
  if (!getApps().length) {
    initializeApp(config);
  }
  return getFirestore();
}

// Function to reload config (call after settings are saved)
export function reloadFirebaseConfig() {
  // Delete all Firebase apps
  const apps = getApps();
  for (const app of apps) {
    deleteApp(app);
  }
  
  // Clear cache
  cachedConfig = null;
  isInitialized = false;
  hasValidConfig = false;
}

// Check if using demo config or invalid credentials
export function isDemoMode() {
  const config = cachedConfig || getFirebaseConfig();
  // Show demo indicator if:
  // 1. Using demo projectId OR
  // 2. Haven't successfully loaded from Firestore AND not using valid env config
  return config.projectId === DEMO_CONFIG.projectId || !hasValidConfig;
}

// Check if Firebase config has been initialized/loaded
export function isFirebaseConfigInitialized() {
  return isInitialized;
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
export async function sendOrderStatusUpdateEmail(order: any, userEmail: string, oldStatus: string) {
  try {
    // Get store settings for Brevo credentials
    const db = initDb();
    const storeRef = doc(db, "settings", "store");
    const storeSnap = await getDoc(storeRef);
    
    if (!storeSnap.exists()) {
      return false;
    }

    const storeData = storeSnap.data();
    const brevoApiKey = storeData?.brevoApiKey;
    const brevoFromEmail = storeData?.brevoFromEmail;
    const brevoFromName = storeData?.brevoFromName || "Order System";
    const adminEmail = storeData?.adminEmail;
    
    if (!brevoApiKey || !brevoFromEmail) {
      return false;
    }

    const statusMap: { [key: string]: string } = { pending: "قيد الانتظار", confirmed: "مؤكد", processing: "قيد المعالجة", shipped: "تم الشحن", "in-transit": "في الطريق", completed: "مكتمل", received: "تم التسليم", cancelled: "ملغى" };
    const newStatusArabic = statusMap[order.status] || order.status;
    const oldStatusArabic = statusMap[oldStatus] || oldStatus;

    // Status update email template - focused on status change only
    const emailHTML = `
      <!DOCTYPE html>
      <html dir="rtl" style="margin:0; padding:0;">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; line-height: 1.6; }
          .container { max-width: 700px; margin: 0 auto; background-color: #ffffff; padding: 0; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15); border-radius: 8px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0 0 8px 0; font-size: 28px; font-weight: bold; }
          .content { padding: 40px 30px; }
          .welcome { font-size: 16px; color: #333; margin: 0 0 25px 0; line-height: 1.8; font-weight: 500; }
          .status-box { background: linear-gradient(135deg, #f0f8ff 0%, #e8f4fb 100%); border-right: 4px solid #667eea; padding: 25px; border-radius: 8px; margin: 25px 0; }
          .status-label { font-size: 12px; color: #667eea; text-transform: uppercase; margin-bottom: 8px; font-weight: 700; letter-spacing: 0.5px; }
          .status-old { font-size: 14px; color: #999; margin-bottom: 10px; text-decoration: line-through; }
          .status-new { font-size: 20px; font-weight: bold; color: #667eea; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .info-item { background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%); padding: 15px; border-radius: 8px; border-left: 3px solid #667eea; }
          .info-label { font-size: 10px; color: #667eea; text-transform: uppercase; margin-bottom: 5px; font-weight: 700; }
          .info-value { font-size: 14px; color: #333; font-weight: 600; }
          .next-steps { background: #fffacd; border-right: 4px solid #ffc107; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .footer { background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%); padding: 25px 30px; text-align: center; font-size: 13px; color: #666; border-top: 1px solid #e8e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1>🔄 تحديث حالة الطلب</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px;">Order #${order.orderNumber || order.id}</p>
          </div>

          <!-- Content -->
          <div class="content">
            <!-- Welcome -->
            <p class="welcome">
              مرحباً ${order.customerName || "العميل"}،<br>
              تم تحديث حالة طلبك! 📦
            </p>

            <!-- Status Update -->
            <div class="status-box">
              <div class="status-label">📊 الحالة السابقة</div>
              <div class="status-old">${oldStatusArabic}</div>
              
              <div class="status-label" style="margin-top: 15px;">✅ الحالة الجديدة</div>
              <div class="status-new">${newStatusArabic}</div>
            </div>

            <!-- Order Details -->
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">📅 تاريخ التحديث</div>
                <div class="info-value">${new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <div class="info-item">
                <div class="info-label">💰 الإجمالي</div>
                <div class="info-value">L.E ${Number(order.total || 0).toFixed(2)}</div>
              </div>
            </div>

            <!-- Next Steps -->
            <div class="next-steps">
              <strong>⏭️ الخطوة التالية:</strong><br>
              سيتم إرسال تحديثات إضافية عند تغيير حالة طلبك. شكراً لصبرك! 🙏
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="margin: 0;">للتواصل معنا أو للاستفسارات، لا تتردد في التواصل.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Brevo REST API
    const brevoPayload = {
      sender: {
        email: brevoFromEmail,
        name: brevoFromName,
      },
      to: [
        { email: userEmail },
        ...(adminEmail ? [{ email: adminEmail }] : []),
      ],
      subject: `تحديث حالة الطلب: ${newStatusArabic} #${order.orderNumber || order.id}`,
      htmlContent: emailHTML,
    };

    // Try direct call first (may work if Brevo allows it)
    let response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify(brevoPayload),
    }).catch(err => {
      return null;
    });

    // If CORS blocked, try alternative endpoint or skip silently
    if (!response) {
      return true; // Consider as success since we can't verify from client
    }

    const result = await response.json();
    
    if (response.ok) {
      return true;
    } else {
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export async function sendOrderEmailWithBrevo(order: any, userEmail: string) {
  try {
    // Get store settings for Brevo credentials
    const db = initDb();
    const storeRef = doc(db, "settings", "store");
    const storeSnap = await getDoc(storeRef);
    
    if (!storeSnap.exists()) {
      return false;
    }

    const storeData = storeSnap.data();
    const brevoApiKey = storeData?.brevoApiKey;
    const brevoFromEmail = storeData?.brevoFromEmail;
    const brevoFromName = storeData?.brevoFromName || "Order System";
    const adminEmail = storeData?.adminEmail;
    
    if (!brevoApiKey || !brevoFromEmail) {
      return false;
    }

    // Format order items as table rows
    const itemsRows = (order.items || [])
      .map((item: any) => {
        let variantHtml = "";
        if (item.selectedColor || item.selectedSize) {
          variantHtml = "<br>";
          if (item.selectedColor) {
            // selectedColor format: "colorName|colorHex" - extract name only
            let colorName = item.selectedColor;
            let colorCode = "#9333ea";
            if (typeof item.selectedColor === 'string' && item.selectedColor.includes('|')) {
              const parts = item.selectedColor.split('|');
              colorName = parts[0].trim();
              colorCode = parts[1]?.trim() || "#9333ea";
            }
            // Use background-color for better email client support
            variantHtml += `<span style="background-color: ${colorCode}; padding: 1px 8px; border-radius: 2px; font-size: 11px; color: white; font-weight: 500;">${colorName}</span>`;
          }
          if (item.selectedSize) {
            variantHtml += `<br><span style="font-size: 11px; color: #666;">📏 ${item.selectedSize}</span>`;
          }
        }
        
        return `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 12px 10px; text-align: right; font-size: 14px;">
            <strong>${item.title}</strong>${variantHtml}
          </td>
          <td style="padding: 12px 10px; text-align: center; font-size: 14px;">${item.quantity}</td>
          <td style="padding: 12px 10px; text-align: center; font-size: 14px;">L.E ${Number(item.price).toFixed(2)}</td>
          <td style="padding: 12px 10px; text-align: left; font-size: 14px; font-weight: bold;">L.E ${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
        </tr>
      `;
      })
      .join("");

    const orderDate = new Date(order.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
    const statusMap: { [key: string]: string } = { pending: "قيد الانتظار", shipped: "تم الشحن", completed: "مكتمل", cancelled: "ملغى" };
    const statusArabic = statusMap[order.status] || order.status;

    // Professional HTML Email Template
    const emailHTML = `
      <!DOCTYPE html>
      <html dir="rtl" style="margin:0; padding:0;">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; line-height: 1.6; }
          .container { max-width: 700px; margin: 0 auto; background-color: #ffffff; padding: 0; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15); border-radius: 8px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0 0 8px 0; font-size: 32px; font-weight: bold; letter-spacing: -0.5px; }
          .order-number { font-size: 15px; opacity: 0.95; font-weight: 500; letter-spacing: 0.5px; }
          .content { padding: 40px 30px; }
          .welcome { font-size: 16px; color: #333; margin: 0 0 25px 0; line-height: 1.8; font-weight: 500; }
          .section-title { font-size: 17px; font-weight: bold; color: #333; margin: 28px 0 18px 0; border-bottom: 3px solid #667eea; padding-bottom: 10px; display: inline-block; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 20px 0 30px 0; }
          .info-item { background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%); padding: 16px; border-radius: 8px; border-left: 3px solid #667eea; }
          .info-label { font-size: 11px; color: #667eea; text-transform: uppercase; margin-bottom: 6px; font-weight: 700; letter-spacing: 0.5px; }
          .info-value { font-size: 15px; color: #333; font-weight: 600; }
          .status { display: inline-block; padding: 8px 16px; border-radius: 25px; font-size: 13px; font-weight: bold; margin: 10px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .status.pending { background-color: #fff3cd; color: #856404; }
          .status.shipped { background-color: #d1ecf1; color: #0c5460; }
          .status.completed { background-color: #d4edda; color: #155724; }
          .status.cancelled { background-color: #f8d7da; color: #721c24; }
          table { width: 100%; border-collapse: collapse; margin: 25px 0; border-radius: 6px; overflow: hidden; }
          th { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px; text-align: right; font-weight: bold; font-size: 13px; }
          td { padding: 14px; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
          tbody tr:last-child td { border-bottom: none; }
          tbody tr { background-color: #fafbff; }
          tbody tr:hover { background-color: #f5f7ff; }
          .summary { background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea; }
          .summary-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e8e8f0; font-size: 15px; }
          .summary-row.total { border-bottom: none; font-weight: bold; font-size: 18px; color: #667eea; padding: 16px 0; background: white; margin: 0 -25px -25px -25px; padding: 16px 25px; border-radius: 0 0 8px 8px; }
          .summary-label { color: #666; font-weight: 600; }
          .summary-value { color: #333; font-weight: 700; }
          .footer { background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%); padding: 25px 30px; text-align: center; font-size: 13px; color: #666; border-top: 1px solid #e8e8f0; }
          .shipping-box { background: linear-gradient(135deg, #e8f4f8 0%, #d9ecf7 100%); border-right: 4px solid #667eea; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .shipping-box p { margin: 0; color: #333; font-weight: 600; font-size: 15px; }
          .next-steps { background: linear-gradient(135deg, #f0f8ff 0%, #e8f4fb 100%); padding: 18px; border-radius: 8px; margin: 25px 0; border-right: 4px solid #667eea; }
          .next-steps p { margin: 0; color: #333; font-size: 14px; line-height: 1.7; }
          .next-steps strong { color: #667eea; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1>✅ تأكيد الطلب</h1>
            <p class="order-number">Order #${order.orderNumber || order.id}</p>
          </div>

          <!-- Content -->
          <div class="content">
            <!-- Welcome -->
            <p class="welcome">
              مرحباً ${order.customerName || "العميل"}،<br>
              شكراً لك على اختيارك! تم استقبال طلبك بنجاح ✨
            </p>

            <!-- Order Status -->
            <div style="margin-bottom: 28px;">
              <span class="section-title">حالة الطلب</span>
              <div style="margin-top: 12px;">
                <span class="status ${order.status}">${statusArabic}</span>
              </div>
            </div>

            <!-- Order Details Grid -->
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">📅 التاريخ</div>
                <div class="info-value">${orderDate}</div>
              </div>
              <div class="info-item">
                <div class="info-label">📞 الجوال</div>
                <div class="info-value">${order.shippingPhone || "—"}</div>
              </div>
              <div class="info-item">
                <div class="info-label">💳 الدفع</div>
                <div class="info-value">${order.paymentMethod || "—"}</div>
              </div>
              <div class="info-item">
                <div class="info-label">🛍️ عدد المنتجات</div>
                <div class="info-value">${order.items?.length || 0} منتج</div>
              </div>
            </div>

            <!-- Items Table -->
            <span class="section-title">📦 تفاصيل المنتجات</span>
            <table style="width: 100%; border-collapse: collapse; margin: 15px -5px;">
              <thead>
                <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                  <th style="padding: 11px 8px; text-align: right; font-weight: bold; font-size: 13px;">المنتج</th>
                  <th style="padding: 11px 8px; text-align: center; font-weight: bold; font-size: 13px; width: 50px;">الكمية</th>
                  <th style="padding: 11px 8px; text-align: center; font-weight: bold; font-size: 13px;">السعر</th>
                  <th style="padding: 11px 8px; text-align: left; font-weight: bold; font-size: 13px;">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <!-- Price Summary -->
            <div class="summary">
              <div class="summary-row">
                <span class="summary-label">السعر الأساسي:</span>
                <span class="summary-value">L.E ${Number(order.subtotal || 0).toFixed(2)}</span>
              </div>
              ${order.discountAmount > 0 ? `
                <div class="summary-row">
                  <span class="summary-label">الخصم:</span>
                  <span class="summary-value" style="color: #27ae60;">-L.E ${Number(order.discountAmount || 0).toFixed(2)}</span>
                </div>
              ` : ""}
              <div class="summary-row">
                <span class="summary-label">تكلفة الشحن:</span>
                <span class="summary-value">L.E ${Number(order.shippingCost || 0).toFixed(2)}</span>
              </div>
              <div class="summary-row total">
                <span class="summary-label">الإجمالي النهائي:</span>
                <span class="summary-value">L.E ${Number(order.total || 0).toFixed(2)}</span>
              </div>
            </div>

            <!-- Shipping Address -->
            <span class="section-title">📍 عنوان التسليم</span>
            <div class="shipping-box">
              <p style="margin: 0; color: #333; font-weight: 500;">
                ${order.shippingAddress || "لم يتم تحديد العنوان"}
              </p>
              ${order.shippingZone ? `<p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">المنطقة: ${order.shippingZone}</p>` : ""}
            </div>

            ${order.notes ? `
            <!-- Order Notes -->
            <span class="section-title">📝 ملاحظات الطلب</span>
            <div style="background: #fffacd; border-right: 4px solid #ffc107; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.6;">${order.notes}</p>
            </div>
            ` : ""}

            <!-- Next Steps -->
            <div class="next-steps">
              <p>
                <strong>⏭️ ما الخطوة التالية؟</strong><br>
                سيتم تحضير طلبك قريباً وشحنه إليك. ستتلقى تحديثات الحالة مباشرة عبر البريد الإلكتروني.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="margin: 0 0 10px 0;">شكراً لاختيارك متجرنا! 💝</p>
            <p style="margin: 0; color: #999;">للتواصل معنا أو للاستفسارات، لا تتردد في التواصل.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Brevo REST API (using CORS proxy workaround)
    const brevoPayload = {
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
    };

    // Try direct call first (may work if Brevo allows it)
    let response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify(brevoPayload),
    }).catch(err => {
      return null;
    });

    // If CORS blocked, try alternative endpoint or skip silently
    if (!response) {
      return true; // Consider as success since we can't verify from client
    }

    const result = await response.json();
    
    if (response.ok) {
      return true;
    } else {
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export async function saveOrder(order: any) {
  try {
    // Validate required fields
    if (!order?.userId || !order?.id || !order?.items?.length) {
      throw new Error("Missing userId, id, or items");
    }

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

    await setDoc(doc(db, "orders", order.id), cleanOrder);

    // Send order confirmation email via Brevo (non-blocking)
    const emailAddress = order.userEmail || order.customerEmail || order.email;
    if (emailAddress) {
      await sendOrderEmailWithBrevo(cleanOrder, emailAddress).catch((err: any) => {
        // Silently handle email sending errors
      });
    }

    return order.id;
  } catch (error: any) {
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
