import { useEffect, useState, useRef } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, MapPin, Phone, User, CreditCard, Truck, FileText, Loader, ChevronDown, ChevronUp } from "lucide-react";
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
  deliveryRemarks?: string;
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
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  const orderId = location.split("/delivery-order/")[1]?.split("?")[0];

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLat(position.coords.latitude);
          setCurrentLng(position.coords.longitude);
        },
        (error) => {
          setLocationError(language === "ar" ? "لا يمكن الوصول للموقع الحالي" : "Cannot access current location");
        }
      );
    }
  }, [language]);

  // Geocode address to get lat/lng as fallback
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


  // Initialize Leaflet map with routing
  useEffect(() => {
    if (!mapContainer.current || !mapLat || !mapLng) return;
    
    // Clear existing map
    if (map.current) {
      map.current.remove();
    }

    // Calculate center and zoom to fit both markers if current location exists
    let centerLat = mapLat;
    let centerLng = mapLng;
    let zoomLevel = 15;

    if (currentLat && currentLng) {
      centerLat = (mapLat + currentLat) / 2;
      centerLng = (mapLng + currentLng) / 2;
      zoomLevel = 14;
    }

    map.current = L.map(mapContainer.current).setView([centerLat, centerLng], zoomLevel);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map.current);

    // Delivery destination marker
    L.marker([mapLat, mapLng], {
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      })
    })
      .addTo(map.current)
      .bindPopup(`<div style="text-align: center; direction: ${language === "ar" ? "rtl" : "ltr"}"><strong>${language === "ar" ? "موقع التسليم" : "Delivery Location"}</strong></div>`)
      .openPopup();

    // Current location marker - only for non-received orders
    if (currentLat && currentLng && order?.status !== "received") {
      L.marker([currentLat, currentLng], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
        })
      })
        .addTo(map.current)
        .bindPopup(`<div style="text-align: center; direction: ${language === "ar" ? "rtl" : "ltr"}"><strong>${language === "ar" ? "موقعك الحالي" : "Your Location"}</strong></div>`);

      // Draw straight line only
      const line = L.polyline(
        [[currentLat, currentLng], [mapLat, mapLng]],
        {
          color: '#2563eb',
          weight: 2,
          opacity: 0.6,
          dashArray: '5, 5',
        }
      ).addTo(map.current);
    }
  }, [mapLat, mapLng, currentLat, currentLng, language, showMap, order?.status]);

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
          
          // Use latitude and longitude if available
          if (data.latitude && data.longitude) {
            setMapLat(data.latitude);
            setMapLng(data.longitude);
          } else {
            // Fallback: geocode the address
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
        <div className="px-5 py-1 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <button onClick={() => setLocation("/delivery")} className="flex items-center gap-2">
              <ArrowLeft size={18} />
              <span className="font-semibold text-sm">{language === "ar" ? "رجوع" : "Back"}</span>
            </button>
            <button
              onClick={() => setShowMap(!showMap)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              data-testid="button-toggle-map"
            >
              {showMap ? (
                <>
                  <ChevronUp size={16} className="text-gray-700" />
                  <span className="text-xs font-semibold text-gray-700">{language === "ar" ? "كلوز ماب" : "Close Map"}</span>
                </>
              ) : (
                <>
                  <ChevronDown size={16} className="text-gray-700" />
                  <span className="text-xs font-semibold text-gray-700">{language === "ar" ? "اوبن ماب" : "Open Map"}</span>
                </>
              )}
            </button>
          </div>
          <h1 className="text-base font-bold">Order #{order.orderNumber || "N/A"}</h1>
          <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
        </div>

        {/* Map - Full Width at Top */}
        {showMap && (
          <>
            {mapLoading ? (
              <div className="w-full bg-blue-50 border-b border-blue-200 flex items-center justify-center gap-2 py-3">
                <Loader size={18} className="animate-spin text-blue-600" />
                <span className="text-blue-600 font-semibold text-sm">{language === "ar" ? "جاري تحميل الخريطة..." : "Loading map..."}</span>
              </div>
            ) : mapLat && mapLng ? (
              <div className="w-full bg-blue-100 border-b border-blue-300 overflow-hidden h-80" ref={mapContainer}></div>
            ) : (
              <div className="w-full bg-gray-200 border-b border-gray-300 py-12 flex items-center justify-center gap-2">
                <MapPin size={20} className="text-gray-600" />
                <span className="text-gray-600 font-semibold">{language === "ar" ? "لا توجد معلومات موقع" : "No location info"}</span>
              </div>
            )}
          </>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-y-auto px-5 py-4 space-y-4">

          {/* Delivery Info */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <h2 className="font-bold text-base mb-3">{language === "ar" ? "معلومات التسليم" : "Delivery Info"}</h2>
            <div className="space-y-3">
              {address && (
                <div className="flex gap-2">
                  <MapPin size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-600">{language === "ar" ? "العنوان" : "Address"}</p>
                    <p className="text-base">{address}</p>
                  </div>
                </div>
              )}
              
              {order.shippingPhone && (
                <div className="flex gap-2">
                  <Phone size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-600">{language === "ar" ? "الهاتف" : "Phone"}</p>
                    <a href={`tel:${order.shippingPhone}`} className="text-base text-blue-600 hover:underline">{order.shippingPhone}</a>
                  </div>
                </div>
              )}

              {order.customerName && (
                <div className="flex gap-2">
                  <User size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-600">{language === "ar" ? "الزبون" : "Customer"}</p>
                    <p className="text-base">{order.customerName}</p>
                  </div>
                </div>
              )}

              {order.recipientName && (
                <div className="flex gap-2">
                  <User size={18} className="text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-600">{language === "ar" ? "المستلم" : "Recipient"}</p>
                    <p className="text-base">{order.recipientName}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          {order.items && order.items.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <h2 className="font-bold text-base mb-3">{language === "ar" ? "المنتجات" : "Items"}</h2>
              <div className="space-y-2">
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-base pb-2 border-b border-gray-100 last:border-0">
                    <span className="font-semibold">{item.title}</span>
                    <span className="text-gray-600">x{item.quantity}</span>
                    <span className="font-bold">L.E {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Route Info */}
          {routeDistance && routeDuration && (
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
              <h2 className="font-bold text-base mb-3 text-blue-900">{language === "ar" ? "معلومات المسار" : "Route Info"}</h2>
              <div className="space-y-2 text-base">
                <div className="flex justify-between">
                  <span className="text-blue-700">{language === "ar" ? "المسافة" : "Distance"}</span>
                  <span className="font-semibold text-blue-900">{routeDistance.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">{language === "ar" ? "الوقت المتوقع" : "Estimated Time"}</span>
                  <span className="font-semibold text-blue-900">{Math.ceil(routeDuration)} {language === "ar" ? "دقيقة" : "min"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment & Shipping Info */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 space-y-3">
            {order.paymentMethod && (
              <div className="flex gap-2">
                <CreditCard size={18} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-600">{language === "ar" ? "طريقة الدفع" : "Payment"}</p>
                  <p className="text-base font-semibold">{order.paymentMethod}</p>
                </div>
              </div>
            )}
            
            {order.shippingZone && (
              <div className="flex gap-2">
                <Truck size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-600">{language === "ar" ? "منطقة الشحن" : "Shipping Zone"}</p>
                  <p className="text-base font-semibold">{order.shippingZone}</p>
                </div>
              </div>
            )}

            {order.notes && (
              <div className="flex gap-2">
                <FileText size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-600">{language === "ar" ? "ملاحظات" : "Notes"}</p>
                  <p className="text-base">{order.notes}</p>
                </div>
              </div>
            )}

            {order.deliveryRemarks && (
              <div className="flex gap-2">
                <FileText size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-600">{language === "ar" ? "ملاحظات التسليم" : "Delivery Remarks"}</p>
                  <p className="text-base">{order.deliveryRemarks}</p>
                </div>
              </div>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <h2 className="font-bold text-base mb-3">{language === "ar" ? "ملخص الأسعار" : "Price Breakdown"}</h2>
            <div className="space-y-2 text-base">
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
              
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-lg">
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
