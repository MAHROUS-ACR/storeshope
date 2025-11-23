export type Language = 'en' | 'ar';

export const translations = {
  en: {
    // Bottom Navigation
    home: "Home",
    cart: "Cart",
    profile: "Profile",
    
    // Home Page
    categories: "Categories",
    products: "Products",
    noProducts: "No products available",
    
    // Product Card
    addToCart: "Add to Cart",
    unavailable: "Unavailable",
    
    // Product Details
    details: "Details",
    quantity: "Quantity",
    selectColor: "Select Color",
    selectSize: "Select Size",
    selectUnit: "Select Unit",
    price: "Price",
    description: "Description",
    
    // Cart
    yourCart: "Your Cart",
    cartEmpty: "Your cart is empty",
    subtotal: "Subtotal",
    total: "Total",
    checkout: "Checkout",
    removeItem: "Remove Item",
    
    // Checkout
    checkoutPage: "Checkout",
    paymentMethod: "Payment Method",
    cardPayment: "Card Payment",
    cashOnDelivery: "Cash on Delivery",
    deliveryAddress: "Delivery Address",
    completeOrder: "Complete Order",
    
    // Profile
    account: "Account",
    admin: "Admin",
    myOrders: "My Orders",
    notifications: "Notifications",
    helpSupport: "Help & Support",
    logout: "Logout",
    language: "Language",
    
    // Admin Panel
    orders: "Orders",
    users: "Users",
    storeSettings: "Store Settings",
    shippingZones: "Shipping Zones",
    analytics: "Analytics",
    
    // Common
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    add: "Add",
    update: "Update",
    search: "Search",
    filter: "Filter",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    
    // Messages
    addedToCart: "Added to cart successfully",
    productNotAvailable: "This product is not available",
    failedToAddCart: "Failed to add to cart",
    failedToCheckout: "Failed to complete checkout",
    orderPlaced: "Order placed successfully",
    profileUpdated: "Profile updated successfully",
    productUpdated: "Product updated successfully",
    productAdded: "Product added successfully",
    productDeleted: "Product deleted successfully",
  },
  ar: {
    // Bottom Navigation
    home: "الرئيسية",
    cart: "السلة",
    profile: "الملف الشخصي",
    
    // Home Page
    categories: "الفئات",
    products: "المنتجات",
    noProducts: "لا توجد منتجات متاحة",
    
    // Product Card
    addToCart: "أضف إلى السلة",
    unavailable: "غير متاح",
    
    // Product Details
    details: "التفاصيل",
    quantity: "الكمية",
    selectColor: "اختر اللون",
    selectSize: "اختر الحجم",
    selectUnit: "اختر الوحدة",
    price: "السعر",
    description: "الوصف",
    
    // Cart
    yourCart: "سلتك",
    cartEmpty: "سلتك فارغة",
    subtotal: "المجموع الفرعي",
    total: "الإجمالي",
    checkout: "الدفع",
    removeItem: "إزالة المنتج",
    
    // Checkout
    checkoutPage: "الدفع",
    paymentMethod: "طريقة الدفع",
    cardPayment: "دفع ببطاقة",
    cashOnDelivery: "الدفع عند الاستلام",
    deliveryAddress: "عنوان التسليم",
    completeOrder: "إتمام الطلب",
    
    // Profile
    account: "الحساب",
    admin: "الإدارة",
    myOrders: "طلباتي",
    notifications: "الإخطارات",
    helpSupport: "المساعدة والدعم",
    logout: "تسجيل الخروج",
    language: "اللغة",
    
    // Admin Panel
    orders: "الطلبات",
    users: "المستخدمون",
    storeSettings: "إعدادات المتجر",
    shippingZones: "مناطق الشحن",
    analytics: "التحليلات",
    
    // Common
    edit: "تعديل",
    delete: "حذف",
    save: "حفظ",
    cancel: "إلغاء",
    add: "إضافة",
    update: "تحديث",
    search: "بحث",
    filter: "تصفية",
    loading: "جارٍ التحميل...",
    error: "خطأ",
    success: "نجح",
    
    // Messages
    addedToCart: "تمت الإضافة إلى السلة بنجاح",
    productNotAvailable: "هذا المنتج غير متاح",
    failedToAddCart: "فشل إضافة المنتج إلى السلة",
    failedToCheckout: "فشل إتمام الطلب",
    orderPlaced: "تم إنشاء الطلب بنجاح",
    profileUpdated: "تم تحديث الملف الشخصي بنجاح",
    productUpdated: "تم تحديث المنتج بنجاح",
    productAdded: "تم إضافة المنتج بنجاح",
    productDeleted: "تم حذف المنتج بنجاح",
  },
};

export const t = (key: keyof typeof translations.en, language: Language = 'en') => {
  return translations[language][key] || translations.en[key];
};
