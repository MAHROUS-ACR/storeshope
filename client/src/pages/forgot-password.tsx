import { useState } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { useLocation } from "wouter";
import { useLanguage } from "@/lib/languageContext";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { t } from "@/lib/translations";
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
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!email.trim()) {
        toast.error(t("enterYourEmail", language));
        setIsLoading(false);
        return;
      }

      const auth = initApp();
      await sendPasswordResetEmail(auth, email);
      setIsSent(true);
      toast.success(t("resetLinkSent", language));
      
      setTimeout(() => setLocation("/login"), 3000);
    } catch (error: any) {
      console.error("Password reset error:", error);
      if (error.code === "auth/user-not-found") {
        toast.error(t("emailNotFound", language));
      } else if (error.code === "auth/invalid-email") {
        toast.error(t("invalidEmail", language));
      } else if (error.message?.includes("email-not-configured")) {
        toast.error(language === "ar" ? "البريد غير مفعل في إعدادات Firebase" : "Email not configured in Firebase settings");
      } else {
        toast.error(error.message || (language === "ar" ? "خطأ في الإرسال" : "Failed to send reset email"));
        console.error("Full error:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col px-5 pb-20">
        {/* Header with Navigation Back Button */}
        <div className="pt-4 pb-6 border-b border-gray-100">
          <button
            onClick={() => setLocation("/login")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition font-semibold"
            data-testid="button-nav-back"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t("back", language)}</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center mb-8 w-full">
            <h1 className="text-2xl font-bold mb-2">💌 {t("resetPassword", language)}</h1>
            <p className="text-muted-foreground text-sm">
              {isSent
                ? t("checkEmail", language)
                : (language === "ar" 
                    ? "أدخل بريدك الإلكتروني وسنرسل لك رابط استعادة كلمة المرور"
                    : "Enter your email and we'll send you a password reset link")}
            </p>
          </div>

          {!isSent ? (
            <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" htmlFor="email">
                  {t("email", language) || "Email"}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("enterEmail", language)}
                  className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  data-testid="input-reset-email"
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
                    {t("loading", language)}
                  </>
                ) : (
                  t("sendResetLink", language)
                )}
              </button>
            </form>
          ) : (
            <div className="w-full max-w-xs bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
              <p className="text-green-700 font-semibold">{t("resetLinkSent", language)}</p>
              <p className="text-sm text-green-600 mt-2">{t("redirectingToLogin", language)}</p>
            </div>
          )}
        </div>
      </div>
    </MobileWrapper>
  );
}
