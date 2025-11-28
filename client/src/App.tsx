import { Switch, Route, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/lib/cartContext";
import { UserProvider } from "@/lib/userContext";
import { LanguageProvider } from "@/lib/languageContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ProfilePage from "@/pages/profile";
import DeliveryPage from "@/pages/delivery";
import DeliveryDetailsPage from "@/pages/delivery-details";
import SettingsPage from "@/pages/settings";
import CartPage from "@/pages/cart";
import CheckoutPage from "@/pages/checkout";
import OrdersPage from "@/pages/orders";
import OrderDetailsPage from "@/pages/order-details";
import ProductDetailsPage from "@/pages/product-details";
import LoginPage from "@/pages/login";
import ForgotPasswordPage from "@/pages/forgot-password";
import DiscountsPage from "@/pages/discounts";
import NotificationSetupPage from "@/pages/notification-setup";
import AdminNotificationsPage from "@/pages/admin-notifications";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/delivery" component={DeliveryPage} />
      <Route path="/delivery-order/:id" component={DeliveryDetailsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/order/:id" component={OrderDetailsPage} />
      <Route path="/product/:id" component={ProductDetailsPage} />
      <Route path="/discounts" component={DiscountsPage} />
      <Route path="/notification-setup" component={NotificationSetupPage} />
      <Route path="/admin-notifications" component={AdminNotificationsPage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <Router base="/storeshope">
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <UserProvider>
            <CartProvider>
              <TooltipProvider>
                <Toaster />
                <AppRouter />
              </TooltipProvider>
            </CartProvider>
          </UserProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
