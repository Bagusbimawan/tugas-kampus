import bcrypt from 'bcryptjs';

import { userRepository } from '../repositories/user.repository';
import { ApiError } from '../utils/api-error';
import { PasswordInput, UserInput } from '../validations/user.validation';

const saltRounds = 10;

const ensureEmailUnique = async (email: string, excludedId?: number) => {
  const existingUser = await userRepository.findByEmail(email, excludedId);

  if (existingUser) {
    throw new ApiError(400, 'Email sudah digunakan');
  }
};

export const userService = {
  getAll() {
    return userRepository.findAll();
  },

  async create(payload: UserInput) {
    await ensureEmailUnique(payload.email);
    const hashedPassword = await bcrypt.hash(payload.password!, saltRounds);
    const user = await userRepository.create({
      ...payload,
      password: hashedPassword
    });

    return userRepository.findSafeById(user.id);
  },

  async update(id: number, payload: UserInput) {
    const user = await userRepository.findById(id);

    if (!user) {
      throw new ApiError(404, 'User tidak ditemukan');
    }

    await ensureEmailUnique(payload.email, id);
    await userRepository.update(user, {
      name: payload.name,
      email: payload.email,
      role: payload.role,
      isActive: payload.isActive
    });

    return userRepository.findSafeById(id);
  },

  async updatePassword(id: number, payload: PasswordInput) {
    const user = await userRepository.findById(id);

    if (!user) {
      throw new ApiError(404, 'User tidak ditemukan');
    }

    const hashedPassword = await bcrypt.hash(payload.password, saltRounds);
    await userRepository.update(user, { password: hashedPassword });

    return { message: 'Password user berhasil diperbarui' };
  },

  async softDelete(id: number) {
    const user = await userRepository.findById(id);

    if (!user) {
      throw new ApiError(404, 'User tidak ditemukan');
    }

    await userRepository.update(user, { isActive: false });

    return { message: 'User berhasil dinonaktifkan' };
  }
};

