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
import { Check, Map, List, Loader, Navigation } from "lucide-react";
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
  const [mapLoading, setMapLoading] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "delivery")) {
      setLocation("/");
    }
  }, [isLoading, user, setLocation]);

  // Watch driver location continuously
  useEffect(() => {
    const DEFAULT_LAT = 30.0444;
    const DEFAULT_LNG = 31.2357;
    
    setCurrentLat(DEFAULT_LAT);
    setCurrentLng(DEFAULT_LNG);
    
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCurrentLat(lat);
          setCurrentLng(lng);
        },
        (error) => {
          console.log("Geolocation error:", error.code);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
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

  // Initialize map when switching to map view
  useEffect(() => {
    if (viewMode === "map" && currentLat && currentLng && !map.current) {
      const timer = setTimeout(() => {
        if (mapContainer.current && !map.current) {
          try {
            map.current = L.map(mapContainer.current).setView([currentLat, currentLng], 13);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution: '&copy; OpenStreetMap',
              maxZoom: 19,
            }).addTo(map.current);
            
            // Add marker for current location
            L.marker([currentLat, currentLng], {
              icon: L.icon({
                iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iIzIyYzU1ZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              })
            }).addTo(map.current).bindPopup(language === "ar" ? "📍 موقعك الحالي" : "📍 Your Location");
            
            map.current.invalidateSize();
            setMapLoading(false);
          } catch (error) {
            console.error("Map init error:", error);
            setMapLoading(false);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [viewMode, currentLat, currentLng]);

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
                <h1 className="text-xl font-bold text-gray-900">
                  {t("delivery", language)}
                </h1>
                <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-semibold">
                  {orders.filter(o => o.status === "shipped").length} {language === "ar" ? "في الطريق" : "in route"}
                </span>
              </div>

              {/* View Toggle Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                    viewMode === "list"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  data-testid="button-list-view"
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                    viewMode === "map"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  data-testid="button-map-view"
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
                        <div
                          key={order.id}
                          onClick={() => {
                            sessionStorage.setItem('previousPage', '/delivery');
                            setLocation(`/delivery-order/${order.id}`);
                          }}
                          className="w-full text-left p-4 bg-white border border-gray-200 rounded-2xl hover:border-orange-300 hover:shadow-md transition-all cursor-pointer"
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
                        </div>
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
                    <span className="text-blue-600 font-semibold">{language === "ar" ? "جاري تحميل الخريطة..." : "Loading map..."}</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Interactive Map */}
                    <div className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden" style={{ height: "600px" }}>
                      <div 
                        ref={mapContainer}
                        style={{ height: "100%", width: "100%", position: "relative" }}
                        className="rounded-2xl"
                      />
                      {/* Update Location Button */}
                      <button
                        onClick={() => {
                          if (map.current && currentLat && currentLng) {
                            map.current.setView([currentLat, currentLng], 13);
                            map.current.invalidateSize();
                          }
                        }}
                        className="absolute top-4 right-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-3 shadow-lg transition-colors z-20 flex items-center gap-2"
                        data-testid="button-set-location"
                        title={language === "ar" ? "تحديث الموقع" : "Update Location"}
                      >
                        <Navigation size={20} />
                        <span className="text-sm font-semibold">{language === "ar" ? "تحديث" : "Update"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

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
                className="flex-1 py-2 px-4 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold rounded-lg transition-colors"
                data-testid="button-cancel-delivery"
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
