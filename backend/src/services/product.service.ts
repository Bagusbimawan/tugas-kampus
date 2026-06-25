import { Transaction } from 'sequelize';

import { categoryRepository } from '../repositories/category.repository';
import { productRepository } from '../repositories/product.repository';
import { stockRepository } from '../repositories/stock.repository';
import { s3Service } from './s3.service';
import { ApiError } from '../utils/api-error';
import {
  ProductInput,
  ProductQueryInput
} from '../validations/product.validation';

const normalizeSku = (sku?: string | null) => {
  if (!sku || !sku.trim()) {
    return null;
  }

  return sku.trim();
};

const ensureCategoryExists = async (categoryId: number) => {
  const category = await categoryRepository.findById(categoryId);

  if (!category) {
    throw new ApiError(400, 'Kategori tidak ditemukan');
  }
};

const ensureUniqueName = async (name: string, excludedId?: number) => {
  const existingProduct = await productRepository.findByName(name, excludedId);

  if (existingProduct) {
    const statusLabel = existingProduct.isActive ? 'aktif' : 'nonaktif';
    throw new ApiError(400, `Nama produk sudah digunakan oleh produk ${statusLabel}`);
  }
};

const ensureUniqueSku = async (sku?: string | null, excludedId?: number) => {
  const normalizedSku = normalizeSku(sku);

  if (!normalizedSku) {
    return null;
  }

  const existingProduct = await productRepository.findBySku(normalizedSku, excludedId);

  if (existingProduct) {
    throw new ApiError(400, 'SKU sudah digunakan');
  }

  return normalizedSku;
};

export const productService = {
  async getAll(params: ProductQueryInput) {
    const offset = (params.page - 1) * params.limit;
    const result = await productRepository.findAndCountAll({
      ...params,
      offset
    });

    return {
      data: result.rows,
      total: result.count,
      page: params.page,
      totalPages: Math.ceil(result.count / params.limit) || 1
    };
  },

  quickSearch(q: string) {
    return productRepository.quickSearch(q);
  },

  async getById(id: number) {
    const product = await productRepository.findById(id);

    if (!product) {
      throw new ApiError(404, 'Produk tidak ditemukan');
    }

    return product;
  },

  async create(payload: ProductInput, userId: number) {
    await ensureCategoryExists(payload.categoryId);
    await ensureUniqueName(payload.name);
    const sku = await ensureUniqueSku(payload.sku);

    return stockRepository.sequelize.transaction(async (transaction: Transaction) => {
      const product = await productRepository.create(
        {
          ...payload,
          sku
        },
        transaction
      );

      if (payload.stock > 0) {
        await stockRepository.createLog(
          {
            productId: product.id,
            userId,
            type: 'in',
            qtyBefore: 0,
            qtyChange: payload.stock,
            qtyAfter: payload.stock,
            reason: 'Stok awal produk'
          },
          transaction
        );
      }

      return productRepository.findById(product.id, { transaction });
    });
  },

  async update(id: number, payload: ProductInput, userId: number) {
    const product = await productRepository.findById(id, { include: [] });

    if (!product) {
      throw new ApiError(404, 'Produk tidak ditemukan');
    }

    await ensureCategoryExists(payload.categoryId);
    await ensureUniqueName(payload.name, id);
    const sku = await ensureUniqueSku(payload.sku, id);

    return stockRepository.sequelize.transaction(async (transaction: Transaction) => {
      const currentProduct = await stockRepository.findProductById(id, transaction);

      if (!currentProduct) {
        throw new ApiError(404, 'Produk tidak ditemukan');
      }

      const qtyBefore = currentProduct.stock;

      await productRepository.update(
        currentProduct,
        {
          ...payload,
          sku,
          stock: qtyBefore
        },
        transaction
      );

      return productRepository.findById(id, { transaction });
    });
  },

  async softDelete(id: number) {
    const product = await productRepository.findById(id, { include: [] });

    if (!product) {
      throw new ApiError(404, 'Produk tidak ditemukan');
    }

    return productRepository.update(product, { isActive: false });
  },

  async uploadImage(id: number, file?: Express.Multer.File) {
    const product = await productRepository.findById(id, { include: [] });

    if (!product) {
      throw new ApiError(404, 'Produk tidak ditemukan');
    }

    if (!file) {
      throw new ApiError(400, 'File gambar wajib diunggah');
    }

    const { imageUrl } = await s3Service.uploadProductImage(file, id);

    await productRepository.update(product, { imageUrl });

    return productRepository.findById(id);
  }
};
