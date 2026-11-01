'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type { StoreProduct } from '@/lib/storefront/storeApi';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  stock?: number;
}

interface CartContextValue {
  items: CartItem[];
  totalCount: number;
  totalPrice: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: StoreProduct, qty?: number) => boolean;
  toggleSelect: (product: StoreProduct) => void;
  updateQuantity: (productId: number, quantity: number) => boolean;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: number) => number;
  isItemSelected: (productId: number) => boolean;
  showToast: (message: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

interface CartProviderProps {
  children: React.ReactNode;
  storeSlug: string;
}

export function CartProvider({ children, storeSlug }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // Store-isolated storage key to prevent any cross-store data leakage!
  const storageKey = useMemo(() => {
    const safeSlug = (storeSlug || 'default').trim().toLowerCase();
    return `froshiar_store_cart_${safeSlug}`;
  }, [storeSlug]);

  // Load cart strictly for this store on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (err) {
      console.error('[Cart] Failed to load cart from storage:', err);
    } finally {
      setIsHydrated(true);
    }
  }, [storageKey]);

  // Persist cart strictly for this store whenever items change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (err) {
      console.error('[Cart] Failed to save cart to storage:', err);
    }
  }, [items, storageKey, isHydrated]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((prev) => !prev), []);

  const addItem = useCallback(
    (product: StoreProduct, qty: number = 1): boolean => {
      if (qty <= 0) return false;
      const stockLimit = product.quantity !== undefined ? product.quantity : 9999;

      if (stockLimit <= 0) {
        showToast('ئەم کاڵایە لە کۆگادا بەردەست نییە');
        return false;
      }

      let success = true;

      setItems((prev) => {
        const existingIndex = prev.findIndex((i) => i.productId === product.productId);
        if (existingIndex > -1) {
          const currentQty = prev[existingIndex].quantity;
          const nextQty = currentQty + qty;

          if (nextQty > stockLimit) {
            showToast(`تەنها تا ${stockLimit} دانە دەتوانیت داوا بکەیت، لە کۆگادا نەماوە`);
            success = false;
            // Cap at stockLimit
            const next = [...prev];
            next[existingIndex] = {
              ...next[existingIndex],
              quantity: Math.min(stockLimit, Math.max(currentQty, stockLimit)),
              stock: stockLimit,
            };
            return next;
          }

          const next = [...prev];
          next[existingIndex] = {
            ...next[existingIndex],
            quantity: nextQty,
            stock: stockLimit,
          };
          return next;
        }

        // New item
        if (qty > stockLimit) {
          showToast(`تەنها تا ${stockLimit} دانە دەتوانیت داوا بکەیت، لە کۆگادا نەماوە`);
          success = false;
          return [
            ...prev,
            {
              productId: product.productId,
              name: product.name,
              price: product.price,
              imageUrl: product.imageUrl,
              quantity: stockLimit,
              stock: stockLimit,
            },
          ];
        }

        return [
          ...prev,
          {
            productId: product.productId,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            quantity: qty,
            stock: stockLimit,
          },
        ];
      });

      return success;
    },
    [showToast]
  );

  const toggleSelect = useCallback(
    (product: StoreProduct) => {
      const exists = items.some((i) => i.productId === product.productId);
      if (exists) {
        // Deselect
        setItems((prev) => prev.filter((i) => i.productId !== product.productId));
      } else {
        // Select (adds 1 respecting stock)
        addItem(product, 1);
      }
    },
    [items, addItem]
  );

  const updateQuantity = useCallback(
    (productId: number, quantity: number): boolean => {
      let allowed = true;

      setItems((prev) => {
        if (quantity <= 0) {
          return prev.filter((i) => i.productId !== productId);
        }

        return prev.map((item) => {
          if (item.productId !== productId) return item;

          const stockLimit = item.stock !== undefined ? item.stock : 9999;
          if (quantity > stockLimit) {
            showToast(`تەنها تا ${stockLimit} دانە دەتوانیت داوا بکەیت، لە کۆگادا نەماوە`);
            allowed = false;
            return { ...item, quantity: stockLimit };
          }

          return { ...item, quantity };
        });
      });

      return allowed;
    },
    [showToast]
  );

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getItemQuantity = useCallback(
    (productId: number) => {
      const found = items.find((i) => i.productId === productId);
      return found ? found.quantity : 0;
    },
    [items]
  );

  const isItemSelected = useCallback(
    (productId: number) => {
      return items.some((i) => i.productId === productId);
    },
    [items]
  );

  const totalCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const totalPrice = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      totalCount,
      totalPrice,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      toggleSelect,
      updateQuantity,
      removeItem,
      clearCart,
      getItemQuantity,
      isItemSelected,
      showToast,
    }),
    [
      items,
      totalCount,
      totalPrice,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      toggleSelect,
      updateQuantity,
      removeItem,
      clearCart,
      getItemQuantity,
      isItemSelected,
      showToast,
    ]
  );

  return (
    <CartContext.Provider value={value}>
      {children}

      {/* Global Stock Ceiling Alert Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-6 inset-x-4 z-50 flex justify-center pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <div className="max-w-md rounded-2xl bg-slate-900/95 px-5 py-3 text-xs sm:text-sm font-bold text-amber-300 shadow-2xl ring-1 ring-white/10 backdrop-blur-md dark:bg-slate-800/95 dark:text-amber-300 flex items-center gap-2.5">
            <span className="text-base">⚠️</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
