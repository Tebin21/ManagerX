import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
}

type CartAction =
  | { type: 'ADD'; item: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE'; productId: number }
  | { type: 'SET_QTY'; productId: number; quantity: number }
  | { type: 'CLEAR' };

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'ADD': {
      const existing = state.find((i) => i.productId === action.item.productId);
      if (existing) {
        return state.map((i) =>
          i.productId === action.item.productId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...state, { ...action.item, quantity: 1 }];
    }
    case 'REMOVE':
      return state.filter((i) => i.productId !== action.productId);
    case 'SET_QTY':
      if (action.quantity <= 0) return state.filter((i) => i.productId !== action.productId);
      return state.map((i) => (i.productId === action.productId ? { ...i, quantity: action.quantity } : i));
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function storageKeyFor(slug: string): string {
  // Per-slug key so two different stores' carts never leak into each other in
  // the same browser (a visitor could plausibly browse more than one ManagerX
  // storefront).
  return `cart_${slug}`;
}

function readInitialState(slug: string): CartItem[] {
  try {
    const raw = localStorage.getItem(storageKeyFor(slug));
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, slug, readInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(storageKeyFor(slug), JSON.stringify(items));
    } catch {
      // localStorage unavailable (e.g. private browsing quota) — cart just won't
      // persist across reloads, which is a harmless degradation, not an error to surface.
    }
  }, [slug, items]);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return {
      items,
      count,
      subtotal,
      addItem: (item) => dispatch({ type: 'ADD', item }),
      removeItem: (productId) => dispatch({ type: 'REMOVE', productId }),
      setQuantity: (productId, quantity) => dispatch({ type: 'SET_QTY', productId, quantity }),
      clear: () => dispatch({ type: 'CLEAR' }),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart() must be used within a CartProvider');
  return ctx;
}
