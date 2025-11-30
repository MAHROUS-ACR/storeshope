import { useState, useEffect } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Database, Save, LogOut, Copy, Check, Upload } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { saveFirebaseConfig, getFirebaseConfig, clearFirebaseConfig } from "@/lib/firebaseConfig";
import { reloadFirebaseConfig } from "@/lib/firebaseOps";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { setupFirebaseSettingsFromEnv } from "@/lib/setupFirebaseSettings";

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  
  // Client-side Firebase Auth config
  const [firebaseApiKey, setFirebaseApiKey] = useState("");
  const [firebaseProjectId, setFirebaseProjectId] = useState("");
  const [firebaseAppId, setFirebaseAppId] = useState("");
  const [firebaseAuthDomain, setFirebaseAuthDomain] = useState("");
  const [firebaseStorageBucket, setFirebaseStorageBucket] = useState("");
  const [firebaseMessagingSenderId, setFirebaseMessagingSenderId] = useState("");
  const [firebaseMeasurementId, setFirebaseMeasurementId] = useState("");
  
  // Store settings
  const [storeName, setStoreName] = useState("");
  const [storeLogo, setStoreLogo] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  
  // Email settings
  const [gmailUser, setGmailUser] = useState("");
  const [gmailPassword, setGmailPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [brevoApiKey, setBrevoApiKey] = useState("");
  const [brevoFromEmail, setBrevoFromEmail] = useState("");
  const [brevoFromName, setBrevoFromName] = useState("");
  
  // SN field for access control
  const [sn, setSN] = useState("");
  const [snError, setSnError] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Load Firebase config and Store settings from Firestore on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // First sync environment variables to Firestore
        await setupFirebaseSettingsFromEnv();
        
        const db = getFirestore();
        
        // Load Firebase config from Firestore
        const firebaseConfigRef = doc(db, "settings", "firebase");
        const firebaseConfigSnap = await getDoc(firebaseConfigRef);
        
        if (firebaseConfigSnap.exists()) {
          const serverConfig = firebaseConfigSnap.data();
          setFirebaseApiKey(serverConfig.firebaseApiKey || "");
          setFirebaseProjectId(serverConfig.firebaseProjectId || "");
          setFirebaseAppId(serverConfig.firebaseAppId || "");
          setFirebaseAuthDomain(serverConfig.firebaseAuthDomain || "");
          setFirebaseStorageBucket(serverConfig.firebaseStorageBucket || "");
          setFirebaseMessagingSenderId((serverConfig.firebaseMessagingSenderId || "").trim());
          setFirebaseMeasurementId(serverConfig.firebaseMeasurementId || "");
        }

        // Fetch Store settings from Firestore
        const storeConfigRef = doc(db, "settings", "store");
        const storeConfigSnap = await getDoc(storeConfigRef);
        if (storeConfigSnap.exists()) {
          const storeData = storeConfigSnap.data();
          setStoreName(storeData.name || "");
          setStoreLogo(storeData.logo || "");
          setStoreAddress(storeData.address || "");
          setStorePhone(storeData.phone || "");
          setStoreEmail(storeData.email || "");
          setGmailUser(storeData.gmailUser || "");
          setGmailPassword(storeData.gmailPassword || "");
          setAdminEmail(storeData.adminEmail || "");
          setBrevoApiKey(storeData.brevoApiKey || "");
          setBrevoFromEmail(storeData.brevoFromEmail || "");
          setBrevoFromName(storeData.brevoFromName || "");
        }
      } catch (error) {

      }
    };

    loadConfig();
  }, []);

  const handleCopyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `logos/${Date.now()}-${file.name}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setStoreLogo(downloadURL);
      toast.success("Logo uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Validate Firebase credentials
  const validateFirebaseConfig = async (): Promise<boolean> => {
    if (!firebaseApiKey || !firebaseProjectId || !firebaseAppId) {
      toast.error("Please fill in all required Firebase fields");
      return false;
    }

    try {
      // Try to validate by checking if the config format is correct
      if (!firebaseApiKey.startsWith("AIza")) {
        toast.error("Invalid Firebase API Key format");
        return false;
      }

      if (!firebaseAppId.includes(":")) {
        toast.error("Invalid Firebase App ID format");
        return false;
      }

      // If validation passes, return true
      return true;
    } catch (error) {
      toast.error("Firebase configuration validation failed");
      return false;
    }
  };

  const handleSaveAllSettings = async () => {
    // Check SN code
    if (sn !== "8094") {
      setSnError("Invalid access code");
      toast.error("Incorrect access code");
      return;
    }
    
    setSnError("");
    setIsLoading(true);
    try {
      // Validate Firebase config before saving
      const isValid = await validateFirebaseConfig();
      if (!isValid) {
        return;
      }

      const db = getFirestore();
      
      // Save Firebase config to Firestore
      const firebaseConfigRef = doc(db, "settings", "firebase");
      await setDoc(firebaseConfigRef, {
        firebaseApiKey,
        firebaseProjectId,
        firebaseAppId,
        firebaseAuthDomain,
        firebaseStorageBucket,
        firebaseMessagingSenderId,
        firebaseMeasurementId,
        updatedAt: new Date(),
      });

      // Save Store settings to Firestore
      const storeConfigRef = doc(db, "settings", "store");
      await setDoc(storeConfigRef, {
        name: storeName,
        logo: storeLogo,
        address: storeAddress,
        phone: storePhone,
        email: storeEmail,
        gmailUser: gmailUser,
        gmailPassword: gmailPassword,
        adminEmail: adminEmail,
        brevoApiKey: brevoApiKey,
        brevoFromEmail: brevoFromEmail,
        brevoFromName: brevoFromName,
        updatedAt: new Date(),
      });

      // Also save to localStorage for client-side use
      saveFirebaseConfig({
        apiKey: firebaseApiKey,
        projectId: firebaseProjectId,
        appId: firebaseAppId,
        authDomain: firebaseAuthDomain,
        storageBucket: firebaseStorageBucket,
        messagingSenderId: firebaseMessagingSenderId,
        measurementId: firebaseMeasurementId,
      });

      // Clear localStorage and reload Firebase config cache
      localStorage.removeItem("firebase_client_config");
      reloadFirebaseConfig();
      
      toast.success("All settings saved successfully! Reloading app...");

      // Reload page to apply new Firebase config
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAuthConfig = () => {
    clearFirebaseConfig();
    setFirebaseApiKey("");
    setFirebaseProjectId("");
    setFirebaseAppId("");
    setFirebaseAuthDomain("");
    setFirebaseStorageBucket("");
    setFirebaseMessagingSenderId("");
    setFirebaseMeasurementId("");
    toast.success("Firebase Authentication settings cleared!");
    setTimeout(() => setLocation("/"), 500);
  };

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 pb-4 pt-2 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            {storeName ? (
              <div className="flex items-center gap-3">
                {storeLogo ? (
                  <img src={storeLogo} alt={storeName} className="w-12 h-12 rounded-xl object-cover shadow-md border border-gray-100" />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg leading-none">
                    {storeName.charAt(0)}
                  </div>
                )}
                <h1 className="text-lg font-bold">{storeName}</h1>
              </div>
            ) : (
              <div className="w-32 h-7 bg-gray-200 rounded-lg animate-pulse" />
            )}
            <button
              onClick={() => setLocation("/")}
              className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Configure your application</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-40 w-full">
          <div className="w-full px-5 py-6">

            {/* SN Access Code */}
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <label className="block text-sm font-semibold mb-2" htmlFor="sn">
                🔐 Access Code (Required to modify settings)
              </label>
              <input
                id="sn"
                type="password"
                value={sn}
                onChange={(e) => setSN(e.target.value)}
                placeholder="Enter access code"
                className={`w-full px-5 py-3 bg-white border rounded-2xl text-sm focus:outline-none focus:ring-2 ${
                  snError
                    ? "border-red-300 focus:ring-red-200 focus:border-red-500"
                    : "border-gray-200 focus:ring-primary/20 focus:border-primary"
                }`}
                data-testid="input-sn"
              />
              {snError && <p className="text-xs text-red-600 mt-2">{snError}</p>}
            </div>

            {/* Firebase Configuration Section */}
            <div className="mb-8">
              <h2 className="text-lg font-bold mb-4">Firebase Authentication</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Configure your Firebase project for client-side authentication (sign up/login)
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="firebaseApiKey">
                    Firebase API Key
                  </label>
                  <input
                    id="firebaseApiKey"
                    type="text"
                    value={firebaseApiKey}
                    onChange={(e) => setFirebaseApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-firebase-api-key"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="firebaseProjectId">
                    Firebase Project ID
                  </label>
                  <input
                    id="firebaseProjectId"
                    type="text"
                    value={firebaseProjectId}
                    onChange={(e) => setFirebaseProjectId(e.target.value)}
                    placeholder="your-project-id"
                    className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-firebase-project-id"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="firebaseAppId">
                    Firebase App ID
                  </label>
                  <input
                    id="firebaseAppId"
                    type="text"
                    value={firebaseAppId}
                    onChange={(e) => setFirebaseAppId(e.target.value)}
                    placeholder="1:123456789:web:abcd1234efgh5678ijkl"
                    className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-firebase-app-id"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="firebaseAuthDomain">
                    Auth Domain
                  </label>
                  <input
                    id="firebaseAuthDomain"
                    type="text"
                    value={firebaseAuthDomain}
                    onChange={(e) => setFirebaseAuthDomain(e.target.value)}
                    placeholder="your-project.firebaseapp.com"
                    className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-firebase-auth-domain"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="firebaseStorageBucket">
                    Storage Bucket
                  </label>
                  <input
                    id="firebaseStorageBucket"
                    type="text"
                    value={firebaseStorageBucket}
                    onChange={(e) => setFirebaseStorageBucket(e.target.value)}
                    placeholder="your-project.appspot.com"
                    className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-firebase-storage-bucket"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="firebaseMessagingSenderId">
                    Messaging Sender ID
                  </label>
                  <input
                    id="firebaseMessagingSenderId"
                    type="text"
                    value={firebaseMessagingSenderId}
                    onChange={(e) => setFirebaseMessagingSenderId(e.target.value)}
                    placeholder="123456789012"
                    className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-firebase-messaging-sender-id"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="firebaseMeasurementId">
                    Measurement ID
                  </label>
                  <input
                    id="firebaseMeasurementId"
                    type="text"
                    value={firebaseMeasurementId}
                    onChange={(e) => setFirebaseMeasurementId(e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-firebase-measurement-id"
                  />
                </div>
              </div>
            </div>

            {/* Store Settings Section */}
            <div className="mb-8 pt-8 border-t border-gray-200">
              <h2 className="text-lg font-bold mb-4">Store Information</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Configure your store details
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="storeName">
                    Store Name
                  </label>
                  <input
                    id="storeName"
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Your Store Name"
                    className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-store-name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="storeLogo">
                    Store Logo
                  </label>
                  <label
                    htmlFor="storeLogo"
                    className="w-full px-5 py-4 bg-white border-2 border-dashed border-gray-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
                    data-testid="button-upload-logo"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="text-gray-600">
                      {isUploadingLogo ? "Uploading..." : "Click to upload logo"}
                    </span>
                  </label>
                  <input
                    id="storeLogo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={isUploadingLogo}
                    className="hidden"
                    data-testid="input-store-logo"
                  />
                  {storeLogo && (
                    <div className="mt-3 flex items-center gap-3">
                      <img 
                        src={storeLogo} 
                        alt="Logo Preview" 
                        className="w-12 h-12 rounded-xl object-cover border border-gray-200"
                      />
                      <span className="text-xs text-muted-foreground">Logo set</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="storeAddress">
                    Address
                  </label>
                  <input
                    id="storeAddress"
                    type="text"
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    placeholder="Store Address"
                    className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-store-address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="storePhone">
                    Phone Number
                  </label>
                  <input
                    id="storePhone"
                    type="tel"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-store-phone"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="storeEmail">
                    Email
                  </label>
                  <input
                    id="storeEmail"
                    type="email"
                    value={storeEmail}
                    onChange={(e) => setStoreEmail(e.target.value)}
                    placeholder="info@store.com"
                    className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-store-email"
                  />
                </div>
              </div>
            </div>

            {/* Email Settings Section */}
            <div className="mb-8 pt-8 border-t border-gray-200">
              <h2 className="text-lg font-bold mb-4">📧 Email Settings (Brevo)</h2>
              <p className="text-sm text-muted-foreground mb-2">
                Send order confirmations automatically via Brevo
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6 text-xs">
                <p><strong>📖 Quick Setup:</strong></p>
                <ol className="list-decimal list-inside ml-1 space-y-1 text-orange-900 mt-2">
                  <li>Sign up at <a href="https://brevo.com" target="_blank" rel="noopener noreferrer" className="underline">brevo.com</a></li>
                  <li>Get API Key from Settings → API Keys</li>
                  <li>Add verified sender email</li>
                  <li>Paste all details below ⬇️</li>
                </ol>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="brevoApiKey">
                    Brevo API Key
                  </label>
                  <input
                    id="brevoApiKey"
                    type="password"
                    value={brevoApiKey}
                    onChange={(e) => setBrevoApiKey(e.target.value)}
                    placeholder="xkeysib_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-brevo-api-key"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get from <a href="https://app.brevo.com/settings/account/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">brevo.com/api-keys</a>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="brevoFromEmail">
                    From Email (Must be verified in Brevo)
                  </label>
                  <input
                    id="brevoFromEmail"
                    type="email"
                    value={brevoFromEmail}
                    onChange={(e) => setBrevoFromEmail(e.target.value)}
                    placeholder="noreply@yourdomain.com"
                    className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-brevo-from-email"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ✅ Verified sender email from your Brevo account
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="brevoFromName">
                    From Name
                  </label>
                  <input
                    id="brevoFromName"
                    type="text"
                    value={brevoFromName}
                    onChange={(e) => setBrevoFromName(e.target.value)}
                    placeholder="Order System"
                    className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-brevo-from-name"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Name displayed as sender</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="adminEmail">
                    Admin Email
                  </label>
                  <input
                    id="adminEmail"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@store.com"
                    className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-admin-email"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Admin will receive order notifications</p>
                </div>
              </div>
            </div>

            {/* Save Button - One Button to Save All */}
            <div className="pt-8 border-t border-gray-200">
              <button
                onClick={handleSaveAllSettings}
                disabled={isLoading}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-save-all-settings"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save All Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
