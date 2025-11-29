import { useEffect, useState } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, MapPin, Phone, User, CreditCard, Truck, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";

interface DeliveryOrderInfo {
  id: string;
  orderNumber?: number;
  total: number;
  subtotal?: number;
  discountedTotal?: number;
  discountAmount?: number;
  shippingCost?: number;
  status: string;
  createdAt: string;
  deliveryUsername?: string;
  recipientName?: string;
  shippingAddress?: string;
  shippingPhone?: string;
  shippingZone?: string;
  shippingType?: string;
  paymentMethod?: string;
  notes?: string;
  deliveryRemarks?: string;
  items?: any[];
  customerName?: string;
}

export default function DeliveryOrderInfoPage() {
  const [location, setLocation] = useLocation();
  const { language } = useLanguage();
  const [order, setOrder] = useState<DeliveryOrderInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const orderId = location.split("/delivery-order-info/")[1]?.split("?")[0];

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        setIsLoading(false);
        return;
      }

      try {
        const db = getFirestore();
        const orderRef = doc(db, "orders", orderId);
        const snapshot = await getDoc(orderRef);
        if (snapshot.exists()) {
          setOrder({ id: snapshot.id, ...snapshot.data() } as DeliveryOrderInfo);
        }
      } catch (error) {
        console.error("Failed to load order:", error);
        toast.error(language === "ar" ? "فشل تحميل الطلب" : "Failed to load order");
      } finally {
        setIsLoading(false);
      }
    };

    loadOrder();
  }, [orderId, language]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "shipped": return "bg-blue-100 text-blue-700";
      case "received": return "bg-green-100 text-green-700";
      case "completed": return "bg-emerald-100 text-emerald-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <MobileWrapper>
      {isLoading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : order ? (
        <div className="flex flex-col h-screen relative">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
            <div className="px-5 py-4 flex items-center gap-3">
              <button onClick={() => setLocation("/delivery")} className="text-gray-600 hover:text-gray-900">
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-xl font-bold text-gray-900">{language === "ar" ? "بيانات الطلب" : "Order Details"}</h1>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 pb-24">
            {/* Order Number and Status */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-gray-900">Order #{order.orderNumber || "N/A"}</p>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
                  {t(order.status as any, language)}
                </span>
              </div>
              <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
              {order.deliveryUsername && <p className="text-xs text-orange-600 font-semibold mt-1">🚚 {order.deliveryUsername}</p>}
            </div>

            {/* Customer Info */}
            {(order.customerName || order.recipientName) && (
              <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">{language === "ar" ? "العميل" : "Customer"}</p>
                <div className="flex items-start gap-3">
                  <User size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{order.customerName || order.recipientName || "N/A"}</p>
                    {order.recipientName && order.recipientName !== order.customerName && (
                      <p className="text-xs text-gray-600 mt-1">{language === "ar" ? "المستقبل: " : "Recipient: "}{order.recipientName}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Address */}
            {order.shippingAddress && (
              <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">{language === "ar" ? "العنوان" : "Address"}</p>
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-900">{order.shippingAddress}</p>
                </div>
              </div>
            )}

            {/* Phone */}
            {order.shippingPhone && (
              <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">{language === "ar" ? "الهاتف" : "Phone"}</p>
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-green-500" />
                  <a href={`tel:${order.shippingPhone}`} className="text-sm text-blue-600 hover:underline">{order.shippingPhone}</a>
                </div>
              </div>
            )}

            {/* Items */}
            {order.items && order.items.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-4">
                <p className="text-xs font-semibold text-gray-600 mb-3">{language === "ar" ? "المنتجات" : "Items"}</p>
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start pb-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.name || "Product"}</p>
                        <p className="text-xs text-gray-500">x{item.quantity || 1}</p>
                      </div>
                      <p className="text-sm font-semibold text-orange-600">L.E {(item.price || 0).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 mb-4">
              <div className="space-y-2">
                {order.subtotal && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{language === "ar" ? "المجموع الجزئي" : "Subtotal"}</span>
                    <span className="font-semibold text-gray-900">L.E {order.subtotal.toFixed(2)}</span>
                  </div>
                )}
                {order.discountAmount && order.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>{language === "ar" ? "الخصم" : "Discount"}</span>
                    <span>-L.E {order.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {order.shippingCost && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{language === "ar" ? "الشحن" : "Shipping"}</span>
                    <span className="font-semibold text-gray-900">L.E {order.shippingCost.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-semibold text-gray-900">{language === "ar" ? "الإجمالي" : "Total"}</span>
                  <span className="text-lg font-bold text-orange-600">L.E {order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            {order.paymentMethod && (
              <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">{language === "ar" ? "طريقة الدفع" : "Payment Method"}</p>
                <div className="flex items-center gap-3">
                  <CreditCard size={18} className="text-purple-500" />
                  <p className="text-sm text-gray-900">{order.paymentMethod}</p>
                </div>
              </div>
            )}

            {/* Delivery Remarks */}
            {order.deliveryRemarks && (
              <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">{language === "ar" ? "ملاحظات التسليم" : "Delivery Remarks"}</p>
                <div className="flex items-start gap-3">
                  <FileText size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-900">{order.deliveryRemarks}</p>
                </div>
              </div>
            )}

            {/* Notes */}
            {order.notes && (
              <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">{language === "ar" ? "ملاحظات" : "Notes"}</p>
                <p className="text-sm text-gray-900">{order.notes}</p>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0">
            <BottomNav />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-gray-500">{t("orderNotFound", language)}</p>
          </div>
        </div>
      )}
    </MobileWrapper>
  );
}
