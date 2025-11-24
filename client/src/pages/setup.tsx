import { useState } from "react";
import { useLocation } from "wouter";
import { Save, AlertCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
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
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const configObject = {
    configured: true,
    firebaseApiKey,
    firebaseProjectId,
    firebaseAppId,
    firebaseAuthDomain,
    firebaseStorageBucket,
    firebaseMessagingSenderId,
    firebaseMeasurementId,
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firebaseApiKey || !firebaseProjectId || !firebaseAppId || !firebaseAuthDomain) {
      toast.error(language === "ar" ? "الحقول المطلوبة فارغة" : "Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      // Show the config object to copy manually
      const configJson = JSON.stringify(configObject, null, 2);
      console.log("📋 Config to save in public/firebase-config.json:");
      console.log(configJson);

      // Copy to clipboard
      await navigator.clipboard.writeText(configJson);
      toast.success(language === "ar" ? "✅ تم نسخ الكود! الصقه في public/firebase-config.json" : "✅ Config copied! Paste it in public/firebase-config.json");
      
      // Reload after a moment
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(language === "ar" ? "خطأ في النسخ" : "Error copying config");
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
                ? "أدخل بيانات مشروعك وحفظها في ملف firebase-config.json"
                : "Enter your Firebase credentials and save to firebase-config.json"}
            </p>
          </div>

          {/* Info Box */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-2">
                {language === "ar" ? "📍 طريقة الحفظ" : "📍 How to save"}
              </p>
              <ol className="text-xs text-blue-800 list-decimal list-inside space-y-1">
                <li>{language === "ar" ? "أملأ الحقول أدناه" : "Fill in the fields below"}</li>
                <li>{language === "ar" ? "اضغط 'حفظ' - سينسخ الكود تلقائياً" : "Click 'Save' - config will auto-copy"}</li>
                <li>{language === "ar" ? "افتح: public/firebase-config.json" : "Open: public/firebase-config.json"}</li>
                <li>{language === "ar" ? "الصق الكود (Ctrl+V)" : "Paste the config (Ctrl+V)"}</li>
                <li>{language === "ar" ? "احفظ الملف" : "Save the file"}</li>
              </ol>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            {/* API Key */}
            <div>
              <label className="block text-sm font-semibold mb-2">API Key *</label>
              <input
                type="text"
                value={firebaseApiKey}
                onChange={(e) => setFirebaseApiKey(e.target.value)}
                placeholder="AIzaSy..."
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Project ID */}
            <div>
              <label className="block text-sm font-semibold mb-2">Project ID *</label>
              <input
                type="text"
                value={firebaseProjectId}
                onChange={(e) => setFirebaseProjectId(e.target.value)}
                placeholder="my-project-id"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* App ID */}
            <div>
              <label className="block text-sm font-semibold mb-2">App ID *</label>
              <input
                type="text"
                value={firebaseAppId}
                onChange={(e) => setFirebaseAppId(e.target.value)}
                placeholder="1:123456789:web:abc123..."
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Auth Domain */}
            <div>
              <label className="block text-sm font-semibold mb-2">Auth Domain *</label>
              <input
                type="text"
                value={firebaseAuthDomain}
                onChange={(e) => setFirebaseAuthDomain(e.target.value)}
                placeholder="my-project.firebaseapp.com"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Storage Bucket */}
            <div>
              <label className="block text-sm font-semibold mb-2">Storage Bucket</label>
              <input
                type="text"
                value={firebaseStorageBucket}
                onChange={(e) => setFirebaseStorageBucket(e.target.value)}
                placeholder="my-project.appspot.com"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Messaging Sender ID */}
            <div>
              <label className="block text-sm font-semibold mb-2">Messaging Sender ID</label>
              <input
                type="text"
                value={firebaseMessagingSenderId}
                onChange={(e) => setFirebaseMessagingSenderId(e.target.value)}
                placeholder="123456789"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Measurement ID */}
            <div>
              <label className="block text-sm font-semibold mb-2">Measurement ID</label>
              <input
                type="text"
                value={firebaseMeasurementId}
                onChange={(e) => setFirebaseMeasurementId(e.target.value)}
                placeholder="G-XXXXX"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isLoading 
                ? (language === "ar" ? "جاري النسخ..." : "Copying...") 
                : (language === "ar" ? "حفظ الإعدادات" : "Save & Copy")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
