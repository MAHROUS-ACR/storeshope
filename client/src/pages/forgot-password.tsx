import { useState } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { getAuth } from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";

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

function initApp() {
  if (!getApps().length) {
    initializeApp(getFirebaseConfig());
  }
  return getAuth();
}

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!email.trim()) {
        toast.error("Please enter your email");
        setIsLoading(false);
        return;
      }

      const auth = initApp();
      await sendPasswordResetEmail(auth, email);
      setIsSent(true);
      toast.success("✅ تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني");
      
      setTimeout(() => setLocation("/login"), 3000);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        toast.error("البريد الإلكتروني غير مسجل");
      } else if (error.code === "auth/invalid-email") {
        toast.error("البريد الإلكتروني غير صحيح");
      } else {
        toast.error(error.message || "حدث خطأ");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col px-5 pb-20">
        {/* Header with back button */}
        <div className="pt-4 pb-6">
          <button
            onClick={() => setLocation("/login")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>عودة</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center mb-8 w-full">
            <h1 className="text-2xl font-bold mb-2">💌 استعادة كلمة المرور</h1>
            <p className="text-muted-foreground text-sm">
              {isSent
                ? "تحقق من بريدك الإلكتروني للحصول على رابط التعيين"
                : "أدخل بريدك الإلكتروني وسنرسل لك رابط استعادة كلمة المرور"}
            </p>
          </div>

          {!isSent ? (
            <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" htmlFor="email">
                  البريد الإلكتروني
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="أدخل بريدك الإلكتروني"
                  className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  data-testid="input-email"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-send-reset"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  "إرسال رابط التعيين"
                )}
              </button>
            </form>
          ) : (
            <div className="w-full max-w-xs bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
              <p className="text-green-700 font-semibold">✅ تم الإرسال بنجاح!</p>
              <p className="text-sm text-green-600 mt-2">سيتم إعادة توجيهك إلى صفحة تسجيل الدخول...</p>
            </div>
          )}
        </div>
      </div>
    </MobileWrapper>
  );
}
