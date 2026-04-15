import { create } from 'zustand';

import { Product } from '../types/product';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  stock: number;
  minStock: number;
  unit: string;
  imageUrl?: string | null;
  quantity: number;
  discount: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product) => void;
  updateQty: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  setDiscount: (productId: number, discount: number) => void;
  getSubtotal: () => number;
  getTotalItems: () => number;
}

const toCartItem = (product: Product): CartItem => ({
  productId: product.id,
  name: product.name,
  price: Number(product.price),
  stock: product.stock,
  minStock: product.minStock,
  unit: product.unit,
  imageUrl: product.imageUrl || null,
  quantity: 1,
  discount: 0
});

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (product) => {
    set((state) => {
      const existingItem = state.items.find((item) => item.productId === product.id);

      if (!existingItem) {
        return {
          items: [...state.items, toCartItem(product)]
        };
      }

      if (existingItem.quantity >= existingItem.stock) {
        return state;
      }

      return {
        items: state.items.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      };
    });
  },
  updateQty: (productId, quantity) => {
    set((state) => ({
      items: state.items
        .map((item) => {
          if (item.productId !== productId) {
            return item;
          }

          const nextQty = Math.max(0, Math.min(quantity, item.stock));
          return { ...item, quantity: nextQty };
        })
        .filter((item) => item.quantity > 0)
    }));
  },
  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId)
    }));
  },
  clearCart: () => {
    set({ items: [] });
  },
  setDiscount: (productId, discount) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId ? { ...item, discount: Math.max(0, discount) } : item
      )
    }));
  },
  getSubtotal: () => {
    return get().items.reduce((total, item) => {
      return total + item.price * item.quantity - item.discount;
    }, 0);
  },
  getTotalItems: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  }
}));

