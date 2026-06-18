import { create } from 'zustand';
import {
  getAllPurchases,
  insertPurchase,
  deletePurchase as dbDeletePurchase,
  updatePurchase as dbUpdatePurchase,
  generatePurchaseNumber,
  insertProduct,
  getProductsByItemId,
} from '@/lib/sqlite';
import { useSettingsStore, DEFAULT_EXCHANGE_RATE } from '@/store/settingsStore';
import type { Purchase, NewPurchaseInput } from '@/types/purchases';
import type { UpdatePurchaseInput } from '@/lib/sqlite';

interface PurchaseState {
  purchases: Purchase[];
  isLoading: boolean;
  loadPurchases: () => Promise<void>;
  createPurchase: (input: NewPurchaseInput) => Promise<Purchase>;
  updatePurchase: (id: number, input: UpdatePurchaseInput) => Promise<void>;
  deletePurchase: (id: number) => Promise<void>;
  searchPurchases: (query: string) => Purchase[];
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  purchases: [],
  isLoading: false,

  loadPurchases: async () => {
    set({ isLoading: true });
    try {
      const purchases = await getAllPurchases();
      set({ purchases, isLoading: false });
    } catch (err) {
      console.error('Failed to load purchases:', err);
      set({ isLoading: false });
    }
  },

  createPurchase: async (input: NewPurchaseInput): Promise<Purchase> => {
    const purchaseNumber = await generatePurchaseNumber();

    const totalIQD  = input.quantity * input.buyPriceIQD;
    const profitIQD = (input.sellPriceIQD - input.buyPriceIQD) * input.quantity;

    // Snapshot the current rate at the moment of purchase creation.
    // Reading from Zustand state is synchronous — no async needed.
    const exchangeRate = useSettingsStore.getState().exchangeRate ?? DEFAULT_EXCHANGE_RATE;

    const data: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'> = {
      purchaseNumber,
      date:            input.date || new Date().toISOString().slice(0, 10),
      supplierName:    input.supplierName.trim()    || null,
      supplierPhone:   input.supplierPhone.trim()   || null,
      supplierAddress: input.supplierAddress.trim() || null,
      productName:     input.productName.trim(),
      category:        input.category.trim()        || null,
      quantity:        input.quantity,
      buyPriceIQD:     input.buyPriceIQD,
      buyPriceUSD:     input.buyPriceUSD,
      sellPriceIQD:    input.sellPriceIQD,
      sellPriceUSD:    input.sellPriceUSD,
      totalIQD,
      profitIQD,
      exchangeRate,
      idType:          input.idType,
      itemIds:         input.itemIds,
      warranty:        input.warranty.trim()        || null,
      description:     input.description.trim()     || null,
      notes:           input.notes.trim()           || null,
      paymentStatus:   input.paymentStatus,
    };

    // Validate supplier uniqueness before committing the purchase
    if (data.supplierName) {
      const { upsertSupplier } = await import('@/lib/sqlite');
      await upsertSupplier({
        name:       data.supplierName,
        phone:      data.supplierPhone,
        address:    data.supplierAddress,
        selectedId: input.selectedSupplierId,
      });
    }

    const purchaseId = await insertPurchase(data);

    // Backfill purchase_items row (mirrors current single-product model)
    try {
      const { insertPurchaseItem } = await import('@/lib/sqlite');
      await insertPurchaseItem(purchaseId, {
        productName:  data.productName,
        category:     data.category,
        quantity:     data.quantity,
        buyPriceIQD:  data.buyPriceIQD,
        buyPriceUSD:  data.buyPriceUSD,
        sellPriceIQD: data.sellPriceIQD,
        sellPriceUSD: data.sellPriceUSD,
        lineTotalIQD: data.totalIQD,
        idType:       data.idType,
        itemIds:      data.itemIds,
      });
    } catch { /* non-critical */ }

    // Auto-create purchase debt when buying on credit
    if (input.paymentStatus === 'debt' && totalIQD > 0) {
      try {
        const { createPurchaseDebt } = await import('@/lib/sqlite');
        await createPurchaseDebt(purchaseId, {
          supplierName:    data.supplierName    ?? 'Unknown Supplier',
          supplierPhone:   data.supplierPhone,
          supplierAddress: data.supplierAddress,
          purchaseNumber,
          originalAmount:  totalIQD,
          paidAmount:      input.initialAmountPaid ?? 0,
          notes:           data.notes,
        });
        try {
          const { useDebtStore } = await import('@/store/debtStore');
          await useDebtStore.getState().reloadAfterSale();
        } catch { /* debt store not yet initialized */ }
      } catch (err) {
        console.error('Failed to create purchase debt:', err);
      }
    }

