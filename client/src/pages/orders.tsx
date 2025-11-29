import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, ChevronRight, X, MapPin, Loader } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import { useUser } from "@/lib/userContext";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { toast } from "sonner";
import { getOrders } from "@/lib/firebaseOps";
import { getStatusColor } from "@/lib/statusColors";
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Create motorcycle delivery icon using emoji
const createDeliveryIcon = () => {
  return L.divIcon({
    html: '<div style="font-size: 40px; text-align: center; line-height: 50px; width: 50px; height: 50px;">🏍️</div>',
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25],
    className: ''
  });
};

interface CartItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  image?: string;
  selectedColor?: string;
  selectedSize?: string;
  selectedUnit?: string;
}

interface Order {
  id: string;
  orderNumber?: number;
  userId?: string;
  items: CartItem[];
  total: number;
  status: string;
  paymentMethod?: string;
  createdAt: string;
  subtotal?: number;
  discountedTotal?: number;
  shippingCost?: number;
  shippingAddress?: string;
  shippingPhone?: string;
  shippingZone?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  driverLat?: number;
  driverLng?: number;
}

export default function OrdersPage() {
  const [location, setLocation] = useLocation();
  const { user, isLoggedIn, isLoading: authLoading } = useUser();
  const { language } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [mapLat, setMapLat] = useState<number | null>(null);
  const [mapLng, setMapLng] = useState<number | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const driverMarker = useRef<L.Marker | null>(null);
  const routePolyline = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      setLocation("/login");
    }
  }, [isLoggedIn, authLoading, setLocation]);

  // Detect when page is visited from checkout (has refresh param)
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1]);
    if (params.has('refresh')) {
      setRefetchTrigger(prev => prev + 1);
    }
  }, [location]);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      setOrders([]);
      return;
    }

    setIsLoading(true);
    setFirebaseConfigured(true);
    
    let unsubscribe: (() => void) | null = null;
    let pollInterval: NodeJS.Timeout | null = null;
    
    try {
      const db = getFirestore();
      const ordersRef = collection(db, "orders");
      
      // Create query for user's orders
      const ordersQuery = query(ordersRef, where("userId", "==", user.id));
      
      // Set up real-time listener
      unsubscribe = onSnapshot(ordersQuery, (snapshot) => {

        const firebaseOrders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[];
        
        if (firebaseOrders && firebaseOrders.length > 0) {
          setOrders(firebaseOrders);
        } else {
          setOrders([]);
        }
        setIsLoading(false);
      }, (error) => {

        setOrders([]);
        setIsLoading(false);
      });
      
      // Add polling as backup - refresh every 2 seconds when coming from checkout
      if (refetchTrigger > 0) {

        pollInterval = setInterval(async () => {
          try {
            const firebaseOrders = await getOrders(user.id);

            if (firebaseOrders && firebaseOrders.length > 0) {
              setOrders(firebaseOrders as Order[]);
            }
          } catch (error) {

          }
        }, 1000);
      }
      
      return () => {
        if (unsubscribe) unsubscribe();
        if (pollInterval) clearInterval(pollInterval);
      };
    } catch (error) {

      setOrders([]);
      setIsLoading(false);
    }
  }, [user?.id, refetchTrigger]);

  // Geocode address to coordinates
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

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapLat || !mapLng) return;
    
    if (map.current) {
      map.current.remove();
    }

    map.current = L.map(mapContainer.current).setView([mapLat, mapLng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map.current);

    // Destination marker (red)
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
      .bindPopup(`<div style="text-align: center"><strong>${language === "ar" ? "موقع التسليم" : "Delivery Location"}</strong></div>`)
      .openPopup();

    // Add driver location marker if available - ONLY use driverLat/driverLng (not fallback to delivery location)
    const driverLat = selectedOrder?.driverLat;
    const driverLng = selectedOrder?.driverLng;
    
    if (driverLat !== undefined && driverLat !== null && driverLng !== undefined && driverLng !== null && map.current) {
      console.log("✅ Adding driver marker in orders:", driverLat, driverLng);
      if (driverMarker.current) {
        driverMarker.current.remove();
      }
      driverMarker.current = L.marker([driverLat, driverLng], {
        icon: createDeliveryIcon()
      })
        .addTo(map.current)
        .bindPopup(`<div style="text-align: center"><strong>${language === "ar" ? "موقع السائق" : "Driver Location"}</strong></div>`);

      // Fetch and display route
      if (typeof driverLng === 'number' && typeof driverLat === 'number' && typeof mapLng === 'number' && typeof mapLat === 'number') {
        fetch(`https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${mapLng},${mapLat}?geometries=geojson`)
          .then(res => res.json())
          .then(data => {
            if (data.routes && data.routes[0] && map.current) {
              const coords = data.routes[0].geometry.coordinates.map((coord: any) => [coord[1], coord[0]]);
              if (routePolyline.current) routePolyline.current.remove();
              routePolyline.current = L.polyline(coords, { color: '#3b82f6', weight: 3, opacity: 0.7 }).addTo(map.current);
            }
          })
          .catch(err => console.log("Route error:", err));
      }
    } else {
      console.log("❌ Driver location not available in orders - no marker shown");
    }
  }, [mapLat, mapLng, language, selectedOrder?.driverLat, selectedOrder?.driverLng, selectedOrder?.latitude, selectedOrder?.longitude]);

  // Reset map and geocode when order is selected - use deliveryLat/deliveryLng if available
  useEffect(() => {
    if (selectedOrder?.id) {
      // Reset map state for new order
      setMapLat(null);
      setMapLng(null);
      
      // Use deliveryLat/deliveryLng if available, otherwise geocode
      if (selectedOrder.deliveryLat && selectedOrder.deliveryLng) {
        setMapLat(selectedOrder.deliveryLat);
        setMapLng(selectedOrder.deliveryLng);
      } else if (selectedOrder.shippingAddress || selectedOrder.deliveryAddress) {
        geocodeAddress(selectedOrder.shippingAddress || selectedOrder.deliveryAddress || "");
      }
    }
  }, [selectedOrder?.id]);


  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 pb-4 pt-2 flex items-center gap-4 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => {
              // Check if there's a previousPage stored in sessionStorage
              const previousPage = sessionStorage.getItem('previousPage');
              const backPath = previousPage || '/';
              sessionStorage.removeItem('previousPage'); // Clear after use
              setLocation(backPath);
            }}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{t("myOrders", language)}</h1>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-5">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📦</span>
            </div>
            <h2 className="text-lg font-bold mb-2">{t("noOrdersYet", language)}</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              {t("noOrdersFound", language)}
            </p>
            <button
              onClick={() => setLocation("/")}
              className="px-5 py-2 bg-black text-white rounded-full text-sm font-semibold"
              data-testid="button-start-shopping"
            >
              {t("startShopping", language)}
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar pb-40 w-full">
            <div className="w-full px-5 py-4 space-y-3">
              {orders
                .filter(order => !user || !(order as any).userId || (order as any).userId === user.id)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((order) => (
                <div key={order.id}>
                  <button
                    onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                    className="w-full p-4 bg-white rounded-2xl border border-gray-100 hover:border-primary hover:shadow-sm transition-all text-left"
                    data-testid={`order-${order.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Order #{(order as any).orderNumber || "N/A"}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="font-bold text-lg" data-testid={`total-${order.id}`}>
                          L.E {order.total.toFixed(2)}
                        </p>
                        <span
                          className={`text-xs font-semibold px-5 py-1 rounded-full border ${getStatusColor(
                            order.status
                          )}`}
                          data-testid={`status-${order.id}`}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </button>

                  {selectedOrder?.id === order.id && (
                    <>
                      {/* Map Section */}
                      {(selectedOrder.shippingAddress || selectedOrder.deliveryAddress) && selectedOrder?.status !== "completed" && selectedOrder?.status !== "received" && selectedOrder?.status !== "cancelled" && (
                        <div className="mt-3 w-full">
                          {mapLoading ? (
                            <div className="w-full bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center gap-2 py-3">
                              <Loader size={16} className="animate-spin text-blue-600" />
                              <span className="text-blue-600 font-semibold text-xs">{language === "ar" ? "جاري تحميل الخريطة..." : "Loading map..."}</span>
                            </div>
                          ) : mapLat && mapLng ? (
                            <div className="w-full bg-blue-100 border border-blue-300 overflow-hidden rounded-2xl" style={{ height: '200px' }} ref={mapContainer}></div>
                          ) : (
                            <div className="w-full bg-gray-200 border border-gray-300 rounded-2xl py-6 flex items-center justify-center gap-2">
                              <MapPin size={16} className="text-gray-600" />
                              <span className="text-gray-600 font-semibold text-xs">{language === "ar" ? "لا توجد معلومات موقع" : "No location info"}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {(selectedOrder.shippingAddress || selectedOrder.deliveryAddress) && (selectedOrder?.status === "completed" || selectedOrder?.status === "received" || selectedOrder?.status === "cancelled") && (
                        <div className="mt-3 w-full bg-green-50 border border-green-300 rounded-2xl py-6 flex items-center justify-center gap-2">
                          <MapPin size={16} className="text-green-600" />
                          <span className="text-green-600 font-semibold text-xs">{selectedOrder?.status === "cancelled" ? (language === "ar" ? "تم الإلغاء - الخريطة غير متاحة" : "Cancelled - Map unavailable") : (language === "ar" ? "تم التسليم - الخريطة غير متاحة" : "Delivered - Map unavailable")}</span>
                        </div>
                      )}

                      {/* Order Details */}
                      <div className="mt-3 bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-100">
                        <div>
                          <p className="text-xs font-semibold text-gray-500">{t("orderDetailsLabel", language)}</p>
                          <p className="text-sm font-bold text-gray-900">#{selectedOrder.orderNumber || "N/A"}</p>
                        </div>
                        <button
                          onClick={() => setSelectedOrder(null)}
                          className="text-gray-400 hover:text-gray-600"
                          data-testid="button-close-details"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Items Details */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 mb-2">{t("items", language)}</p>
                        <div className="space-y-2">
                          {selectedOrder.items.map((item, idx) => (
                            <div key={`${item.id}-${idx}`} className="flex flex-col gap-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-700">
                                  {item.quantity}x {item.title}
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {(item.quantity * item.price).toFixed(2)}
                                </span>
                              </div>
                              {(item.selectedColor || item.selectedSize || item.selectedUnit) && (
                                <div className="flex flex-wrap gap-1 ml-2">
                                  {item.selectedUnit && <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-semibold">{item.selectedUnit}</span>}
                                  {item.selectedSize && <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[8px] font-semibold">{item.selectedSize}</span>}
                                  {item.selectedColor && (() => {
                                    const [colorName, colorHex] = typeof item.selectedColor === 'string' ? item.selectedColor.split('|') : [item.selectedColor, '#000000'];
                                    return (
                                      <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-semibold" style={{backgroundColor: colorHex || '#000000', color: ['#ffffff', '#f0f0f0', '#e0e0e0'].includes((colorHex || '#000000').toLowerCase()) ? '#000000' : '#ffffff'}}>
                                        {colorName}
                                      </span>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Customer & Delivery Information */}
                      {(selectedOrder.customerName || selectedOrder.customerPhone || selectedOrder.deliveryAddress || selectedOrder.shippingAddress || selectedOrder.shippingPhone || selectedOrder.shippingZone) && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 mb-2">👤 {language === "ar" ? "بيانات التوصيل" : "Delivery Information"}</p>
                          <div className="space-y-1.5">
                            {(selectedOrder.customerName || selectedOrder.shippingAddress) && (
                              <div>
                                <p className="text-xs text-gray-500">{language === "ar" ? "الاسم" : "Name"}</p>
                                <p className="text-xs font-medium text-gray-900">{selectedOrder.customerName || selectedOrder.shippingAddress || "N/A"}</p>
                              </div>
                            )}
                            {(selectedOrder.customerPhone || selectedOrder.shippingPhone) && (
                              <div>
                                <p className="text-xs text-gray-500">{t("phone", language)}</p>
                                <p className="text-xs font-medium text-gray-900">{selectedOrder.customerPhone || selectedOrder.shippingPhone || "N/A"}</p>
                              </div>
                            )}
                            {(selectedOrder.deliveryAddress || selectedOrder.shippingAddress) && (
                              <div>
                                <p className="text-xs text-gray-500">{t("address", language)}</p>
                                <p className="text-xs font-medium text-gray-900">{selectedOrder.deliveryAddress || selectedOrder.shippingAddress || "N/A"}</p>
                              </div>
                            )}
                            {selectedOrder.shippingZone && (
                              <div>
                                <p className="text-xs text-gray-500">{t("zone", language)}</p>
                                <p className="text-xs font-medium text-gray-900">{selectedOrder.shippingZone}</p>
                              </div>
                            )}
                            {selectedOrder.shippingCost !== undefined && selectedOrder.shippingCost > 0 && (
                              <div>
                                <p className="text-xs text-gray-500">{t("shippingCost", language)}</p>
                                <p className="text-xs font-medium text-gray-900">L.E {selectedOrder.shippingCost.toFixed(2)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {selectedOrder.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 mb-2">📝 {language === "ar" ? "ملاحظات" : "Notes"}</p>
                          <p className="text-xs text-gray-900">{selectedOrder.notes}</p>
                        </div>
                      )}

                      {/* Order Summary */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 mb-2">{t("orderSummary", language)} (L.E)</p>
                        <div className="space-y-1 text-xs">
                          {selectedOrder.subtotal !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">{t("subtotal", language)}</span>
                              <span className="font-medium text-gray-900">{selectedOrder.subtotal.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedOrder.discountedTotal !== undefined && selectedOrder.subtotal !== undefined && selectedOrder.discountedTotal < selectedOrder.subtotal && (
                            <>
                              <div className="flex justify-between text-green-600 font-semibold">
                                <span>{language === "ar" ? "الخصم" : "Discount"}</span>
                                <span>-{(selectedOrder.subtotal - selectedOrder.discountedTotal).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-green-600 font-semibold">
                                <span>{language === "ar" ? "بعد الخصم" : "After Discount"}</span>
                                <span>{selectedOrder.discountedTotal.toFixed(2)}</span>
                              </div>
                            </>
                          )}
                          {selectedOrder.shippingCost !== undefined && selectedOrder.shippingCost > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">{t("shipping", language)}</span>
                              <span className="font-medium text-gray-900">{selectedOrder.shippingCost.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-100">
                            <span>{t("total", language)}</span>
                            <span>L.E {selectedOrder.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                        <div className="mt-3 text-xs text-gray-500">
                          <p>{t("placedAt", language)} {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
