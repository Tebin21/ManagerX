import { create } from 'zustand';
import type { CartItem, CustomerInput, PaymentMethod, Product } from '@/types/sales';

interface CartState {
  items: CartItem[];
  customerInput: CustomerInput;
  paymentMethod: PaymentMethod;
  paidAmount: string;
  saleNotes: string;

  // Computed
  subtotal: () => number;
  discountTotal: () => number;
  grandTotal: () => number;
  remainingDebt: () => number;
  hasAnyLossWarning: () => boolean;

  // Mutations
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, qty: number) => void;
  updateSellingPrice: (productId: number, price: number) => void;
  updateDiscount: (productId: number, discount: number) => void;
  setCustomerInput: (patch: Partial<CustomerInput>) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setPaidAmount: (amount: string) => void;
  setSaleNotes: (notes: string) => void;
  clearCart: () => void;
}

function calcLineTotal(sellingPrice: number, discount: number, qty: number): number {
  return Math.max(0, (sellingPrice - discount) * qty);
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

  subtotal: () => get().items.reduce((sum, i) => sum + i.sellingPrice * i.quantity, 0),
  discountTotal: () => get().items.reduce((sum, i) => sum + i.discount * i.quantity, 0),
  grandTotal: () => {
    const s = get();
    return s.subtotal() - s.discountTotal();
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
        // Unique items cap at 1
        if (product.idMode === 'unique') return state;

        const newQty = existing.quantity + 1;
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
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: qty, lineTotal: calcLineTotal(i.sellingPrice, i.discount, qty) }
          : i
      ),
    }));
  },

  updateSellingPrice: (productId: number, price: number) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId
          ? {
              ...i,
              sellingPrice: price,
              lineTotal: calcLineTotal(price, i.discount, i.quantity),
              hasLossWarning: price < i.product.purchasePrice,
            }
          : i
      ),
    }));
  },

  updateDiscount: (productId: number, discount: number) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId
          ? {
              ...i,
              discount,
              lineTotal: calcLineTotal(i.sellingPrice, discount, i.quantity),
            }
          : i
      ),
    }));
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
    }),
}));
