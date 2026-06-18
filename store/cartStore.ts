import { create } from 'zustand';
import { roundToNearest250 } from '@/utils/rounding';
import type { CartItem, CustomerInput, PaymentMethod, Product, DiscountType, GlobalDiscountType } from '@/types/sales';

interface CartState {
  items: CartItem[];
  customerInput: CustomerInput;
  paymentMethod: PaymentMethod;
  paidAmount: string;
  saleNotes: string;
  globalDiscountType: GlobalDiscountType;
  globalDiscountValue: number;

  // Computed
  subtotal: () => number;
  discountTotal: () => number;
  globalDiscountAmount: () => number;
  grandTotal: () => number;
  remainingDebt: () => number;
  hasAnyLossWarning: () => boolean;

  // Mutations
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, qty: number) => void;
  updateSellingPrice: (productId: number, price: number) => void;
  updateDiscount: (productId: number, discount: number) => void;
  updateDiscountType: (productId: number, type: DiscountType) => void;
  updateDiscountPct: (productId: number, pct: number) => void;
  setGlobalDiscountType: (type: GlobalDiscountType) => void;
  setGlobalDiscountValue: (value: number) => void;
  setCustomerInput: (patch: Partial<CustomerInput>) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setPaidAmount: (amount: string) => void;
  setSaleNotes: (notes: string) => void;
  clearCart: () => void;
}

function calcLineTotal(sellingPrice: number, discount: number, qty: number): number {
  return Math.max(0, roundToNearest250((sellingPrice - discount) * qty));
}

function calcDiscountFromPct(sellingPrice: number, pct: number): number {
  return roundToNearest250(sellingPrice * pct / 100);
}

const emptyCustomer: CustomerInput = {
  name: '', phone: '', address: '', warranty: '', notes: '',
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerInput: { ...emptyCustomer },
  paymentMethod: 'cash',
  paidAmount: '',
  saleNotes: '',
  globalDiscountType: 'none',
  globalDiscountValue: 0,

  subtotal: () => get().items.reduce((sum, i) => sum + i.sellingPrice * i.quantity, 0),

  discountTotal: () => get().items.reduce((sum, i) => sum + i.discount * i.quantity, 0),

  globalDiscountAmount: () => {
    const s = get();
    if (s.globalDiscountType === 'none') return 0;
    if (s.globalDiscountType === 'percentage') {
      return roundToNearest250(s.subtotal() * s.globalDiscountValue / 100);
    }
    return s.globalDiscountValue;
  },

  grandTotal: () => {
    const s = get();
    return Math.max(0, s.subtotal() - s.discountTotal() - s.globalDiscountAmount());
  },

  remainingDebt: () => {
    const s = get();
    if (s.paymentMethod !== 'debt') return 0;
    const paid = parseFloat(s.paidAmount) || 0;
    return Math.max(0, s.grandTotal() - paid);
  },

  hasAnyLossWarning: () => get().items.some((i) => i.hasLossWarning),

  addItem: (product: Product) => {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);

      if (existing) {
        if (product.idMode === 'unique') return state;

        const newQty = existing.quantity + 1;
        if (newQty > product.quantity) return state;
        return {
          items: state.items.map((i) =>
            i.product.id === product.id
              ? {
                  ...i,
                  quantity: newQty,
                  lineTotal: calcLineTotal(i.sellingPrice, i.discount, newQty),
                }
              : i
          ),
        };
      }

      const newItem: CartItem = {
        product,
        quantity: 1,
        sellingPrice: product.sellingPrice,
        discount: 0,
        discountType: 'amount',
        discountPct: 0,
        lineTotal: product.sellingPrice,
        hasLossWarning: product.sellingPrice < product.purchasePrice,
      };
      return { items: [...state.items, newItem] };
    });
  },

  removeItem: (productId: number) => {
    set((state) => ({ items: state.items.filter((i) => i.product.id !== productId) }));
  },

  updateQuantity: (productId: number, qty: number) => {
    if (qty < 1) return;
    set((state) => {
      const item = state.items.find((i) => i.product.id === productId);
      if (!item) return state;
      const safeQty = item.product.idMode === 'repeatable'
        ? Math.min(qty, item.product.quantity)
        : qty;
      return {
        items: state.items.map((i) =>
          i.product.id === productId
            ? { ...i, quantity: safeQty, lineTotal: calcLineTotal(i.sellingPrice, i.discount, safeQty) }
            : i
        ),
      };
    });
  },

  updateSellingPrice: (productId: number, price: number) => {
    set((state) => ({
      items: state.items.map((i) => {
        if (i.product.id !== productId) return i;
        const newDiscount = i.discountType === 'percentage'
          ? calcDiscountFromPct(price, i.discountPct)
          : Math.min(i.discount, price);
        return {
          ...i,
          sellingPrice: price,
          discount: newDiscount,
          lineTotal: calcLineTotal(price, newDiscount, i.quantity),
          hasLossWarning: price < i.product.purchasePrice,
        };
      }),
    }));
  },

  updateDiscount: (productId: number, discount: number) => {
    set((state) => ({
      items: state.items.map((i) => {
        if (i.product.id !== productId) return i;
        const safeDiscount = Math.min(discount, i.sellingPrice);
        return {
          ...i,
          discount: safeDiscount,
          discountType: 'amount',
          discountPct: 0,
          lineTotal: calcLineTotal(i.sellingPrice, safeDiscount, i.quantity),
        };
      }),
    }));
  },

  updateDiscountType: (productId: number, type: DiscountType) => {
    set((state) => ({
      items: state.items.map((i) => {
        if (i.product.id !== productId) return i;
        const newDiscount = type === 'percentage'
          ? calcDiscountFromPct(i.sellingPrice, i.discountPct)
          : i.discount;
        return {
          ...i,
          discountType: type,
          discount: type === 'percentage' ? newDiscount : 0,
          discountPct: type === 'amount' ? 0 : i.discountPct,
          lineTotal: calcLineTotal(i.sellingPrice, type === 'percentage' ? newDiscount : 0, i.quantity),
        };
      }),
    }));
  },

  updateDiscountPct: (productId: number, pct: number) => {
    set((state) => ({
      items: state.items.map((i) => {
        if (i.product.id !== productId) return i;
        const safePct = Math.min(Math.max(0, pct), 100);
        const newDiscount = calcDiscountFromPct(i.sellingPrice, safePct);
        return {
          ...i,
          discountType: 'percentage',
          discountPct: safePct,
          discount: newDiscount,
          lineTotal: calcLineTotal(i.sellingPrice, newDiscount, i.quantity),
        };
      }),
    }));
  },

  setGlobalDiscountType: (type: GlobalDiscountType) => {
    set({ globalDiscountType: type, globalDiscountValue: 0 });
  },

  setGlobalDiscountValue: (value: number) => {
    set({ globalDiscountValue: Math.max(0, value) });
  },

  setCustomerInput: (patch) => {
    set((state) => ({ customerInput: { ...state.customerInput, ...patch } }));
  },

  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setPaidAmount: (amount) => set({ paidAmount: amount }),
  setSaleNotes: (notes) => set({ saleNotes: notes }),

  clearCart: () =>
    set({
      items: [],
      customerInput: { ...emptyCustomer },
      paymentMethod: 'cash',
      paidAmount: '',
      saleNotes: '',
      globalDiscountType: 'none',
      globalDiscountValue: 0,
    }),
}));
