import { useState } from "react";
import { useLocation } from "wouter";
import { Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { useLanguage } from "@/lib/languageContext";

export default function SetupPage() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  
  const [firebaseApiKey, setFirebaseApiKey] = useState("");
  const [firebaseProjectId, setFirebaseProjectId] = useState("");
  const [firebaseAppId, setFirebaseAppId] = useState("");
  const [firebaseAuthDomain, setFirebaseAuthDomain] = useState("");
  const [firebaseStorageBucket, setFirebaseStorageBucket] = useState("");
  const [firebaseMessagingSenderId, setFirebaseMessagingSenderId] = useState("");
  const [firebaseMeasurementId, setFirebaseMeasurementId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firebaseApiKey || !firebaseProjectId || !firebaseAppId || !firebaseAuthDomain) {
      toast.error(language === "ar" ? "الحقول المطلوبة فارغة" : "Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Initialize Firebase with the provided credentials
      const firebaseConfig = {
        apiKey: firebaseApiKey,
        authDomain: firebaseAuthDomain,
        projectId: firebaseProjectId,
        storageBucket: firebaseStorageBucket || "",
        messagingSenderId: firebaseMessagingSenderId || "",
        appId: firebaseAppId,
        measurementId: firebaseMeasurementId || "",
      };

      // Initialize Firebase app for this setup
      if (getApps().length === 0) {
        initializeApp(firebaseConfig);
      }

      // Step 2: Save config to Firestore
      const db = getFirestore();
      const configRef = doc(db, "settings", "firebase");
      
      await setDoc(configRef, {
        firebaseApiKey,
        firebaseProjectId,
        firebaseAppId,
        firebaseAuthDomain,
        firebaseStorageBucket,
        firebaseMessagingSenderId,
        firebaseMeasurementId,
        updatedAt: new Date(),
      });

      toast.success(language === "ar" ? "✅ تم حفظ الإعدادات بنجاح!" : "✅ Settings saved successfully!");
      
      // Reload to apply new Firebase config
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      console.error("Error saving setup:", error);
      toast.error(error.message || (language === "ar" ? "خطأ في الحفظ" : "Error saving settings"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">
              {language === "ar" ? "إعداد Firebase" : "Setup Firebase"}
            </h1>
            <p className="text-sm text-gray-600">
              {language === "ar" 
                ? "أدخل بيانات مشروع Firebase الخاص بك لبدء التطبيق"
                : "Enter your Firebase project credentials to get started"}
            </p>
          </div>

          {/* Warning */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">
                {language === "ar" ? "📍 حيث تُحفظ البيانات" : "📍 Where data is saved"}
              </p>
              <p className="text-xs text-blue-800">
                {language === "ar"
                  ? "ستُحفظ البيانات في Firestore في المستند: settings/firebase وسيشاهدها كل المستخدمين"
                  : "Data will be saved to Firestore in document: settings/firebase and all users will see it"}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            {/* API Key */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                {language === "ar" ? "API Key *" : "API Key *"}
              </label>
              <input
                type="text"
                value={firebaseApiKey}
                onChange={(e) => setFirebaseApiKey(e.target.value)}
                placeholder="AIzaSy..."
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                data-testid="input-firebase-api-key"
              />
            </div>

            {/* Project ID */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                {language === "ar" ? "Project ID *" : "Project ID *"}
              </label>
              <input
                type="text"
                value={firebaseProjectId}
                onChange={(e) => setFirebaseProjectId(e.target.value)}
                placeholder="my-project-id"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                data-testid="input-firebase-project-id"
              />
            </div>

            {/* App ID */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                {language === "ar" ? "App ID *" : "App ID *"}
              </label>
              <input
                type="text"
                value={firebaseAppId}
                onChange={(e) => setFirebaseAppId(e.target.value)}
                placeholder="1:123456789:web:abc123..."
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                data-testid="input-firebase-app-id"
              />
            </div>

            {/* Auth Domain */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                {language === "ar" ? "Auth Domain *" : "Auth Domain *"}
              </label>
              <input
                type="text"
                value={firebaseAuthDomain}
                onChange={(e) => setFirebaseAuthDomain(e.target.value)}
                placeholder="my-project.firebaseapp.com"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                data-testid="input-firebase-auth-domain"
              />
            </div>

            {/* Storage Bucket */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                {language === "ar" ? "Storage Bucket" : "Storage Bucket"}
              </label>
              <input
                type="text"
                value={firebaseStorageBucket}
                onChange={(e) => setFirebaseStorageBucket(e.target.value)}
                placeholder="my-project.appspot.com"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                data-testid="input-firebase-storage-bucket"
              />
            </div>

            {/* Messaging Sender ID */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                {language === "ar" ? "Messaging Sender ID" : "Messaging Sender ID"}
              </label>
              <input
                type="text"
                value={firebaseMessagingSenderId}
                onChange={(e) => setFirebaseMessagingSenderId(e.target.value)}
                placeholder="123456789"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                data-testid="input-firebase-messaging-sender-id"
              />
            </div>

            {/* Measurement ID */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                {language === "ar" ? "Measurement ID" : "Measurement ID"}
              </label>
              <input
                type="text"
                value={firebaseMeasurementId}
                onChange={(e) => setFirebaseMeasurementId(e.target.value)}
                placeholder="G-XXXXX"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                data-testid="input-firebase-measurement-id"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="button-save-setup"
            >
              <Save className="w-4 h-4" />
              {isLoading 
                ? (language === "ar" ? "جاري الحفظ..." : "Saving...") 
                : (language === "ar" ? "حفظ الإعدادات" : "Save Settings")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
