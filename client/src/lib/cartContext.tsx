import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export interface CartItem {
  id: string;
  _uniqueId: string; // Unique identifier combining id + variants
  title: string;
  price: number;
  quantity: number;
  image?: string;
  selectedColor?: string;
  selectedSize?: string;
  selectedUnit?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (uniqueId: string) => void;
  updateQuantity: (uniqueId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

const defaultCartValue: CartContextType = {
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  total: 0,
};

const CartContext = createContext<CartContextType>(defaultCartValue);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cart");
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (error) {

    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(items));
    } catch (error) {

    }
  }, [items]);

  const addItem = (newItem: CartItem) => {

    setItems(prev => {

      // Check if item with same uniqueId already exists
      const existing = prev.find(item => item._uniqueId === newItem._uniqueId);
      if (existing) {

        return prev.map(item =>
          item._uniqueId === newItem._uniqueId
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        );
      }

      const newItems = [...prev, newItem];

      return newItems;
    });
  };

  const removeItem = (uniqueId: string) => {
    setItems(prev => prev.filter(item => item._uniqueId !== uniqueId));
  };

  const updateQuantity = (uniqueId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(uniqueId);
    } else {
      setItems(prev =>
        prev.map(item =>
          item._uniqueId === uniqueId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  return context || defaultCartValue;
}
