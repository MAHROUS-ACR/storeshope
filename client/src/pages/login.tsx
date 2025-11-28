import { useState, useEffect } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { useLocation } from "wouter";
import { useUser } from "@/lib/userContext";
import { useLanguage } from "@/lib/languageContext";
import { toast } from "sonner";
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
        if (settings) {
          setStoreName(settings.storeName || "متجرنا");
          setStoreLogo(settings.storeLogo || "");
        }
      } catch (error) {
        console.log("Could not fetch store settings");
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
          toast.error("Please fill in all fields");
          setFormLoading(false);
          return;
        }
        if (password.length < 6) {
          toast.error("Password must be at least 6 characters");
          setFormLoading(false);
          return;
        }
        await signup(email, password, username);
        toast.success("Account created successfully!");
      } else {
        if (!email.trim() || !password.trim()) {
          toast.error("Please fill in all fields");
          setFormLoading(false);
          return;
        }
        await login(email, password);
        toast.success("Welcome back!");
      }
      // Wait for user data to be set before redirecting
      setTimeout(() => setLocation("/"), 1000);
    } catch (error: any) {

      if (error.code === "auth/email-already-in-use") {
        toast.error("Email already exists");
      } else if (error.code === "auth/weak-password") {
        toast.error("Password is too weak");
      } else if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        toast.error("Invalid email or password");
      } else {
        toast.error(error.message || "Authentication failed");
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
      <div className="w-full flex-1 flex flex-col items-center justify-center px-5 pb-20">
        <div className="text-center mb-8">
          {storeLogo && (
            <img src={storeLogo} alt={storeName} className="h-16 mx-auto mb-3 object-contain" data-testid="img-store-logo" />
          )}
          <h1 className="text-3xl font-bold mb-2">{storeName}</h1>
          <p className="text-muted-foreground">
            {isSignup ? (language === "ar" ? "إنشاء حساب" : "Create an account") : (language === "ar" ? "أهلاً وسهلاً" : "Welcome back")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm font-semibold mb-2" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                data-testid="input-username"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              data-testid="input-email"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              data-testid="input-password"
            />
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="w-full bg-black text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid={`button-L.E isSignup ? "signup" : "login"}`}
          >
            {formLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isSignup ? "Creating account..." : "Signing in..."}
              </>
            ) : isSignup ? (
              "Sign Up"
            ) : (
              "Sign In"
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
    </MobileWrapper>
  );
}
