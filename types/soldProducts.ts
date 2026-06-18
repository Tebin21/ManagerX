export interface SoldProductRecord {
  id: number
  saleId: number
  invoiceNumber: string
  productId: number
  productName: string
  itemId: string | null
  soldQty: number
  sellingPrice: number
  purchasePrice: number
  discount: number
  lineTotal: number
  profit: number
  customerName: string | null
  customerPhone: string | null
  customerId: number | null
  paymentMethod: 'cash' | 'debt' | 'fib'
  saleStatus: 'completed' | 'cancelled'
  paidAmount: number
  remainingDebt: number
  soldDate: string
  imageUri: string | null
}

export type SoldSortBy = 'date' | 'customer' | 'product' | 'profit'
export type SoldPaymentFilter = 'all' | 'cash' | 'debt' | 'fib'
