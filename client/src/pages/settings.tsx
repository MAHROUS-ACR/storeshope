import { useState, useEffect } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Database, Save, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { saveFirebaseConfig, getFirebaseConfig, clearFirebaseConfig } from "@/lib/firebaseConfig";

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  
  // Server-side Firebase config
  const [projectId, setProjectId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  
  // Client-side Firebase Auth config
  const [firebaseApiKey, setFirebaseApiKey] = useState("");
  const [firebaseProjectId, setFirebaseProjectId] = useState("");
  const [firebaseAppId, setFirebaseAppId] = useState("");
  const [firebaseAuthDomain, setFirebaseAuthDomain] = useState("");
  const [firebaseStorageBucket, setFirebaseStorageBucket] = useState("");
  const [firebaseMessagingSenderId, setFirebaseMessagingSenderId] = useState("");
  const [firebaseMeasurementId, setFirebaseMeasurementId] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);

  // Load Firebase config from server and localStorage on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // First, try to fetch from server (environment variables)
        const response = await fetch("/api/firebase/config");
        if (response.ok) {
          const serverConfig = await response.json();
          setProjectId(serverConfig.projectId || "");
          setPrivateKey(serverConfig.privateKey || "");
          setClientEmail(serverConfig.clientEmail || "");
          setFirebaseApiKey(serverConfig.firebaseApiKey || "");
          setFirebaseProjectId(serverConfig.firebaseProjectId || "");
          setFirebaseAppId(serverConfig.firebaseAppId || "");
          setFirebaseAuthDomain(serverConfig.firebaseAuthDomain || "");
          setFirebaseStorageBucket(serverConfig.firebaseStorageBucket || "");
          setFirebaseMessagingSenderId(serverConfig.firebaseMessagingSenderId || "");
          setFirebaseMeasurementId(serverConfig.firebaseMeasurementId || "");
        }
      } catch (error) {
        console.error("Failed to load Firebase config from server:", error);
      }

      // Also check localStorage for any locally saved config
      const localConfig = getFirebaseConfig();
      if (localConfig) {
        setFirebaseApiKey(localConfig.apiKey || "");
        setFirebaseProjectId(localConfig.projectId || "");
        setFirebaseAppId(localConfig.appId || "");
        setFirebaseAuthDomain(localConfig.authDomain || "");
        setFirebaseStorageBucket(localConfig.storageBucket || "");
        setFirebaseMessagingSenderId(localConfig.messagingSenderId || "");
        setFirebaseMeasurementId(localConfig.measurementId || "");
      }
    };

    loadConfig();
  }, []);

  const handleSaveServerConfig = async () => {
    if (!projectId || !privateKey || !clientEmail) {
      toast.error("Please fill in all Firebase configuration fields");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/firebase/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          privateKey,
          clientEmail,
        }),
      });

      if (response.ok) {
        toast.success("Firebase configuration saved successfully!");
        setProjectId("");
        setPrivateKey("");
        setClientEmail("");
        // Redirect to home and trigger data reload
        setTimeout(() => setLocation("/"), 500);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to save configuration");
      }
    } catch (error) {
      toast.error("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAuthConfig = () => {
    if (!firebaseApiKey || !firebaseProjectId || !firebaseAppId) {
      toast.error("Please fill in all Firebase Authentication fields");
      return;
    }

    try {
      saveFirebaseConfig({
        apiKey: firebaseApiKey,
        projectId: firebaseProjectId,
        appId: firebaseAppId,
        authDomain: firebaseAuthDomain,
        storageBucket: firebaseStorageBucket,
        messagingSenderId: firebaseMessagingSenderId,
        measurementId: firebaseMeasurementId,
      });
      toast.success("Firebase Authentication settings saved!");
    } catch (error) {
      toast.error("Failed to save authentication settings");
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
  };

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pb-4 pt-2 flex items-center gap-4 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setLocation("/")}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Firebase Settings</h1>
            <p className="text-xs text-muted-foreground">Configure your data store</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 w-full">
          <div className="w-full px-6 py-6">
            {/* Server Config Section */}
            <div className="mb-8">
              <h2 className="text-lg font-bold mb-4">Firebase Data Configuration</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-900 mb-1">Setup Instructions</p>
                    <ol className="text-blue-800 space-y-1 list-decimal list-inside text-xs leading-relaxed">
                      <li>Go to Firebase Console → Project Settings</li>
                      <li>Navigate to Service Accounts tab</li>
                      <li>Click "Generate New Private Key"</li>
                      <li>Copy the values from the JSON file below</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="projectId">
                    Project ID
                  </label>
                  <input
                    id="projectId"
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="your-project-id"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-project-id"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="clientEmail">
                    Client Email
                  </label>
                  <input
                    id="clientEmail"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-client-email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="privateKey">
                    Private Key
                  </label>
                  <textarea
                    id="privateKey"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                    rows={6}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-xs resize-none"
                    data-testid="input-private-key"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Include the full key with BEGIN and END markers
                  </p>
                </div>

                <button
                  onClick={handleSaveServerConfig}
                  disabled={isLoading}
                  className="w-full bg-black text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-save-config"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Configuration
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Client Auth Config Section */}
            <div className="mt-8 pt-8 border-t border-gray-200">
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
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="input-firebase-measurement-id"
                  />
                </div>

                <button
                  onClick={handleSaveAuthConfig}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                  data-testid="button-save-auth-config"
                >
                  <Save className="w-5 h-5" />
                  Save Authentication Settings
                </button>

                {firebaseApiKey && (
                  <button
                    onClick={handleClearAuthConfig}
                    className="w-full bg-red-50 text-red-600 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 border border-red-200 hover:bg-red-100 transition-colors"
                    data-testid="button-clear-auth-config"
                  >
                    <LogOut className="w-5 h-5" />
                    Clear Settings
                  </button>
                )}
              </div>
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
