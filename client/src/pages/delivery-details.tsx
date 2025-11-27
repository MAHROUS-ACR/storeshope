import { useEffect, useState, useRef } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, MapPin, Phone, User, CreditCard, Truck, FileText, Loader, ChevronDown, ChevronUp, Navigation } from "lucide-react";
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
  const [isNavigating, setIsNavigating] = useState(false);
  const [remainingDistance, setRemainingDistance] = useState<number | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const currentMarker = useRef<L.Marker | null>(null);
  const routePolyline = useRef<L.Polyline | null>(null);

  const orderId = location.split("/delivery-order/")[1]?.split("?")[0];

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Watch current location continuously for accuracy
  useEffect(() => {
    let watchId: number | null = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          console.log("Got current position:", lat, lng);
          setCurrentLat(lat);
          setCurrentLng(lng);

          // Update marker and center map if navigating
          if (isNavigating && map.current && currentMarker.current) {
            currentMarker.current.setLatLng([lat, lng]);
            map.current.panTo([lat, lng]);
            
            // Calculate remaining distance
            if (mapLat && mapLng) {
              const remaining = calculateDistance(lat, lng, mapLat, mapLng);
              setRemainingDistance(remaining);
            }
          }
        },
        (error) => {
          console.log("Geolocation error:", error);
          setLocationError(language === "ar" ? "لا يمكن الوصول للموقع الحالي" : "Cannot access current location");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
    
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isNavigating, mapLat, mapLng]);

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
      console.log("Adding current location marker:", currentLat, currentLng);
      const marker = L.marker([currentLat, currentLng], {
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
      
      currentMarker.current = marker;

      // Fit bounds to show both markers immediately
      const bounds = L.latLngBounds([[currentLat, currentLng], [mapLat, mapLng]]);
      map.current.fitBounds(bounds, { padding: [80, 80] });

      // Fetch best route with alternatives
      const fetchBestRoute = async () => {
        try {
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${currentLng},${currentLat};${mapLng},${mapLat}?geometries=geojson&overview=full&alternatives=true&steps=false`,
            { signal: AbortSignal.timeout(6000) }
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
              // Select fastest route
              let bestRoute = data.routes[0];
              if (data.routes.length > 1) {
                bestRoute = data.routes.reduce((best: any, current: any) => 
                  (current.duration || 0) < (best.duration || 0) ? current : best
                );
              }
              
              const coords = bestRoute.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
              
              if (coords && coords.length > 0 && map.current) {
                const polyline = L.polyline(coords, {
                  color: '#2563eb',
                  weight: 3,
                  opacity: 0.8,
                }).addTo(map.current);
                
                routePolyline.current = polyline;
                
                const distance = (bestRoute.distance || 0) / 1000;
                const duration = (bestRoute.duration || 0) / 60;
                setRouteDistance(distance);
                setRouteDuration(duration);
              }
            }
          }
        } catch (error) {
          console.log("Route fetch error:", error);
        }
      };
      
      fetchBestRoute();
    }
  }, [orderId, mapLat, mapLng, currentLat, currentLng, language, showMap, order?.status]);

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
          <div className="flex items-center justify-between gap-2 mb-1">
            <button onClick={() => setLocation("/delivery")} className="flex items-center gap-2">
              <ArrowLeft size={18} />
              <span className="font-semibold text-sm">{language === "ar" ? "رجوع" : "Back"}</span>
            </button>
            <div className="flex items-center gap-1">
              {order?.status !== "received" && (
                <button
                  onClick={() => setIsNavigating(!isNavigating)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${isNavigating ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  data-testid="button-navigation"
                >
                  <Navigation size={16} />
                  <span className="text-xs font-semibold">{language === "ar" ? "ملاحة" : "Navigate"}</span>
                </button>
              )}
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

          {/* Route Info & Navigation */}
          {(routeDistance && routeDuration) || isNavigating ? (
            <div className={`rounded-2xl p-4 border ${isNavigating ? "bg-blue-100 border-blue-300" : "bg-blue-50 border-blue-200"}`}>
              <h2 className="font-bold text-base mb-3 text-blue-900">{isNavigating ? (language === "ar" ? "الملاحة النشطة" : "Active Navigation") : (language === "ar" ? "معلومات المسار" : "Route Info")}</h2>
              <div className="space-y-2 text-base">
                <div className="flex justify-between">
                  <span className="text-blue-700">{language === "ar" ? isNavigating ? "المسافة المتبقية" : "المسافة" : isNavigating ? "Remaining" : "Distance"}</span>
                  <span className="font-semibold text-blue-900">{isNavigating && remainingDistance ? remainingDistance.toFixed(1) : routeDistance?.toFixed(1)} km</span>
                </div>
                {!isNavigating && routeDuration && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">{language === "ar" ? "الوقت المتوقع" : "Estimated Time"}</span>
                    <span className="font-semibold text-blue-900">{Math.ceil(routeDuration)} {language === "ar" ? "دقيقة" : "min"}</span>
                  </div>
                )}
                {isNavigating && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">{language === "ar" ? "الحالة" : "Status"}</span>
                    <span className="font-semibold text-green-600">{language === "ar" ? "في الطريق" : "In Transit"}</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}

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
