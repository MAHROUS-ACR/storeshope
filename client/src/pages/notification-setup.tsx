import { useState } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/lib/languageContext";

export default function NotificationSetupPage() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyToClipboard = (text: string, step: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const securityRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /notifications/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /fcmTokens/{document=**} {
      allow read, write: if true;
    }
    match /orders/{document=**} {
      allow read, write: if request.auth != null || true;
    }
    match /products/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /users/{document=**} {
      allow read, write: if request.auth != null || true;
    }
    match /discounts/{document=**} {
      allow read, write: if true;
    }
    match /categories/{document=**} {
      allow read, write: if true;
    }
    match /shippingZones/{document=**} {
      allow read, write: if true;
    }
    match /settings/{document=**} {
      allow read, write: if true;
    }
  }
}`;

  const steps = [
    {
      number: 1,
      titleAr: "افتح Firebase Console",
      titleEn: "Open Firebase Console",
      descriptionAr: "اذهب إلى console.firebase.google.com واختر مشروعك",
      descriptionEn: "Go to console.firebase.google.com and select your project",
      action: null,
    },
    {
      number: 2,
      titleAr: "اذهب إلى Firestore Database",
      titleEn: "Go to Firestore Database",
      descriptionAr: "اختر من القائمة الجانبية: Build → Firestore Database",
      descriptionEn: "Select from sidebar: Build → Firestore Database",
      action: null,
    },
    {
      number: 3,
      titleAr: "اضغط على Rules",
      titleEn: "Click on Rules",
      descriptionAr: "في أعلى الصفحة، اضغط على تبويب 'Rules'",
      descriptionEn: "At the top of the page, click on 'Rules' tab",
      action: null,
    },
    {
      number: 4,
      titleAr: "استبدل القواعس الحالية",
      titleEn: "Replace Current Rules",
      descriptionAr: "انسخ القواعس أدناه والصقها في محرر Firebase",
      descriptionEn: "Copy the rules below and paste them in Firebase editor",
      code: securityRules,
      action: (
        <button
          onClick={() => copyToClipboard(securityRules, 4)}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
        >
          {copiedStep === 4 ? (
            <>
              <Check className="w-4 h-4" />
              {language === "ar" ? "تم النسخ!" : "Copied!"}
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              {language === "ar" ? "انسخ القواعس" : "Copy Rules"}
            </>
          )}
        </button>
      ),
    },
    {
      number: 5,
      titleAr: "اضغط على Publish",
      titleEn: "Click Publish",
      descriptionAr: "اضغط على زر 'Publish' لحفظ القواعس",
      descriptionEn: "Click the 'Publish' button to save the rules",
      action: null,
    },
    {
      number: 6,
      titleAr: "فعّل Cloud Messaging",
      titleEn: "Enable Cloud Messaging",
      descriptionAr: "اذهب إلى: Build → Cloud Messaging وتأكد من أنها مفعلة",
      descriptionEn: "Go to: Build → Cloud Messaging and ensure it's enabled",
      action: null,
    },
    {
      number: 7,
      titleAr: "احصل على Server API Key",
      titleEn: "Get Server API Key",
      descriptionAr: "اذهب إلى Project Settings → Cloud Messaging وانسخ 'Server API Key'",
      descriptionEn: "Go to Project Settings → Cloud Messaging and copy 'Server API Key'",
      action: null,
    },
    {
      number: 8,
      titleAr: "اختبر الإشعارات",
      titleEn: "Test Notifications",
      descriptionAr: "عود للتطبيق وجرب إنشاء طلب جديد. سترى إشعار على الأدمن!",
      descriptionEn: "Go back to the app and try creating a new order. You'll see a notification!",
      action: (
        <button
          onClick={() => setLocation("/")}
          className="mt-3 w-full bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700"
        >
          {language === "ar" ? "العودة للتطبيق" : "Back to App"}
        </button>
      ),
    },
  ];

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col overflow-hidden bg-white">
        {/* Header */}
        <div className="px-5 pt-3 pb-4 flex items-center gap-3 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-gray-100 rounded-lg"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">
            {language === "ar" ? "إعداد الإشعارات" : "Setup Notifications"}
          </h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="px-5 py-6">
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900">
                {language === "ar"
                  ? "اتبع هذه الخطوات البسيطة لتفعيل الإشعارات في التطبيق. سيستغرق الأمر دقائق فقط!"
                  : "Follow these simple steps to enable notifications in the app. It only takes a few minutes!"}
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="border border-gray-200 rounded-lg p-4"
                  data-testid={`step-${step.number}`}
                >
                  {/* Step Number */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {step.number}
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {language === "ar" ? step.titleAr : step.titleEn}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-3">
                    {language === "ar"
                      ? step.descriptionAr
                      : step.descriptionEn}
                  </p>

                  {/* Code Block */}
                  {step.code && (
                    <div className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto mb-3 max-h-40 overflow-y-auto">
                      <pre>{step.code}</pre>
                    </div>
                  )}

                  {/* Action Button */}
                  {step.action && step.action}
                </div>
              ))}
            </div>

            {/* Support Section */}
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-900 font-semibold mb-2">
                {language === "ar" ? "هل تحتاج مساعدة؟" : "Need Help?"}
              </p>
              <p className="text-xs text-yellow-800">
                {language === "ar"
                  ? "إذا واجهت أي مشاكل، تأكد من أن Firebase مفعل وأن لديك الأذونات الكاملة"
                  : "If you have any issues, ensure Firebase is enabled and you have full permissions"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </MobileWrapper>
  );
}
