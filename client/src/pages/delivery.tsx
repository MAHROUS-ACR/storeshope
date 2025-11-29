import { useEffect, useState, useRef } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { useUser } from "@/lib/userContext";
import { useLocation } from "wouter";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { getStatusColor } from "@/lib/statusColors";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { Check, Map, List, Loader } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface DeliveryOrder {
  id: string;
  orderNumber?: number;
  userId: string;
  total: number;
  status: string;
  createdAt: string;
  deliveryUsername?: string;
  recipientName?: string;
  shippingAddress?: string;
  latitude?: number;
  longitude?: number;
  deliveryLat?: number;
  deliveryLng?: number;
}

interface OrderLocation {
  id: string;
  orderNumber?: number;
  lat: number;
  lng: number;
  status: string;
}

export default function DeliveryPage() {
  const { user, isLoading } = useUser();
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>("shipped");
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [deliveryRemarks, setDeliveryRemarks] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "delivery")) {
      setLocation("/");
    }
  }, [isLoading, user, setLocation]);

  // Watch driver location continuously
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCurrentLat(lat);
          setCurrentLng(lng);
          
          // Update driver marker on map if it exists
          if (map.current && markersRef.current.length > 0) {
            const driverMarker = markersRef.current[0]; // Driver marker is first
            driverMarker.setLatLng([lat, lng]);
          }
        },
        () => {
          // Location access denied, use default
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
      
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const setupOrdersListener = () => {
    if (!user?.id) return;
    setOrdersLoading(true);
    try {
      const db = getFirestore();
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, where("deliveryUserId", "==", user.id));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ordersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as DeliveryOrder[];
        setOrders(ordersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setOrdersLoading(false);
      }, (error) => {
        toast.error("Failed to load orders");
        setOrdersLoading(false);
      });
      
      return unsubscribe;
    } catch (error) {
      toast.error("Failed to load orders");
      setOrdersLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, recName?: string, remarks?: string) => {
    try {
      const db = getFirestore();
      const orderRef = doc(db, "orders", orderId);
      const updateData: any = { status: newStatus };
      if (recName) {
        updateData.recipientName = recName;
      }
      if (remarks) {
        updateData.deliveryRemarks = remarks;
      }
      await updateDoc(orderRef, updateData);
      toast.success(t("statusUpdated", language));
      setShowRecipientModal(false);
      setSelectedOrderId(null);
      setRecipientName("");
      setDeliveryRemarks("");
    } catch (error) {
      toast.error(t("statusUpdateFailed", language));
    }
  };

  const handleMarkAsReceived = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowRecipientModal(true);
    setRecipientName("");
  };

  const handleConfirmDelivery = () => {
    if (!recipientName.trim()) {
      toast.error(t("enterRecipientName", language));
      return;
    }
    if (selectedOrderId) {
      updateOrderStatus(selectedOrderId, "received", recipientName, deliveryRemarks);
    }
  };

  // Calculate optimized route for all pending orders
  const calculateOptimizedRoute = async () => {
    if (!currentLat || !currentLng) {
      toast.error("Cannot determine your location");
      return;
    }

    const pendingOrders = orders.filter(o => o.status !== "received" && o.status !== "cancelled");
    const orderLocations: OrderLocation[] = [];

    for (const order of pendingOrders) {
      let lat = order.deliveryLat || order.latitude;
      let lng = order.deliveryLng || order.longitude;

      if (!lat || !lng) {
        // Geocode address if no coordinates
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(order.shippingAddress || "")}&format=json&limit=1`
          );
          const results = await response.json();
          if (results.length > 0) {
            lat = parseFloat(results[0].lat);
            lng = parseFloat(results[0].lon);
          }
        } catch (error) {
          // Skip this order
          continue;
        }
      }

      if (lat && lng) {
        orderLocations.push({
          id: order.id,
          orderNumber: order.orderNumber,
          lat,
          lng,
          status: order.status,
        });
      }
    }

    if (orderLocations.length === 0) {
      toast.error("No pending deliveries with valid locations");
      return;
    }

    setMapLoading(true);

    // Use OSRM to find best route
    const coordinates = [
      [currentLng, currentLat],
      ...orderLocations.map(o => [o.lng, o.lat])
    ];

    try {
      const coordsStr = coordinates.map(c => `${c[0]},${c[1]}`).join(";");
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordsStr}?geometries=geojson&overview=full`
      );
      const data = await response.json();

      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        setRouteInfo({
          distance: Math.round(route.distance / 1000 * 10) / 10,
          duration: Math.round(route.duration / 60)
        });

        // Initialize map if not already done
        if (!map.current && mapContainer.current) {
          map.current = L.map(mapContainer.current).setView([currentLat, currentLng], 13);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; OpenStreetMap',
            maxZoom: 19,
          }).addTo(map.current);
        }

        if (map.current) {
          const mapInstance = map.current;
          // Clear old markers and route
          markersRef.current.forEach(m => m.remove());
          markersRef.current = [];
          if (routePolylineRef.current) routePolylineRef.current.remove();

          // Draw route
          const coords = route.geometry.coordinates.map((c: [number, number]): L.LatLngExpression => [c[1], c[0]]);
          routePolylineRef.current = L.polyline(coords, {
            color: '#2563eb',
            weight: 3,
            opacity: 0.7,
          }).addTo(mapInstance);

          // Add driver marker
          const driverMarker = L.marker([currentLat, currentLng], {
            icon: L.divIcon({
              html: '<div style="font-size: 40px; text-align: center; line-height: 50px; width: 50px; height: 50px; background-color: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🚗</div>',
              iconSize: [50, 50],
              iconAnchor: [25, 25],
              popupAnchor: [0, -25],
            })
          }).addTo(mapInstance).bindPopup("Your Location");
          markersRef.current.push(driverMarker);

          // Add order markers
          orderLocations.forEach((order, index) => {
            const marker = L.marker([order.lat, order.lng], {
              icon: L.divIcon({
                html: `<div style="font-size: 20px; text-align: center; line-height: 30px; width: 30px; height: 30px; background-color: #3B82F6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${index + 1}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -15],
              })
            }).addTo(mapInstance).bindPopup(`Order #${order.orderNumber}`);
            markersRef.current.push(marker);
          });

          // Fit all markers in view
          const boundsArray: L.LatLngExpression[] = [
            [currentLat, currentLng],
            ...orderLocations.map(o => [o.lat, o.lng] as L.LatLngExpression)
          ];
          const bounds = L.latLngBounds(boundsArray);
          mapInstance.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    } catch (error) {
      toast.error("Failed to calculate route");
    } finally {
      setMapLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "delivery" && user?.id) {
      const unsubscribe = setupOrdersListener();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (viewMode === "map") {
      calculateOptimizedRoute();
      
      // Recalculate route every 15 seconds as driver moves
      const recalculateInterval = setInterval(() => {
        calculateOptimizedRoute();
      }, 15000);
      
      return () => clearInterval(recalculateInterval);
    }
  }, [viewMode, orders, currentLat, currentLng]);

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
      <div className="w-full flex-1 flex flex-col overflow-hidden relative">
        {/* Header with View Toggle */}
        <div className="px-5 pb-3 pt-2 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold">🚚 {t("deliveryOrders", language)}</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                data-testid="button-list-view"
                title="List View"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "map"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                data-testid="button-map-view"
                title="Map View"
              >
                <Map size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-32">
          {viewMode === "list" ? (
            // LIST VIEW
            <>
              {ordersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t("noOrdersToDeliver", language)}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Status Filters */}
                  <div className="bg-white rounded-2xl p-3 border border-gray-200 sticky top-0">
                    <p className="text-xs font-semibold text-gray-500 mb-2">{t("filter", language)}</p>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setSelectedStatusFilter(null)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          selectedStatusFilter === null
                            ? "bg-black text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        data-testid="button-filter-all"
                      >
                        {t("allOrders", language)}
                      </button>
                      <button
                        onClick={() => setSelectedStatusFilter("shipped")}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          selectedStatusFilter === "shipped"
                            ? "bg-blue-100 text-blue-700 border border-blue-300"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        data-testid="button-filter-shipped"
                      >
                        {t("shipped", language)}
                      </button>
                      <button
                        onClick={() => setSelectedStatusFilter("received")}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          selectedStatusFilter === "received"
                            ? "bg-green-100 text-green-700 border border-green-300"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        data-testid="button-filter-received"
                      >
                        {t("received", language)}
                      </button>
                      <button
                        onClick={() => setSelectedStatusFilter("completed")}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          selectedStatusFilter === "completed"
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        data-testid="button-filter-completed"
                      >
                        {t("completed", language)}
                      </button>
                    </div>
                  </div>

                  {/* Orders List */}
                  {orders
                    .filter(order => selectedStatusFilter === null || order.status === selectedStatusFilter)
                    .map((order) => (
                      <button
                        key={order.id}
                        onClick={() => {
                          sessionStorage.setItem('previousPage', '/delivery');
                          setLocation(`/delivery-order/${order.id}`);
                        }}
                        className="w-full text-left p-4 bg-white border border-gray-200 rounded-2xl hover:border-orange-300 hover:shadow-md transition-all"
                        data-testid={`card-order-${order.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-bold text-gray-900">Order #{order.orderNumber || "N/A"}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
                            {order.deliveryUsername && (
                              <p className="text-xs text-orange-600 font-semibold mt-1">🚚 {order.deliveryUsername}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
                              {t(order.status as any, language)}
                            </span>
                            {order.recipientName && (
                              <p className="text-xs text-gray-600">{order.recipientName}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-sm font-bold text-orange-600 mb-3">L.E {order.total.toFixed(2)}</p>
                        
                        {/* Action Button */}
                        {order.status === "shipped" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsReceived(order.id);
                            }}
                            className="w-full py-2 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                            data-testid={`button-mark-received-${order.id}`}
                          >
                            <Check size={16} />
                            {t("markAsReceived", language)}
                          </button>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </>
          ) : (
            // MAP VIEW
            <>
              {mapLoading ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <Loader size={20} className="animate-spin text-blue-600" />
                  <span className="text-blue-600 font-semibold">{language === "ar" ? "جاري تحسين المسار..." : "Optimizing route..."}</span>
                </div>
              ) : (
                <>
                  {routeInfo && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 mb-4">
                      <p className="text-xs font-semibold text-blue-700 mb-1">
                        {language === "ar" ? "📍 أفضل مسار" : "📍 Optimized Route"}
                      </p>
                      <p className="text-sm text-blue-600">
                        <span className="font-bold">{routeInfo.distance}</span> km • 
                        <span className="font-bold"> {routeInfo.duration}</span> {language === "ar" ? "دقيقة" : "mins"}
                      </p>
                    </div>
                  )}
                  <div ref={mapContainer} style={{ height: "500px" }} className="rounded-2xl border border-gray-200 overflow-hidden"></div>
                </>
              )}
            </>
          )}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>

      {/* Recipient Name Modal */}
      {showRecipientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{t("confirmDelivery", language)}</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t("recipientName", language)}</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder={t("recipientName", language)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                data-testid="input-recipient-name"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t("deliveryRemarks", language)}</label>
              <textarea
                value={deliveryRemarks}
                onChange={(e) => setDeliveryRemarks(e.target.value)}
                placeholder={t("deliveryRemarksPlaceholder", language)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 resize-none"
                rows={3}
                data-testid="input-delivery-remarks"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRecipientModal(false);
                  setSelectedOrderId(null);
                  setRecipientName("");
                  setDeliveryRemarks("");
                }}
                className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                data-testid="button-cancel-recipient"
              >
                {t("cancel", language)}
              </button>
              <button
                onClick={handleConfirmDelivery}
                className="flex-1 py-2 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
                data-testid="button-confirm-delivery"
              >
                {t("confirm", language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileWrapper>
  );
}
