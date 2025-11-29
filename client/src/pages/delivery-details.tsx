import { useEffect, useState, useRef } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, MapPin, Phone, User, CreditCard, Truck, FileText, Loader, ChevronDown, ChevronUp, Navigation, Target } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/lib/languageContext";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { sendNotification } from "@/lib/oneSignalService";

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
  deliveryLat?: number;
  deliveryLng?: number;
  driverLat?: number;
  driverLng?: number;
}

export default function DeliveryDetailsPage() {
  const [location, setLocation] = useLocation();
  const { language } = useLanguage();
  const [order, setOrder] = useState<DeliveryOrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLat, setMapLat] = useState<number | null>(null);
  const [mapLng, setMapLng] = useState<number | null>(null);
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [remainingDistance, setRemainingDistance] = useState<number | null>(null);
  const [isAutoCentering, setIsAutoCentering] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const currentMarker = useRef<L.Marker | null>(null);
  const routePolyline = useRef<L.Polyline | null>(null);
  const userInteractedWithMap = useRef(false);
  const lastStatusRef = useRef<string | null>(null);

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
          setCurrentLat(lat);
          setCurrentLng(lng);

          // Update marker if navigating
          if (isNavigating && map.current && currentMarker.current) {
            currentMarker.current.setLatLng([lat, lng]);
            currentMarker.current.setIcon(createDeliveryIcon(true));
            
            // Calculate remaining distance
            if (deliveryLat && deliveryLng) {
              const remaining = calculateDistance(lat, lng, deliveryLat, deliveryLng);
              setRemainingDistance(remaining);
            }
          }
        },
        (error) => {
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
  }, [isNavigating, deliveryLat, deliveryLng]);

  // Save driver location to Firebase in real-time
  useEffect(() => {
    if (!orderId || !currentLat || !currentLng) return;
    
    const saveLocationToFirebase = async () => {
      try {
        const db = getFirestore();
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, {
          // Driver current location
          driverLat: currentLat,
          driverLng: currentLng,
          // Backward compatibility
          latitude: currentLat,
          longitude: currentLng,
        });
      } catch (error) {
        // Silently handle location save errors
      }
    };

    saveLocationToFirebase();
  }, [currentLat, currentLng, orderId]);

  // Create motorcycle delivery icon using emoji
  const createDeliveryIcon = (isActive: boolean = false) => {
    const size = isActive ? 60 : 50;
    const fontSize = isActive ? 48 : 40;
    return L.divIcon({
      html: `<div style="font-size: ${fontSize}px; text-align: center; line-height: ${size}px; width: ${size}px; height: ${size}px;">🏍️</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -(size / 2)],
      className: ''
    });
  };

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
        setDeliveryLat(parseFloat(results[0].lat));
        setDeliveryLng(parseFloat(results[0].lon));
      }
    } catch (error) {
      // Silently handle geocoding errors
    } finally {
      setMapLoading(false);
    }
  };


  // Initialize Leaflet map with routing
  useEffect(() => {
    if (!mapContainer.current || !deliveryLat || !deliveryLng) return;
    
    // Clear existing map
    if (map.current) {
      map.current.remove();
    }

    // Show delivery location only - no auto-centering
    map.current = L.map(mapContainer.current).setView([deliveryLat, deliveryLng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map.current);

    // Track user interactions with the map
    map.current.on('zoom', () => {
      userInteractedWithMap.current = true;
    });
    map.current.on('drag', () => {
      userInteractedWithMap.current = true;
    });

    // Delivery destination marker (RED)
    L.marker([deliveryLat, deliveryLng], {
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

    // Mark that map was initialized (don't auto-pan unless user clicks center button)
    userInteractedWithMap.current = true;
  }, [orderId, deliveryLat, deliveryLng, language, showMap, order?.status]);

  // Add current location marker and route when location becomes available
  useEffect(() => {
    if (!map.current || !currentLat || !currentLng || order?.status === "received") return;
    
    // Only add marker if it doesn't exist yet
    if (!currentMarker.current) {
      const marker = L.marker([currentLat, currentLng], {
        icon: createDeliveryIcon(isNavigating)
      })
        .addTo(map.current)
        .bindPopup(`<div style="text-align: center; direction: ${language === "ar" ? "rtl" : "ltr"}"><strong>${language === "ar" ? "موقعك الحالي" : "Your Location"}</strong></div>`);
      
      currentMarker.current = marker;
      
      // Fetch and display route
      const fetchBestRoute = async () => {
        try {
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${currentLng},${currentLat};${deliveryLng},${deliveryLat}?geometries=geojson&overview=full&alternatives=true&steps=false`,
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
              
              if (coords && coords.length > 0 && map.current && !routePolyline.current) {
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
          // Silently handle route fetch errors
        }
      };
      
      fetchBestRoute();
    } else {
      // Update existing marker position
      currentMarker.current.setLatLng([currentLat, currentLng]);
    }
  }, [currentLat, currentLng, deliveryLat, deliveryLng, order?.status, language, isNavigating]);

  // Keep marker updated when location changes during navigation
  useEffect(() => {
    if (isNavigating && map.current && currentMarker.current && currentLat && currentLng) {
      // Update marker position to latest location only
      currentMarker.current.setLatLng([currentLat, currentLng]);
    }
  }, [currentLat, currentLng, isNavigating]);

  // Toggle auto-centering and recenter map
  const recenterMap = () => {
    if (!map.current || !deliveryLat || !deliveryLng) return;
    
    setIsAutoCentering(!isAutoCentering);
    userInteractedWithMap.current = false;
    
    if (isNavigating && currentLat && currentLng) {
      // During navigation: focus on current location only
      map.current.setView([currentLat, currentLng], 18);
    } else if (currentLat && currentLng) {
      // Not navigating: show both markers and route
      const bounds = L.latLngBounds([[currentLat, currentLng], [deliveryLat, deliveryLng]]);
      map.current.fitBounds(bounds, { padding: [80, 80] });
    }
  };

  // Keep auto-centering active if enabled
  useEffect(() => {
    if (!isAutoCentering || !map.current || !currentLat || !currentLng || !deliveryLat || !deliveryLng) return;
    
    if (isNavigating) {
      map.current.panTo([currentLat, currentLng]);
    }
  }, [isAutoCentering, currentLat, currentLng, isNavigating]);

  // Fetch order and monitor status changes
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
          
          // Check if status changed and send notification
          if (lastStatusRef.current && lastStatusRef.current !== data.status) {
            // Status changed - send notification
            let notificationTitle = "";
            let notificationMessage = "";

            if (data.status === "shipped") {
              notificationTitle = language === "ar" ? "🚚 تم شحن طلبك" : "🚚 Order Shipped";
              notificationMessage = language === "ar" 
                ? "تم شحن طلبك! سيصل إليك قريباً."
                : "Your order has been shipped! It's on the way.";
            } else if (data.status === "in-transit") {
              notificationTitle = language === "ar" ? "📍 الطلب في الطريق" : "📍 Out for Delivery";
              notificationMessage = language === "ar"
                ? "طلبك في الطريق إليك الآن."
                : "Your order is out for delivery.";
            } else if (data.status === "received") {
              notificationTitle = language === "ar" ? "✅ تم استقبال طلبك" : "✅ Delivered";
              notificationMessage = language === "ar"
                ? "شكراً لك! تم استقبال طلبك بنجاح."
                : "Thank you! Your order has been delivered.";
            }

            if (notificationTitle && notificationMessage) {
              await sendNotification(notificationTitle, notificationMessage, { orderId, status: data.status });
            }
          }

          lastStatusRef.current = data.status;
          setOrder(data);
          
          // Delivery destination location - use deliveryLat/deliveryLng from order
          if (data.deliveryLat && data.deliveryLng) {
            setDeliveryLat(data.deliveryLat);
            setDeliveryLng(data.deliveryLng);
          } else if (data.latitude && data.longitude) {
            // Backward compatibility: use latitude/longitude if deliveryLat not available
            setDeliveryLat(data.latitude);
            setDeliveryLng(data.longitude);
          } else {
            // Fallback: geocode the address if no coordinates
            const addr = data.shippingAddress || (data as any).deliveryAddress || data.shippingZone || "";
            if (addr) {
              geocodeAddress(addr);
            }
          }
          
          // Driver current location
          if (data.latitude && data.longitude) {
            setMapLat(data.latitude);
            setMapLng(data.longitude);
          }
        }
      } catch (error) {
        // Silently handle fetch errors
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, language]);

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
  
  // Create maps link from coordinates first (more accurate), then address
  const mapsLink = order.deliveryLat && order.deliveryLng
    ? `https://maps.google.com/?q=${order.deliveryLat},${order.deliveryLng}`
    : order.latitude && order.longitude 
    ? `https://maps.google.com/?q=${order.latitude},${order.longitude}`
    : address 
    ? `https://maps.google.com/?q=${encodeURIComponent(address)}`
    : null;

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-3 py-0 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between gap-1 h-8">
            <button onClick={() => setLocation("/delivery")} className="flex items-center gap-0.5 min-w-0">
              <ArrowLeft size={14} />
              <span className="font-semibold text-[10px] truncate">{language === "ar" ? "رجوع" : "Back"}</span>
            </button>
            <div className="flex items-center gap-0 flex-shrink-0">
              {order?.status !== "received" && (
                <button
                  onClick={() => setIsNavigating(!isNavigating)}
                  className={`p-1 rounded transition-colors ${isNavigating ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  data-testid="button-navigation"
                  title={language === "ar" ? "ملاحة" : "Navigate"}
                >
                  <Navigation size={12} />
                </button>
              )}
              {showMap && deliveryLat && deliveryLng && (
                <button
                  onClick={recenterMap}
                  className={`p-1 rounded transition-colors ${isAutoCentering ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  data-testid="button-recenter-map"
                  title={language === "ar" ? "توسيط الخريطة" : "Center map"}
                >
                  <Target size={12} />
                </button>
              )}
              <button
                onClick={() => setShowMap(!showMap)}
                className="p-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                data-testid="button-toggle-map"
                title={showMap ? (language === "ar" ? "إغلاق الخريطة" : "Close") : (language === "ar" ? "فتح الخريطة" : "Open")}
              >
                {showMap ? <ChevronUp size={12} className="text-gray-700" /> : <ChevronDown size={12} className="text-gray-700" />}
              </button>
            </div>
          </div>
          <h1 className="text-xs font-bold truncate leading-tight">Order #{order.orderNumber || "N/A"}</h1>
          <p className="text-[9px] text-gray-500 leading-tight">{new Date(order.createdAt).toLocaleDateString()}</p>
        </div>

        {/* Map - Full Width at Top */}
        {showMap && order?.status !== "received" && order?.status !== "cancelled" && (
          <>
            {mapLoading ? (
              <div className="w-full bg-blue-50 border-b border-blue-200 flex items-center justify-center gap-2 py-3">
                <Loader size={18} className="animate-spin text-blue-600" />
                <span className="text-blue-600 font-semibold text-sm">{language === "ar" ? "جاري تحميل الخريطة..." : "Loading map..."}</span>
              </div>
            ) : deliveryLat && deliveryLng ? (
              <div className="w-full bg-blue-100 border-b border-blue-300 overflow-hidden h-80" ref={mapContainer}></div>
            ) : (
              <div className="w-full bg-gray-200 border-b border-gray-300 py-12 flex items-center justify-center gap-2">
                <MapPin size={20} className="text-gray-600" />
                <span className="text-gray-600 font-semibold">{language === "ar" ? "لا توجد معلومات موقع" : "No location info"}</span>
              </div>
            )}
          </>
        )}
        {order?.status === "received" && (
          <div className="w-full bg-green-50 border-b border-green-300 py-8 flex items-center justify-center gap-2">
            <MapPin size={20} className="text-green-600" />
            <span className="text-green-600 font-semibold">{language === "ar" ? "تم التسليم - الخريطة غير متاحة" : "Delivered - Map unavailable"}</span>
          </div>
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

              {order.deliveryUsername && (
                <div className="flex gap-2">
                  <User size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-600">{language === "ar" ? "اسم الدليفرى" : "Delivery Driver"}</p>
                    <p className="text-base">{order.deliveryUsername}</p>
                  </div>
                </div>
              )}

              {order.deliveryRemarks && (
                <div className="flex gap-2">
                  <FileText size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-600">{language === "ar" ? "ملاحظات التسليم" : "Delivery Remarks"}</p>
                    <p className="text-base">{order.deliveryRemarks}</p>
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
