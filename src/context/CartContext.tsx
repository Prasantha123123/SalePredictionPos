import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { productCatalog } from '../lib/navigation';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  addItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => void;
  couponCode: string;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState('');

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = couponCode.trim().toUpperCase() === 'SAVE10' ? subtotal * 0.1 : 0;
  const total = Math.max(subtotal - discount, 0);

  const value = useMemo<CartContextValue>(() => ({
    items,
    subtotal,
    discount,
    total,
    couponCode,
    addItem: (id: string) => {
      const product = productCatalog.find((entry) => entry.id === id);

      if (!product) {
        return;
      }

      setItems((current) => {
        const existing = current.find((item) => item.id === id);

        if (existing) {
          return current.map((item) => item.id === id ? { ...item, quantity: item.quantity + 1 } : item);
        }

        return [...current, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
      });
    },
    updateQuantity: (id: string, quantity: number) => {
      setItems((current) => current
        .map((item) => item.id === id ? { ...item, quantity } : item)
        .filter((item) => item.quantity > 0));
    },
    removeItem: (id: string) => {
      setItems((current) => current.filter((item) => item.id !== id));
    },
    clearCart: () => {
      setItems([]);
      setCouponCode('');
    },
    applyCoupon: (code: string) => {
      setCouponCode(code);
    },
  }), [couponCode, discount, items, subtotal, total]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }

  return context;
}