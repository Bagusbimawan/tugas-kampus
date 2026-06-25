import { categoryRepository } from '../repositories/category.repository';
import { ApiError } from '../utils/api-error';
import { CategoryInput } from '../validations/category.validation';

const ensureUniqueName = async (name: string, excludedId?: number) => {
  const existingCategory = await categoryRepository.findByName(name, excludedId);

  if (existingCategory) {
    throw new ApiError(400, 'Nama kategori sudah digunakan');
  }
};

export const categoryService = {
  getAll() {
    return categoryRepository.findAll();
  },

  async create(payload: CategoryInput) {
    await ensureUniqueName(payload.name);
    return categoryRepository.create({
      name: payload.name.trim(),
      description: payload.description?.trim() || undefined
    });
  },

  async update(id: number, payload: CategoryInput) {
    const category = await categoryRepository.findById(id);

    if (!category) {
      throw new ApiError(404, 'Kategori tidak ditemukan');
    }

    await ensureUniqueName(payload.name, id);

    return categoryRepository.update(category, {
      name: payload.name.trim(),
      description: payload.description?.trim() || undefined
    });
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

