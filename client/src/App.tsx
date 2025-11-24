import { Switch, Route, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/lib/cartContext";
import { UserProvider } from "@/lib/userContext";
import { LanguageProvider } from "@/lib/languageContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ProfilePage from "@/pages/profile";
import SettingsPage from "@/pages/settings";
import CartPage from "@/pages/cart";
import CheckoutPage from "@/pages/checkout";
import OrdersPage from "@/pages/orders";
import OrderDetailsPage from "@/pages/order-details";
import ProductDetailsPage from "@/pages/product-details";
import LoginPage from "@/pages/login";
import DiscountsPage from "@/pages/discounts";
import NotificationSetupPage from "@/pages/notification-setup";
import SetupPage from "@/pages/setup";
import { isFirebaseConfigured, initializeFirebase } from "@/lib/firebaseConfigStorage";

function Router() {
  const [location] = useLocation();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if configured and initialize
    if (isFirebaseConfigured()) {
      initializeFirebase();
      setNeedsSetup(false);
    } else {
      setNeedsSetup(true);
    }
    setIsChecking(false);
  }, []);

  if (isChecking) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (needsSetup && location !== "/setup") {
    return <Route component={SetupPage} />;
  }

  return (
    <Switch>
      <Route path="/setup" component={SetupPage} />
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/order/:id" component={OrderDetailsPage} />
      <Route path="/product/:id" component={ProductDetailsPage} />
      <Route path="/discounts" component={DiscountsPage} />
      <Route path="/notification-setup" component={NotificationSetupPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <UserProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </CartProvider>
        </UserProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
