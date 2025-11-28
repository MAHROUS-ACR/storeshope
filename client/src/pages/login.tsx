import { useState, useEffect } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { useLocation } from "wouter";
import { useUser } from "@/lib/userContext";
import { useLanguage } from "@/lib/languageContext";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { t } from "@/lib/translations";
import { getStoreSettings } from "@/lib/firebaseOps";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login, signup, isLoading } = useUser();
  const { language } = useLanguage();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [storeName, setStoreName] = useState("متجرنا");
  const [storeLogo, setStoreLogo] = useState("");

  useEffect(() => {
    const fetchStoreInfo = async () => {
      try {
        const settings = await getStoreSettings();
        console.log("Store settings fetched from Firestore:", settings);
        if (settings) {
          // Handle both naming conventions (storeName/name, storeLogo/logo)
          const name = settings.storeName || settings.name;
          const logo = settings.storeLogo || settings.logo;
          
          if (name) setStoreName(name);
          if (logo) setStoreLogo(logo);
          
          console.log("Applied store name:", name);
          console.log("Applied store logo:", logo);
        } else {
          console.warn("No store settings found in Firestore");
        }
      } catch (error) {
        console.error("Error fetching store settings:", error);
      }
    };
    fetchStoreInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      if (isSignup) {
        if (!email.trim() || !password.trim() || !username.trim()) {
          toast.error(t("fillAllFields", language));
          setFormLoading(false);
          return;
        }
        if (password.length < 6) {
          toast.error(t("passwordTooShort", language));
          setFormLoading(false);
          return;
        }
        await signup(email, password, username);
        toast.success(t("accountCreated", language));
      } else {
        if (!email.trim() || !password.trim()) {
          toast.error(t("fillAllFields", language));
          setFormLoading(false);
          return;
        }
        await login(email, password);
        toast.success(t("welcomeBack", language));
      }
      // Wait for user data to be set before redirecting
      setTimeout(() => setLocation("/"), 1000);
    } catch (error: any) {

      if (error.code === "auth/email-already-in-use") {
        toast.error(t("emailExists", language));
      } else if (error.code === "auth/weak-password") {
        toast.error(t("passwordWeak", language));
      } else if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        toast.error(t("invalidEmailPassword", language));
      } else {
        toast.error(error.message || t("authFailed", language));
      }
    } finally {
      setFormLoading(false);
    }
  };

  if (isLoading) {
    return (
      <MobileWrapper>
        <div className="w-full flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </MobileWrapper>
    );
  }

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col px-5 pb-20">
        {/* Navigation Back Button */}
        <div className="pt-4 pb-6 border-b border-gray-100">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition font-semibold"
            data-testid="button-nav-home"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t("back", language)}</span>
          </button>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center mb-8">
          {storeLogo ? (
            <img src={storeLogo} alt={storeName} className="h-16 mx-auto mb-3 object-contain rounded-lg" data-testid="img-store-logo" />
          ) : (
            <div className="h-16 mx-auto mb-3 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-2xl font-bold">🏪</span>
            </div>
          )}
          <h1 className="text-3xl font-bold mb-2" data-testid="text-store-name">{storeName || "متجرنا"}</h1>
          <p className="text-muted-foreground">
            {isSignup ? (language === "ar" ? "إنشاء حساب" : "Create an account") : (language === "ar" ? "أهلاً وسهلاً" : "Welcome back")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm font-semibold mb-2" htmlFor="username">
                {t("username", language)}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={language === "ar" ? "أدخل اسمك" : "Enter your name"}
                className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                data-testid="input-username"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2" htmlFor="email">
              {t("email", language)}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={language === "ar" ? "أدخل بريدك الإلكتروني" : "Enter your email"}
              className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              data-testid="input-email"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" htmlFor="password">
              {t("password", language)}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={language === "ar" ? "أدخل كلمة المرور" : "Enter your password"}
              className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              data-testid="input-password"
            />
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="w-full bg-black text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid={isSignup ? "button-signup" : "button-login"}
          >
            {formLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {language === "ar" 
                  ? (isSignup ? "جاري الإنشاء..." : "جاري تسجيل الدخول...")
                  : (isSignup ? "Creating account..." : "Signing in...")}
              </>
            ) : isSignup ? (
              t("signUp", language)
            ) : (
              t("signIn", language)
            )}
          </button>
        </form>

        <div className="w-full space-y-2 mt-6">
          <button
            onClick={() => {
              setIsSignup(!isSignup);
              setEmail("");
              setPassword("");
              setUsername("");
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-center"
            data-testid="button-toggle-auth"
          >
            {isSignup
              ? (language === "ar" ? "لديك حساب بالفعل؟ تسجيل الدخول" : "Already have an account? Sign in")
              : (language === "ar" ? "ليس لديك حساب؟ إنشاء حساب" : "Don't have an account? Sign up")}
          </button>
          
          {!isSignup && (
            <button
              onClick={() => setLocation("/forgot-password")}
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors w-full text-center"
              data-testid="button-forgot-password"
            >
              {language === "ar" ? "هل نسيت كلمة المرور؟" : "Forgot your password?"}
            </button>
          )}
        </div>
        </div>
      </div>
    </MobileWrapper>
  );
}
