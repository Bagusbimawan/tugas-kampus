export interface Category {
  id: number;
  name: string;
  description?: string | null;
}

export interface Product {
  id: number;
  categoryId: number;
  name: string;
  sku?: string | null;
  price: number | string;
  costPrice?: number | string | null;
  stock: number;
  minStock: number;
  unit: string;
  imageUrl?: string | null;
  isActive: boolean;
  category?: {
    id: number;
    name: string;
  };
}

export interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  totalPages: number;
}

