import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Edit2, Check, X, MapPin, Loader } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import { useUser } from "@/lib/userContext";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { toast } from "sonner";
import { getOrders, updateOrder, sendOrderEmailWithBrevo, sendOrderStatusUpdateEmail } from "@/lib/firebaseOps";
import { getStatusColor } from "@/lib/statusColors";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Create motorcycle delivery icon using emoji
const createDeliveryIcon = () => {
  const motorcycleEmoji = "🏍️";
  
  const canvas = document.createElement('canvas');
  canvas.width = 50;
  canvas.height = 50;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(motorcycleEmoji, canvas.width / 2, canvas.height / 2);
    
    const url = canvas.toDataURL('image/png');
    return L.icon({
      iconUrl: url,
      iconSize: [canvas.width, canvas.height],
      iconAnchor: [canvas.width / 2, canvas.height / 2],
      popupAnchor: [0, -canvas.height / 2],
    });
  }
  
  return L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
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
  customerEmail?: string;
  deliveryAddress?: string;
  notes?: string;
  deliveryUsername?: string;
  recipientName?: string;
  deliveryRemarks?: string;
  latitude?: number;
  longitude?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  driverLat?: number;
  driverLng?: number;
  userEmail?: string;
}

export default function OrderDetailsPage() {
  const [location, setLocation] = useLocation();
  const { user, isLoggedIn, isLoading: authLoading } = useUser();
  const { language } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("pending");
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [completedOrdersValue, setCompletedOrdersValue] = useState(0);
  const [orderUser, setOrderUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
  const [mapLat, setMapLat] = useState<number | null>(null);
  const [mapLng, setMapLng] = useState<number | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const driverMarker = useRef<L.Marker | null>(null);
  const routePolyline = useRef<L.Polyline | null>(null);

  // Extract order ID from URL
  const orderId = location.split("/order/")[1]?.split("?")[0];
  
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
    const driverLat = order?.driverLat;
    const driverLng = order?.driverLng;
    
    if (driverLat !== undefined && driverLat !== null && driverLng !== undefined && driverLng !== null && map.current) {
      console.log("✅ Adding driver marker:", driverLat, driverLng);
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
            console.log("Route data:", data);
            if (data.routes && data.routes[0] && map.current) {
              const coords = data.routes[0].geometry.coordinates.map((coord: any) => [coord[1], coord[0]]);
              if (routePolyline.current) routePolyline.current.remove();
              routePolyline.current = L.polyline(coords, { color: '#3b82f6', weight: 3, opacity: 0.7 }).addTo(map.current);
            }
          })
          .catch(err => console.log("Route error:", err));
      }
    } else {
      console.log("❌ Driver location not available - no marker shown");
    }
  }, [mapLat, mapLng, language, order?.driverLat, order?.driverLng, order?.latitude, order?.longitude]);

  // Update driver marker position when order location changes
  useEffect(() => {
    const driverLat = order?.driverLat;
    const driverLng = order?.driverLng;
    if (driverLat !== undefined && driverLat !== null && driverLng !== undefined && driverLng !== null && driverMarker.current && map.current) {
      driverMarker.current.setLatLng([driverLat, driverLng]);
    }
  }, [order?.driverLat, order?.driverLng]);

  // Geocode address when order is loaded - use deliveryLat/deliveryLng if available
  useEffect(() => {
    if (order && !mapLat) {
      if (order.deliveryLat && order.deliveryLng) {
        setMapLat(order.deliveryLat);
        setMapLng(order.deliveryLng);
      } else {
        geocodeAddress(order.shippingAddress || order.deliveryAddress || "");
      }
    }
  }, [order?.shippingAddress, order?.deliveryAddress, order?.deliveryLat, order?.deliveryLng, mapLat]);

  // Determine back path based on user role and store tab preference
  const handleBack = () => {
    // Check if there's a previousPage stored in sessionStorage
    const previousPage = sessionStorage.getItem('previousPage');
    const backPath = previousPage || '/profile';
    
    if (user?.role === 'admin') {
      sessionStorage.setItem('preferredTab', 'admin');
    } else {
      sessionStorage.removeItem('preferredTab');
    }
    
    sessionStorage.removeItem('previousPage'); // Clear after use
    setLocation(backPath);
  };

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      setLocation("/login");
    }

  }, [isLoggedIn, authLoading, setLocation, user]);

  useEffect(() => {
    setIsLoading(true);
    const fetchOrder = async () => {
      try {

        // Fetch from Firebase only
        const orders = await getOrders(user?.role === 'admin' ? undefined : user?.id);
        let foundOrder = null;
        
        // Try to find by URL ID first
        if (orderId) {
          foundOrder = orders?.find((o: any) => o.id === orderId);

        }
        
        // If not found, use the first order
        if (!foundOrder && orders && orders.length > 0) {
          foundOrder = orders[0];

        }
        
        if (foundOrder) {

          setOrder(foundOrder as Order);
        }
      } catch (error) {

      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, user]);

  // Fetch order user data
  useEffect(() => {
    if (!order?.userId) return;

    const fetchOrderUser = async () => {
      setUserLoading(true);
      try {
        const db = getFirestore();
        const userDocRef = doc(db, "users", order.userId || "");
        const userDocSnapshot = await getDoc(userDocRef);
        
        if (userDocSnapshot.exists()) {
          const userData = userDocSnapshot.data();
          setOrderUser(userData);

          if (userData.profileImage) {
            setUserProfileImage(userData.profileImage);
          }
        } else {

        }
      } catch (error) {

      } finally {
        setUserLoading(false);
      }
    };

    fetchOrderUser();
  }, [order?.userId]);

  // Calculate order statistics once order is loaded
  useEffect(() => {
    if (!order) return;

    // Calculate user order statistics for admin
    if (user?.role === 'admin' && order.userId) {
      const calculateStats = async () => {
        try {
          const allOrders = await getOrders();
          const userOrders = allOrders.filter((o: any) => o.userId === order.userId);
          const completedOrdersList = userOrders.filter((o: any) => o.status === 'completed');
          setTotalOrders(userOrders.length);
          setCompletedOrders(completedOrdersList.length);
          const totalValue = completedOrdersList.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
          setCompletedOrdersValue(totalValue);
        } catch (e) {

        }
      };
      calculateStats();
    }
  }, [order, user?.role]);


  const handleStatusUpdate = async (status: string) => {
    if (!order?.id || !status || status === order.status) return;
    
    setIsProcessing(true);
    try {
      const oldStatus = order.status;
      
      // Update the same document with new status
      const success = await updateOrder(order.id, { 
        status,
        updatedAt: new Date().toISOString()
      });
      
      if (success) {
        // Send status update email to customer
        const userEmail = orderUser?.email || order?.userEmail || order?.customerEmail;
        if (userEmail && order) {
          const updatedOrder = { ...order, status };
          await sendOrderStatusUpdateEmail(updatedOrder, userEmail, oldStatus).catch(() => {
            // Silent fail for email - order was still updated
          });
        }

        toast.success(language === "ar" ? "تم تحديث الحالة!" : "Status updated!");
        
        // Update current view with new status
        setOrder(prev => prev ? { ...prev, status } : null);
        setEditingStatus(false);
        setNewStatus("pending");
      } else {
        toast.error(language === "ar" ? "فشل تحديث الطلب" : "Failed to update order");
      }
    } catch (error: any) {
      toast.error(language === "ar" ? "خطأ: " + error?.message : "Error: " + error?.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 pb-4 pt-2 flex items-center gap-4 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{t("orderDetails", language)}</h1>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : !order ? (
          <div className="flex-1 flex flex-col items-center justify-center px-5">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-lg font-bold mb-2">{t("orderNotFound", language)}</h2>
            <button
              onClick={handleBack}
              className="px-5 py-2 bg-black text-white rounded-full text-sm font-semibold mt-4"
            >
              {user?.role === 'admin' ? t("backToAdmin", language) : t("backToAccount", language)}
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar pb-40 w-full">
            {/* Map Section */}
            {(order.shippingAddress || order.deliveryAddress) && order?.status !== "completed" && order?.status !== "received" && order?.status !== "cancelled" && (
              <div className="w-full">
                {mapLoading ? (
                  <div className="w-full bg-blue-50 border-b border-blue-200 flex items-center justify-center gap-2 py-3">
                    <Loader size={18} className="animate-spin text-blue-600" />
                    <span className="text-blue-600 font-semibold text-sm">{language === "ar" ? "جاري تحميل الخريطة..." : "Loading map..."}</span>
                  </div>
                ) : mapLat && mapLng ? (
                  <div className="w-full bg-blue-100 border-b border-blue-300 overflow-hidden h-64" ref={mapContainer}></div>
                ) : (
                  <div className="w-full bg-gray-200 border-b border-gray-300 py-8 flex items-center justify-center gap-2">
                    <MapPin size={20} className="text-gray-600" />
                    <span className="text-gray-600 font-semibold">{language === "ar" ? "لا توجد معلومات موقع" : "No location info"}</span>
                  </div>
                )}
              </div>
            )}
            {(order.shippingAddress || order.deliveryAddress) && (order?.status === "completed" || order?.status === "received") && (
              <div className="w-full bg-green-50 border-b border-green-300 py-8 flex items-center justify-center gap-2">
                <MapPin size={20} className="text-green-600" />
                <span className="text-green-600 font-semibold">{language === "ar" ? "تم التسليم - الخريطة غير متاحة" : "Delivered - Map unavailable"}</span>
              </div>
            )}
            
            <div className="w-full px-5 py-4 space-y-4">
              {/* Order Header */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("orderNumber", language)}</p>
                    <p className="font-semibold text-lg font-mono">#{order.orderNumber || order.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  {editingStatus ? (
                    <div className="flex gap-1 items-center">
                      <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="px-2 py-1 border rounded text-xs" data-testid="select-status">
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button type="button" onClick={() => {
                        if (newStatus && newStatus !== order.status) {
                          handleStatusUpdate(newStatus);
                        } else {
                          toast.error("Select different status");
                        }
                      }} disabled={isProcessing} className="px-3 py-1 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:bg-gray-400" data-testid="button-save-status">✓</button>
                      <button type="button" onClick={() => { setEditingStatus(false); setNewStatus(order?.status || "pending"); }} className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500" data-testid="button-cancel-status">✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded border ${getStatusColor(order?.status || "pending")}`}>{order?.status || "pending"}</span>
                      <button type="button" onClick={() => { 
                        setEditingStatus(true); 
                        setNewStatus(order?.status || "pending"); 
                      }} className="px-2 py-1 text-primary hover:bg-gray-100 rounded" data-testid="button-edit-status"><Edit2 className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                </p>
                {order.paymentMethod && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.paymentMethod === "card" ? t("cardPayment", language) : t("payOnDelivery", language)}
                  </p>
                )}
              </div>

              {/* Items */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="font-semibold text-sm mb-3">{t("items", language)}</h3>
                <div className="space-y-3">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <div key={idx} className="pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{item.quantity}x {item.title}</p>
                          </div>
                          <p className="text-sm font-bold text-gray-900 ml-2">L.E {(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                        {(item.selectedColor || item.selectedSize || item.selectedUnit) && (
                          <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex flex-wrap gap-2">
                              {item.selectedUnit && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-semibold text-gray-600">الوحدة:</span>
                                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[11px] font-semibold">
                                    {item.selectedUnit}
                                  </span>
                                </div>
                              )}
                              {item.selectedSize && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-semibold text-gray-600">المقاس:</span>
                                  <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[11px] font-semibold">
                                    {item.selectedSize}
                                  </span>
                                </div>
                              )}
                              {item.selectedColor && (() => {
                                const [colorName, colorHex] = typeof item.selectedColor === 'string' 
                                  ? item.selectedColor.split('|') 
                                  : [item.selectedColor, '#000000'];
                                return (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-semibold text-gray-600">اللون:</span>
                                    <div className="flex items-center gap-1 px-2 py-1 rounded-full border border-gray-300 bg-white">
                                      <div 
                                        className="w-3 h-3 rounded-full border border-gray-300"
                                        style={{backgroundColor: colorHex || '#000000'}}
                                        title={colorName}
                                      />
                                      <span className="text-[11px] font-semibold text-gray-700">{colorName}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("noItems", language)}</p>
                  )}
                </div>
              </div>

              {/* Customer & Delivery Details */}
              {(order.customerName || order.customerPhone || order.deliveryAddress || order.shippingAddress || order.shippingPhone || order.shippingZone || order.deliveryUsername || order.recipientName || order.deliveryRemarks) && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <h3 className="font-semibold text-sm mb-3">👤 {language === "ar" ? "بيانات التوصيل" : "Delivery Information"}</h3>
                  <div className="space-y-3">
                    {(order.customerName || order.shippingAddress) && (
                      <div>
                        <p className="text-xs text-muted-foreground">{language === "ar" ? "الاسم" : "Name"}</p>
                        <p className="text-sm font-medium">{order.customerName || order.shippingAddress || "N/A"}</p>
                      </div>
                    )}
                    {(order.customerPhone || order.shippingPhone) && (
                      <div>
                        <p className="text-xs text-muted-foreground">{t("phone", language)}</p>
                        <p className="text-sm font-medium">{order.customerPhone || order.shippingPhone || "N/A"}</p>
                      </div>
                    )}
                    {(order.deliveryAddress || order.shippingAddress) && (
                      <div>
                        <p className="text-xs text-muted-foreground">{t("address", language)}</p>
                        <p className="text-sm font-medium">{order.deliveryAddress || order.shippingAddress || "N/A"}</p>
                      </div>
                    )}
                    {order.shippingZone && (
                      <div>
                        <p className="text-xs text-muted-foreground">{t("zone", language)}</p>
                        <p className="text-sm font-medium">{order.shippingZone}</p>
                      </div>
                    )}
                    {order.shippingCost !== undefined && order.shippingCost > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">{t("shippingCost", language)}</p>
                        <p className="text-sm font-medium">L.E {order.shippingCost.toFixed(2)}</p>
                      </div>
                    )}
                    {order.recipientName && (
                      <div>
                        <p className="text-xs text-muted-foreground">{language === "ar" ? "المستلم" : "Recipient"}</p>
                        <p className="text-sm font-medium">{order.recipientName}</p>
                      </div>
                    )}
                    {order.deliveryUsername && (
                      <div>
                        <p className="text-xs text-muted-foreground">{language === "ar" ? "اسم الدليفرى" : "Delivery Driver"}</p>
                        <p className="text-sm font-medium">{order.deliveryUsername}</p>
                      </div>
                    )}
                    {order.deliveryRemarks && (
                      <div>
                        <p className="text-xs text-muted-foreground">{language === "ar" ? "ملاحظات التسليم" : "Delivery Remarks"}</p>
                        <p className="text-sm font-medium">{order.deliveryRemarks}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Notes */}
              {order.notes && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <h3 className="font-semibold text-sm mb-3">📝 {language === "ar" ? "ملاحظات" : "Notes"}</h3>
                  <p className="text-sm text-gray-900">{order.notes}</p>
                </div>
              )}

              {/* Order Summary */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="font-semibold text-sm mb-3">{t("orderSummary", language)} (L.E)</h3>
                <div className="space-y-2">
                  {order.subtotal !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("subtotal", language)}</span>
                      <span>{order.subtotal.toFixed(2)}</span>
                    </div>
                  )}
                  {order.discountedTotal !== undefined && order.subtotal !== undefined && order.discountedTotal < order.subtotal && (
                    <>
                      <div className="flex justify-between text-sm text-green-600 font-semibold">
                        <span>{language === "ar" ? "الخصم" : "Discount"}</span>
                        <span>-{(order.subtotal - order.discountedTotal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-green-600">
                        <span>{language === "ar" ? "بعد الخصم" : "After Discount"}</span>
                        <span>{order.discountedTotal.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {order.shippingCost !== undefined && order.shippingCost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("shipping", language)}</span>
                      <span>{order.shippingCost.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-gray-100 pt-2 mt-2">
                    <span>{t("total", language)}</span>
                    <span>L.E {order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* User Information */}
              {(orderUser?.username || order?.userId) && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="font-semibold text-sm mb-5">{language === "ar" ? "بيانات المستخدم" : "Customer Information"}</h3>
                  
                  <div className="flex items-center gap-6">
                    {/* User Avatar or Profile Image */}
                    {userProfileImage ? (
                      <img 
                        src={userProfileImage} 
                        alt="User Profile" 
                        className="w-24 h-24 rounded-full object-cover shadow-lg ring-4 ring-blue-100 flex-shrink-0" 
                        data-testid="avatar-user-image"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-5xl font-bold flex-shrink-0 shadow-lg ring-4 ring-blue-100" data-testid="avatar-user">
                        {userLoading ? "..." : (orderUser?.username?.charAt(0).toUpperCase() || "U")}
                      </div>
                    )}
                    
                    {/* User Details */}
                    <div className="flex-1 min-w-0">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{language === "ar" ? "الاسم" : "Name"}</p>
                        <p className="font-semibold text-sm mb-3" data-testid="text-username">{orderUser?.username || "-"}</p>
                      </div>
                      
                      {orderUser?.email && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">{language === "ar" ? "البريد الإلكتروني" : "Email"}</p>
                          <p className="font-medium text-sm text-blue-600 break-all" data-testid="text-email">{orderUser?.email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Statistics (Admin View) */}
              {user?.role === 'admin' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="font-semibold text-sm mb-4">{language === "ar" ? "إحصائيات الطلب" : "Order Statistics"}</h3>
                  
                  {/* Order Statistics */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">{language === "ar" ? "الأوردرات المكتملة" : "Completed Orders"}</p>
                      <p className="text-2xl font-bold text-emerald-700 mt-1" data-testid="text-completed-orders">{completedOrders}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">{language === "ar" ? "إجمالي الأوردرات" : "Total Orders"}</p>
                      <p className="text-2xl font-bold text-blue-700 mt-1" data-testid="text-total-orders">{totalOrders}</p>
                    </div>
                  </div>

                  {/* Completed Orders Value */}
                  {completedOrdersValue > 0 && (
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{language === "ar" ? "قيمة الأوردرات المكتملة" : "Completed Orders Value"}</p>
                      <p className="text-3xl font-bold text-emerald-600 mt-2" data-testid="text-completed-orders-value">L.E {completedOrdersValue.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              )}
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
