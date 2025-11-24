import { useState } from "react";
import { Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/languageContext";

export default function SetupPage() {
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
      toast.error(language === "ar" ? "الحقول المطلوبة فارغة" : "Please fill in required fields");
      return;
    }

    setIsLoading(true);
    
    try {
      // Copy env vars format to clipboard
      const envVars = `VITE_FIREBASE_API_KEY=${firebaseApiKey}
VITE_FIREBASE_PROJECT_ID=${firebaseProjectId}
VITE_FIREBASE_APP_ID=${firebaseAppId}
VITE_FIREBASE_AUTH_DOMAIN=${firebaseAuthDomain}
VITE_FIREBASE_STORAGE_BUCKET=${firebaseStorageBucket}
VITE_FIREBASE_MESSAGING_SENDER_ID=${firebaseMessagingSenderId}
VITE_FIREBASE_MEASUREMENT_ID=${firebaseMeasurementId}`;

      await navigator.clipboard.writeText(envVars);
      
      toast.success(language === "ar" 
        ? "✅ تم نسخ البيانات! أضفها في Secrets" 
        : "✅ Copied! Add to Secrets tab");
      
      // Show instructions
      setTimeout(() => {
        alert(language === "ar" 
          ? "📌 الخطوات:\n1. انقر على 🔑 Secrets على اليسار\n2. أضف كل سطر كـ Secret منفصل\n3. أعد تحميل الصفحة"
          : "📌 Steps:\n1. Click 🔑 Secrets on left\n2. Add each line as a Secret\n3. Refresh page");
      }, 500);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(language === "ar" ? "خطأ" : "Error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">
              {language === "ar" ? "إعداد Firebase" : "Setup Firebase"}
            </h1>
            <p className="text-sm text-gray-600">
              {language === "ar" 
                ? "أدخل البيانات ثم أضفها في Secrets"
                : "Enter credentials and add to Secrets tab"}
            </p>
          </div>

          {/* Info Box */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-2">
                {language === "ar" ? "🔐 أضف البيانات في Secrets" : "🔐 Add to Secrets"}
              </p>
              <ol className="text-xs text-blue-800 list-decimal list-inside space-y-1">
                <li>{language === "ar" ? "أملأ الحقول أدناه" : "Fill the fields"}</li>
                <li>{language === "ar" ? "اضغط 'حفظ'" : "Click 'Save'"}</li>
                <li>{language === "ar" ? "انسخ النص الذي سينسخ تلقائياً" : "Copy will auto-copy"}</li>
                <li>{language === "ar" ? "افتح 🔑 Secrets من اليسار" : "Open 🔑 Secrets tab"}</li>
                <li>{language === "ar" ? "أضف كل سطر كـ Secret منفصل" : "Add each line as Secret"}</li>
                <li>{language === "ar" ? "أعد تحميل الصفحة" : "Refresh page"}</li>
              </ol>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            {/* Required Fields */}
            <div className="bg-yellow-50 p-3 rounded-lg mb-4">
              <p className="text-xs font-semibold text-yellow-900">* {language === "ar" ? "حقول مطلوبة" : "Required"}</p>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-semibold mb-2">VITE_FIREBASE_API_KEY *</label>
              <input
                type="text"
                value={firebaseApiKey}
                onChange={(e) => setFirebaseApiKey(e.target.value)}
                placeholder="AIzaSy..."
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
              />
            </div>

            {/* Project ID */}
            <div>
              <label className="block text-sm font-semibold mb-2">VITE_FIREBASE_PROJECT_ID *</label>
              <input
                type="text"
                value={firebaseProjectId}
                onChange={(e) => setFirebaseProjectId(e.target.value)}
                placeholder="my-project-id"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
              />
            </div>

            {/* App ID */}
            <div>
              <label className="block text-sm font-semibold mb-2">VITE_FIREBASE_APP_ID *</label>
              <input
                type="text"
                value={firebaseAppId}
                onChange={(e) => setFirebaseAppId(e.target.value)}
                placeholder="1:123456789:web:abc123..."
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
              />
            </div>

            {/* Auth Domain */}
            <div>
              <label className="block text-sm font-semibold mb-2">VITE_FIREBASE_AUTH_DOMAIN *</label>
              <input
                type="text"
                value={firebaseAuthDomain}
                onChange={(e) => setFirebaseAuthDomain(e.target.value)}
                placeholder="my-project.firebaseapp.com"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
              />
            </div>

            {/* Optional Fields */}
            <div className="bg-gray-50 p-3 rounded-lg mt-6 mb-4">
              <p className="text-xs font-semibold text-gray-900">{language === "ar" ? "حقول اختيارية" : "Optional"}</p>
            </div>

            {/* Storage Bucket */}
            <div>
              <label className="block text-sm font-semibold mb-2">VITE_FIREBASE_STORAGE_BUCKET</label>
              <input
                type="text"
                value={firebaseStorageBucket}
                onChange={(e) => setFirebaseStorageBucket(e.target.value)}
                placeholder="my-project.appspot.com"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
              />
            </div>

            {/* Messaging Sender ID */}
            <div>
              <label className="block text-sm font-semibold mb-2">VITE_FIREBASE_MESSAGING_SENDER_ID</label>
              <input
                type="text"
                value={firebaseMessagingSenderId}
                onChange={(e) => setFirebaseMessagingSenderId(e.target.value)}
                placeholder="123456789"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
              />
            </div>

            {/* Measurement ID */}
            <div>
              <label className="block text-sm font-semibold mb-2">VITE_FIREBASE_MEASUREMENT_ID</label>
              <input
                type="text"
                value={firebaseMeasurementId}
                onChange={(e) => setFirebaseMeasurementId(e.target.value)}
                placeholder="G-XXXXX"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-8 bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isLoading 
                ? (language === "ar" ? "جاري النسخ..." : "Copying...") 
                : (language === "ar" ? "نسخ البيانات" : "Copy Credentials")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
