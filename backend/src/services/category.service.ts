import { categoryRepository } from '../repositories/category.repository';
import { ApiError } from '../utils/api-error';
import { CategoryInput } from '../validations/category.validation';

export const categoryService = {
  getAll() {
    return categoryRepository.findAll();
  },

  async create(payload: CategoryInput) {
    return categoryRepository.create(payload);
  },

  async update(id: number, payload: CategoryInput) {
    const category = await categoryRepository.findById(id);

    if (!category) {
      throw new ApiError(404, 'Kategori tidak ditemukan');
    }

    return categoryRepository.update(category, payload);
  },

  async delete(id: number) {
    const category = await categoryRepository.findById(id);

    if (!category) {
      throw new ApiError(404, 'Kategori tidak ditemukan');
    }

    const productCount = await categoryRepository.countProducts(id);

    if (productCount > 0) {
      throw new ApiError(400, 'Kategori masih digunakan oleh produk');
    }

    await categoryRepository.destroy(category);
  }
};