    // Wire purchase → products so Inventory and Sales can see the stock
    const baseProduct = {
      name:            data.productName,
      category:        data.category ?? 'General',
      purchasePrice:   data.buyPriceIQD,
      buyPriceUsd:     data.buyPriceUSD,
      sellingPrice:    data.sellPriceIQD,
      sellPriceUsd:    data.sellPriceUSD,
      unit:            'pcs',
      description:     data.description,
      purchaseId,
      supplierName:    data.supplierName,
      supplierPhone:   data.supplierPhone,
      supplierAddress: data.supplierAddress,
      purchaseDate:    data.date,
      paymentStatus:   data.paymentStatus,
      warranty:        data.warranty,
      imageUri:        input.imageUri ?? null,
      isActive:        true,
    };

    // Validate itemId uniqueness before any insertions
    const idsToCheck = (input.itemIds ?? []).filter(Boolean);
    const duplicates: string[] = [];
    for (const itemId of idsToCheck) {
      const existing = await getProductsByItemId(itemId);
      if (existing.length > 0) duplicates.push(itemId);
    }
    if (duplicates.length > 0) {
      throw new Error(`DUPLICATE_ITEM_ID|${duplicates.join(',')}`);
    }

    if (input.idType === 'custom') {
      for (const itemId of input.itemIds) {
        await insertProduct({ ...baseProduct, idMode: 'unique', quantity: 1, itemId });
      }
    } else {
      await insertProduct({
        ...baseProduct,
        idMode: 'repeatable',
        quantity: input.quantity,
        itemId: input.itemIds[0] ?? null,
      });
    }

    // Trigger inventory reload if the store is already mounted
    try {
      const { useInventoryStore } = await import('@/store/inventoryStore');
      await useInventoryStore.getState().loadInventory();
    } catch { /* inventory store not yet initialized */ }

    try {
      const { useReportStore } = await import('@/store/reportStore');
      await useReportStore.getState().reloadAfterMutation();
    } catch {}

    const newPurchase: Purchase = {
      ...data,
      id: purchaseId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({ purchases: [newPurchase, ...state.purchases] }));
    return newPurchase;
  },

  updatePurchase: async (id: number, input: UpdatePurchaseInput) => {
    await dbUpdatePurchase(id, input);
    await get().loadPurchases();

    try {
      const { useInventoryStore } = await import('@/store/inventoryStore');
      await useInventoryStore.getState().loadInventory();
    } catch { /* inventory store not yet initialized */ }

    try {
      const { useDebtStore } = await import('@/store/debtStore');
      await useDebtStore.getState().reloadAfterSale();
    } catch { /* debt store not yet initialized */ }

    try {
      const { useSupplierStore } = await import('@/store/supplierStore');
      await useSupplierStore.getState().loadSuppliers();
    } catch {}

    try {
      const { useReportStore } = await import('@/store/reportStore');
      await useReportStore.getState().reloadAfterMutation();
    } catch {}
  },

  deletePurchase: async (id: number) => {
    // deletePurchase in sqlite.ts cascades to purchase_debts + products
    await dbDeletePurchase(id);
    set((state) => ({ purchases: state.purchases.filter((p) => p.id !== id) }));

    try {
      const { useInventoryStore } = await import('@/store/inventoryStore');
      await useInventoryStore.getState().loadInventory();
    } catch { /* inventory store not yet initialized */ }

    try {
      const { useDebtStore } = await import('@/store/debtStore');
      await useDebtStore.getState().reloadAfterSale();
    } catch { /* debt store not yet initialized */ }

    try {
      const { useReportStore } = await import('@/store/reportStore');
      await useReportStore.getState().reloadAfterMutation();
    } catch {}
  },

  searchPurchases: (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return get().purchases;
    return get().purchases.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        (p.supplierName?.toLowerCase().includes(q) ?? false) ||
        p.purchaseNumber.toLowerCase().includes(q)
    );
  },
}));
