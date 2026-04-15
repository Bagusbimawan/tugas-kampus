export interface SalesSummaryResponse {
  totalRevenue: number;
  totalTransactions: number;
  totalItems: number;
  avgOrderValue: number;
  dailyData: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
}

export interface TopProductItem {
  productId: number;
  productName: string;
  totalQty: number;
  totalRevenue: number;
}

export interface RevenueByCategoryItem {
  categoryId: number;
  categoryName: string;
  totalRevenue: number;
  totalQty: number;
}

