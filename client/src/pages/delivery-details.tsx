import { useEffect, useState, useRef } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, MapPin, Phone, User, CreditCard, Truck, FileText, Loader } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/lib/languageContext";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface DeliveryOrderDetails {
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
  items?: any[];
  customerName?: string;
  latitude?: number;
  longitude?: number;
}

export default function DeliveryDetailsPage() {
  const [location, setLocation] = useLocation();
  const { language } = useLanguage();
  const [order, setOrder] = useState<DeliveryOrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLat, setMapLat] = useState<number | null>(null);
  const [mapLng, setMapLng] = useState<number | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  const orderId = location.split("/delivery-order/")[1]?.split("?")[0];

  // Geocode address to get lat/lng
  const geocodeAddress = async (address: string) => {
    if (!address.trim()) return;
    setMapLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
      );
      const results = await response.json();
      if (results.length > 0) {
        setMapLat(parseFloat(results[0].lat));
        setMapLng(parseFloat(results[0].lon));
      }
    } catch (error) {
      console.log("Geocoding error:", error);
    } finally {
      setMapLoading(false);
    }
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainer.current || !mapLat || !mapLng) return;
    
    // Clear existing map
    if (map.current) {
      map.current.remove();
    }

    map.current = L.map(mapContainer.current).setView([mapLat, mapLng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map.current);

    L.marker([mapLat, mapLng])
      .addTo(map.current)
      .bindPopup(`<div style="text-align: center"><strong>${language === "ar" ? "موقع التسليم" : "Delivery Location"}</strong></div>`)
      .openPopup();
  }, [mapLat, mapLng, language]);

  // Fetch order
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      setIsLoading(true);
      try {
        const db = getFirestore();
        const orderRef = doc(db, "orders", orderId);
        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
          const data = orderSnap.data() as DeliveryOrderDetails;
          setOrder(data);
          
          // Try to get coordinates from address
          if (data.latitude && data.longitude) {
            setMapLat(data.latitude);
            setMapLng(data.longitude);
          } else {
            const addr = data.shippingAddress || (data as any).deliveryAddress || data.shippingZone || "";
            if (addr) {
              geocodeAddress(addr);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (isLoading) {
    return (
      <MobileWrapper>
        <div className="w-full flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </MobileWrapper>
    );
  }

  if (!order) {
    return (
      <MobileWrapper>
        <div className="w-full flex-1 flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100">
            <button onClick={() => setLocation("/delivery")} className="flex items-center gap-2">
              <ArrowLeft size={20} />
              <span>{language === "ar" ? "رجوع" : "Back"}</span>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p>{language === "ar" ? "لم يتم العثور على الطلب" : "Order not found"}</p>
          </div>
        </div>
      </MobileWrapper>
    );
  }

  // Try multiple address sources for backward compatibility
  const address = order.shippingAddress || (order as any).deliveryAddress || order.shippingZone || "";
  
  const mapsLink = address 
    ? `https://maps.google.com/?q=${encodeURIComponent(address)}`
    : order.latitude && order.longitude 
    ? `https://maps.google.com/?q=${order.latitude},${order.longitude}`
    : null;

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <button onClick={() => setLocation("/delivery")} className="flex items-center gap-2 mb-3">
            <ArrowLeft size={20} />
            <span className="font-semibold">{language === "ar" ? "رجوع" : "Back"}</span>
          </button>
          <h1 className="text-lg font-bold">Order #{order.orderNumber || "N/A"}</h1>
          <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-y-auto px-5 py-4 space-y-4">
          {/* Map */}
          {mapLoading ? (
            <div className="w-full bg-blue-50 rounded-2xl p-4 border border-blue-200 flex items-center justify-center gap-2 h-64">
              <Loader size={20} className="animate-spin text-blue-600" />
              <span className="text-blue-600 font-semibold">{language === "ar" ? "جاري تحميل الخريطة..." : "Loading map..."}</span>
            </div>
          ) : mapLat && mapLng ? (
            <div className="w-full rounded-2xl overflow-hidden border border-blue-200 shadow-sm h-64" ref={mapContainer}></div>
          ) : (
            <div className="w-full bg-gray-200 rounded-2xl p-4 text-gray-600 font-semibold flex items-center justify-center gap-2 h-32">
              <MapPin size={20} />
              {language === "ar" ? "لا توجد معلومات موقع" : "No location info"}
            </div>
          )}

          {/* Delivery Info */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <h2 className="font-bold text-sm mb-3">{language === "ar" ? "معلومات التسليم" : "Delivery Info"}</h2>
            <div className="space-y-3">
              {address && (
                <div className="flex gap-2">
                  <MapPin size={16} className="text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-600">{language === "ar" ? "العنوان" : "Address"}</p>
                    <p className="text-sm">{address}</p>
                  </div>
                </div>
              )}
              
              {order.shippingPhone && (
                <div className="flex gap-2">
                  <Phone size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-600">{language === "ar" ? "الهاتف" : "Phone"}</p>
                    <a href={`tel:${order.shippingPhone}`} className="text-sm text-blue-600 hover:underline">{order.shippingPhone}</a>
                  </div>
                </div>
              )}

              {order.customerName && (
                <div className="flex gap-2">
                  <User size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-600">{language === "ar" ? "الزبون" : "Customer"}</p>
                    <p className="text-sm">{order.customerName}</p>
                  </div>
                </div>
              )}

              {order.recipientName && (
                <div className="flex gap-2">
                  <User size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-600">{language === "ar" ? "المستلم" : "Recipient"}</p>
                    <p className="text-sm">{order.recipientName}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          {order.items && order.items.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <h2 className="font-bold text-sm mb-3">{language === "ar" ? "المنتجات" : "Items"}</h2>
              <div className="space-y-2">
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm pb-2 border-b border-gray-100 last:border-0">
                    <span className="font-semibold">{item.title}</span>
                    <span className="text-gray-600">x{item.quantity}</span>
                    <span className="font-bold">L.E {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment & Shipping Info */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 space-y-3">
            {order.paymentMethod && (
              <div className="flex gap-2">
                <CreditCard size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-600">{language === "ar" ? "طريقة الدفع" : "Payment"}</p>
                  <p className="text-sm font-semibold">{order.paymentMethod}</p>
                </div>
              </div>
            )}
            
            {order.shippingZone && (
              <div className="flex gap-2">
                <Truck size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-600">{language === "ar" ? "منطقة الشحن" : "Shipping Zone"}</p>
                  <p className="text-sm font-semibold">{order.shippingZone}</p>
                </div>
              </div>
            )}

            {order.notes && (
              <div className="flex gap-2">
                <FileText size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-600">{language === "ar" ? "ملاحظات" : "Notes"}</p>
                  <p className="text-sm">{order.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <h2 className="font-bold text-sm mb-3">{language === "ar" ? "ملخص الأسعار" : "Price Breakdown"}</h2>
            <div className="space-y-2 text-sm">
              {order.subtotal !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-700">{language === "ar" ? "السعر الأساسي" : "Subtotal"}</span>
                  <span className="font-semibold">L.E {order.subtotal.toFixed(2)}</span>
                </div>
              )}
              
              {order.discountAmount ? (
                <div className="flex justify-between text-red-600">
                  <span>{language === "ar" ? "خصم" : "Discount"}</span>
                  <span className="font-semibold">-L.E {order.discountAmount.toFixed(2)}</span>
                </div>
              ) : null}
              
              {order.shippingCost !== undefined && order.shippingCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">{language === "ar" ? "شحن" : "Shipping"}</span>
                  <span className="font-semibold">+L.E {order.shippingCost.toFixed(2)}</span>
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                <span>{language === "ar" ? "الإجمالي" : "Total"}</span>
                <span>L.E {order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
