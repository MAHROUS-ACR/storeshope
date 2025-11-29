import { useEffect, useState } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { useUser } from "@/lib/userContext";
import { useLocation } from "wouter";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { getStatusColor } from "@/lib/statusColors";
import { getFirestore, collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Check, Map, List, Loader, Navigation, FileText } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

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
  deliveryLat?: number;
  deliveryLng?: number;
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
  const [mapError, setMapError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [selectedSpeed, setSelectedSpeed] = useState<number>(30);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "delivery")) {
      setLocation("/");
    }
  }, [isLoading, user, setLocation]);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLat(position.coords.latitude);
          setUserLng(position.coords.longitude);
        },
        (error) => {
          console.log("Geolocation error:", error.code);
          // Default to Cairo if permission denied
          setUserLat(30.0444);
          setUserLng(31.2357);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setUserLat(30.0444);
      setUserLng(31.2357);
    }
  }, []);

  const setupOrdersListener = () => {
    setOrdersLoading(true);
    try {
      const db = getFirestore();
      const ordersRef = collection(db, "orders");
      
      const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
        const ordersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as DeliveryOrder[];
        
        setOrders(ordersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setOrdersLoading(false);
      }, (error) => {
        console.error("Failed to load orders:", error);
        toast.error("Failed to load orders");
        setOrdersLoading(false);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error("Orders listener error:", error);
      toast.error("Failed to load orders");
      setOrdersLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, recName?: string, remarks?: string) => {
    try {
      const db = getFirestore();
      const orderRef = doc(db, "orders", orderId);
      const updateData: any = { status: newStatus };
      if (recName) updateData.recipientName = recName;
      if (remarks) updateData.deliveryRemarks = remarks;
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

  // Load map when viewMode changes
  useEffect(() => {
    if (viewMode !== "map") return;

    setMapError(null);
    setTotalDistance(0);
    setTotalTime(0);
    let isMounted = true;

    const initMap = () => {
      try {
        const container = document.getElementById("leaflet-map");
        if (!container) {
          if (isMounted) setMapError("Map container not found");
          return;
        }

        const existingMap = (container as any)._leaflet_map;
        if (existingMap) return;

        let shippedOrders = orders.filter(o => o.status === "shipped" && o.deliveryLat && o.deliveryLng);
        if (shippedOrders.length === 0 && (!userLat || !userLng)) {
          if (isMounted) setMapError("No orders or location data");
          return;
        }

        let ordersWithDistance: any[] = [];
        if (userLat && userLng) {
          ordersWithDistance = shippedOrders.map(order => ({
            ...order,
            distance: calculateDistance(userLat, userLng, order.deliveryLat!, order.deliveryLng!)
          })).sort((a, b) => a.distance - b.distance);
        } else {
          ordersWithDistance = shippedOrders;
        }

        const centerLat = userLat || (shippedOrders[0]?.deliveryLat || 30.0444);
        const centerLng = userLng || (shippedOrders[0]?.deliveryLng || 31.2357);
        const map = L.map(container).setView([centerLat, centerLng], 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        if (userLat && userLng) {
          L.marker([userLat, userLng], {
            icon: L.divIcon({
              html: `<div style="width: 40px; height: 40px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 3px solid white;">📍</div>`,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
              className: 'user-marker'
            })
          }).addTo(map).bindPopup(language === "ar" ? "موقعك الحالي" : "Your Location");
        }

        let startLat = userLat || centerLat;
        let startLng = userLng || centerLng;
        let accumulatedDistance = 0;
        let accumulatedTime = 0;
        let routesCount = 0;
        
        ordersWithDistance.forEach((order, idx) => {
          const routeColor = idx === 0 ? '#ef4444' : '#ff8c00';
          fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${order.deliveryLng},${order.deliveryLat}?geometries=geojson`)
            .then(res => res.json())
            .then(data => {
              if (isMounted && data.routes?.[0]) {
                const route = data.routes[0];
                const latlngs = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
                const distance = route.distance / 1000;
                const polyline = L.polyline(latlngs, { color: routeColor, weight: 3, opacity: 0.7 }).addTo(map);
                
                // Add distance label on the route
                const midIndex = Math.floor(latlngs.length / 2);
                const midPoint = latlngs[midIndex];
                L.marker(midPoint, {
                  icon: L.divIcon({
                    html: `<div style="background: white; padding: 4px 8px; border-radius: 8px; border: 2px solid ${routeColor}; font-weight: bold; font-size: 12px; color: ${routeColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${distance.toFixed(1)}km</div>`,
                    iconSize: [70, 24],
                    iconAnchor: [35, 12],
                    className: 'distance-label'
                  })
                }).addTo(map);
                
                polyline.bindPopup(`<strong>${language === "ar" ? "المسافة" : "Distance"}</strong><br/>${distance.toFixed(1)} km`);
                
                accumulatedDistance += distance;
                accumulatedTime += route.duration;
                routesCount++;
                
                if (routesCount === ordersWithDistance.length) {
                  if (isMounted) {
                    setTotalDistance(accumulatedDistance);
                    setTotalTime(accumulatedTime);
                  }
                }
              }
            })
            .catch(() => {});
          
          startLat = order.deliveryLat!;
          startLng = order.deliveryLng!;
        });

        ordersWithDistance.forEach((order, idx) => {
          const isFirst = idx === 0;
          const markerColor = isFirst ? '#ef4444' : '#3B82F6';
          L.marker([order.deliveryLat!, order.deliveryLng!], {
            icon: L.divIcon({
              html: `<div style="width: ${isFirst ? 40 : 32}px; height: ${isFirst ? 40 : 32}px; background: ${markerColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: ${isFirst ? 18 : 14}px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); ${isFirst ? 'border: 3px solid white;' : ''}">${idx + 1}</div>`,
              iconSize: [isFirst ? 40 : 32, isFirst ? 40 : 32],
              iconAnchor: [isFirst ? 20 : 16, isFirst ? 20 : 16],
              className: 'order-marker'
            })
          }).addTo(map).bindPopup(`<strong>Order #${order.orderNumber}</strong><br/>📍 ${language === "ar" ? "التسليم:" : "Delivery:"} ${idx + 1}<br/>${order.shippingAddress || ''}<br/><strong>Distance: ${order.distance.toFixed(1)} km</strong>`);
        });

        setTimeout(() => {
          if (isMounted && map) map.invalidateSize();
        }, 100);
      } catch (err) {
        if (isMounted) setMapError("Failed to load map");
      }
    };

    const timer = setTimeout(initMap, 100);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [viewMode, language]);

  useEffect(() => {
    const unsubscribe = setupOrdersListener();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id]);

  return (
    <MobileWrapper>
      {isLoading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col h-screen relative">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-xl font-bold text-gray-900">{t("delivery", language)}</h1>
                <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-semibold">
                  {orders.filter(o => o.status === "shipped").length} {language === "ar" ? "في الطريق" : "in route"}
                </span>
              </div>

              {/* View Toggle */}
              <div className="flex gap-2">
                <button onClick={() => setViewMode("list")} className={`flex-1 py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 ${viewMode === "list" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`} data-testid="button-list-view">
                  <List size={18} />
                </button>
                <button onClick={() => setViewMode("map")} className={`flex-1 py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 ${viewMode === "map" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`} data-testid="button-map-view">
                  <Map size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* List View */}
            <div style={{ display: viewMode === "list" ? "flex" : "none", flexDirection: "column" }} className="flex-1 overflow-y-auto px-5 py-4 pb-32">
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">{t("noOrdersToDeliver", language)}</div>
                ) : (
                  <div className="space-y-3">
                    {/* Filters */}
                    <div className="bg-white rounded-2xl p-3 border border-gray-200 sticky top-0">
                      <p className="text-xs font-semibold text-gray-500 mb-2">{t("filter", language)}</p>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => setSelectedStatusFilter(null)} className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedStatusFilter === null ? "bg-black text-white" : "bg-gray-100 text-gray-700"}`} data-testid="button-filter-all">
                          {t("allOrders", language)}
                        </button>
                        <button onClick={() => setSelectedStatusFilter("shipped")} className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedStatusFilter === "shipped" ? "bg-blue-100 text-blue-700 border border-blue-300" : "bg-gray-100 text-gray-700"}`} data-testid="button-filter-shipped">
                          {t("shipped", language)}
                        </button>
                        <button onClick={() => setSelectedStatusFilter("received")} className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedStatusFilter === "received" ? "bg-green-100 text-green-700 border border-green-300" : "bg-gray-100 text-gray-700"}`} data-testid="button-filter-received">
                          {t("received", language)}
                        </button>
                        <button onClick={() => setSelectedStatusFilter("completed")} className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedStatusFilter === "completed" ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-gray-100 text-gray-700"}`} data-testid="button-filter-completed">
                          {t("completed", language)}
                        </button>
                      </div>
                    </div>

                    {/* Orders */}
                    {orders.filter(order => selectedStatusFilter === null || order.status === selectedStatusFilter).map((order) => (
                      <div key={order.id} className="w-full text-left p-4 bg-white border border-gray-200 rounded-2xl" data-testid={`card-order-${order.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-bold text-gray-900">Order #{order.orderNumber || "N/A"}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
                            {order.deliveryUsername && <p className="text-xs text-orange-600 font-semibold mt-1">🚚 {order.deliveryUsername}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>{t(order.status as any, language)}</span>
                            {order.recipientName && <p className="text-xs text-gray-600">{order.recipientName}</p>}
                          </div>
                        </div>
                        <p className="text-sm font-bold text-orange-600 mb-3">L.E {order.total.toFixed(2)}</p>
                        <div className="flex gap-2">
                          <button onClick={() => { sessionStorage.setItem('previousPage', '/delivery'); setLocation(`/delivery-order/${order.id}`); }} className="flex-1 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2" data-testid={`button-map-${order.id}`}>
                            <Map size={16} /> {language === "ar" ? "الخريطة" : "Map"}
                          </button>
                          <button onClick={() => { sessionStorage.setItem('previousPage', '/delivery'); setLocation(`/delivery-order-info/${order.id}`); }} className="flex-1 py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2" data-testid={`button-info-${order.id}`}>
                            <FileText size={16} /> {language === "ar" ? "البيانات" : "Info"}
                          </button>
                        </div>
                        {order.status === "shipped" && (
                          <button onClick={(e) => { e.stopPropagation(); handleMarkAsReceived(order.id); }} className="w-full py-2 px-4 mt-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2" data-testid={`button-mark-received-${order.id}`}>
                            <Check size={16} /> {t("markAsReceived", language)}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Map View */}
            {viewMode === "map" && (
              <div className="flex-1 overflow-hidden flex flex-col px-5 py-1 pb-24 gap-1">
                {mapError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{mapError}</div>
                ) : (
                  <>
                    <div id="leaflet-map" style={{ flex: 1, minHeight: 0, borderRadius: "16px", border: "1px solid #e5e7eb" }} />
                    <div className="p-1.5 bg-gray-50 rounded-2xl border border-gray-200 flex-shrink-0">
                      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                        <div>
                          <p className="text-xs text-gray-600 font-semibold">{language === "ar" ? "المسافة" : "Distance"}</p>
                          <p className="text-lg font-bold text-orange-600">{totalDistance.toFixed(1)} <span className="text-xs">km</span></p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-semibold">{language === "ar" ? "الوقت" : "Time"}</p>
                          <p className="text-lg font-bold text-blue-600">{Math.round((totalDistance / selectedSpeed) * 60)} <span className="text-xs">{language === "ar" ? "د" : "m"}</span></p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => setSelectedSpeed(30)} className={`flex-1 py-1 px-2 rounded-lg font-semibold text-sm ${selectedSpeed === 30 ? "bg-orange-500 text-white" : "bg-white text-gray-700 border border-gray-200"}`} data-testid="button-speed-30">30</button>
                        <button onClick={() => setSelectedSpeed(50)} className={`flex-1 py-1 px-2 rounded-lg font-semibold text-sm ${selectedSpeed === 50 ? "bg-orange-500 text-white" : "bg-white text-gray-700 border border-gray-200"}`} data-testid="button-speed-50">50</button>
                        <button onClick={() => setSelectedSpeed(70)} className={`flex-1 py-1 px-2 rounded-lg font-semibold text-sm ${selectedSpeed === 70 ? "bg-orange-500 text-white" : "bg-white text-gray-700 border border-gray-200"}`} data-testid="button-speed-70">70</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>

      {/* Recipient Modal */}
      {showRecipientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold mb-4">{t("confirmDelivery", language)}</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t("recipientName", language)}</label>
              <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder={t("recipientName", language)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500" data-testid="input-recipient-name" />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t("deliveryRemarks", language)}</label>
              <textarea value={deliveryRemarks} onChange={(e) => setDeliveryRemarks(e.target.value)} placeholder={t("deliveryRemarksPlaceholder", language)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 resize-none" rows={3} data-testid="input-delivery-remarks" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowRecipientModal(false); setSelectedOrderId(null); setRecipientName(""); setDeliveryRemarks(""); }} className="flex-1 py-2 px-4 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold rounded-lg" data-testid="button-cancel-delivery">
                {t("cancel", language)}
              </button>
              <button onClick={handleConfirmDelivery} className="flex-1 py-2 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg" data-testid="button-confirm-delivery">
                {t("confirm", language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileWrapper>
  );
}
