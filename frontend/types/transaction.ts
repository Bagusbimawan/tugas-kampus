export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'card';

export interface TransactionItemPayload {
  productId: number;
  quantity: number;
  discount?: number;
}

export interface CreateTransactionPayload {
  customerName?: string;
  discount?: number;
  tax?: number;
  items: TransactionItemPayload[];
  payment: {
    method: PaymentMethod;
    amountPaid: number;
    referenceNo?: string;
  };
}

export interface CreateTransactionResponse {
  success: boolean;
  transactionId: number;
  invoiceNumber: string;
}

export interface TransactionListItem {
  id: number;
  invoiceNumber: string;
  customerName?: string | null;
  subtotal: number | string;
  discount: number | string;
  tax: number | string;
  total: number | string;
  status: 'completed' | 'cancelled';
  createdAt: string;
  user: {
    id: number;
    name: string;
  };
  items?: Array<{
    id: number;
    quantity: number;
  }>;
  payment?: {
    method: PaymentMethod;
    amountPaid: number | string;
    changeAmount: number | string;
    referenceNo?: string | null;
  } | null;
}

export interface TransactionListResponse {
  data: TransactionListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ReceiptItem {
  productId: number;
  productName: string;
  price: number | string;
  quantity: number;
  discount: number | string;
  subtotal: number | string;
}

export interface ReceiptResponse {
  store: {
    name: string;
  };
  invoiceNumber: string;
  createdAt: string;
  cashier: {
    id: number;
    name: string;
    email?: string;
    role?: string;
  };
  customerName?: string | null;
  items: ReceiptItem[];
  summary: {
    subtotal: number | string;
    discount: number | string;
    tax: number | string;
    total: number | string;
    status: string;
    notes?: string | null;
  };
  payment: {
    method: PaymentMethod;
    amountPaid: number | string;
    changeAmount: number | string;
    referenceNo?: string | null;
  };
}

export interface TransactionDetailItem {
  id: number;
  productId: number;
  productName: string;
  price: number | string;
  quantity: number;
  discount: number | string;
  subtotal: number | string;
  product?: {
    id: number;
    name: string;
    sku?: string | null;
  };
}

export interface TransactionDetailResponse {
  id: number;
  invoiceNumber: string;
  customerName?: string | null;
  subtotal: number | string;
  discount: number | string;
  tax: number | string;
  total: number | string;
  status: 'completed' | 'cancelled';
  notes?: string | null;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email?: string;
    role?: string;
  };
  items: TransactionDetailItem[];
  payment?: {
    method: PaymentMethod;
    amountPaid: number | string;
    changeAmount: number | string;
    referenceNo?: string | null;
  } | null;
}
