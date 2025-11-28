import { useState, useEffect } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { useLocation } from "wouter";
import { useUser } from "@/lib/userContext";
import { useLanguage } from "@/lib/languageContext";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { t } from "@/lib/translations";
import { getStoreSettings } from "@/lib/firebaseOps";
import { setUserId } from "@/lib/oneSignalService";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login, signup, isLoading } = useUser();
  const { language } = useLanguage();

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [storeLogo, setStoreLogo] = useState("");
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    const loadStoreSettings = async () => {
      try {
        const settings = await getStoreSettings();
        if (settings?.logo) setStoreLogo(settings.logo);
        if (settings?.name) setStoreName(settings.name);
      } catch (error) {
        // Silent fail
      }
    };
    loadStoreSettings();
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
        // Register user in OneSignal after successful login (if they have push subscription)
        const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        if (authUser?.id) {
          await setUserId(authUser.id);
        }
        toast.success(t("welcomeBack", language));
      }
      // Wait for user data to be set before redirecting
      setTimeout(() => setLocation("/"), 800);
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
            data-testid="button-back"
          >
            <ArrowLeft size={20} />
            <span>{t("back", language)}</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          {/* Store Logo and Name */}
          {storeLogo && (
            <div className="flex justify-center mb-6">
              <img src={storeLogo} alt={storeName} className="h-16 object-contain" />
            </div>
          )}

          <h1 className="text-2xl font-bold text-center mb-2" data-testid="text-title">
            {isSignup ? t("accountCreated", language) : t("welcomeBack", language)}
          </h1>
          <p className="text-gray-600 text-center mb-8" data-testid="text-subtitle">
            {isSignup ? t("accountCreated", language) : t("welcomeBack", language)}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-username">
                  {t("username", language)}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                  placeholder={t("username", language)}
                  data-testid="input-username"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-email">
                {t("email", language)}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder={t("email", language)}
                data-testid="input-email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-password">
                {t("password", language)}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder={t("password", language)}
                data-testid="input-password"
              />
            </div>

            <button
              type="submit"
              disabled={formLoading}
              className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
              data-testid="button-submit"
            >
              {formLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("loading", language)}
                </div>
              ) : isSignup ? (
                t("add", language)
              ) : (
                t("checkout", language)
              )}
            </button>
          </form>

          {!isSignup && (
            <button
              onClick={() => setLocation("/forgot-password")}
              className="text-center text-primary text-sm mt-4 hover:underline"
              data-testid="link-forgot-password"
            >
              {t("forgotPassword", language)}
            </button>
          )}

          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm" data-testid="text-toggle-prompt">
              {isSignup ? t("email", language) : t("email", language)}
            </p>
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setEmail("");
                setPassword("");
                setUsername("");
              }}
              className="text-primary font-medium hover:underline mt-2"
              data-testid="button-toggle-form"
            >
              {isSignup ? t("back", language) : t("checkout", language)}
            </button>
          </div>
        </div>
      </div>
    </MobileWrapper>
  );
}
