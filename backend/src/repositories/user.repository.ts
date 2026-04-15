import { Op } from 'sequelize';

const { User } = require('../../models');

export const userRepository = {
  findAll() {
    return User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
  },

  findById(id: number) {
    return User.findByPk(id);
  },

  findSafeById(id: number) {
    return User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
  },

  findByEmail(email: string, excludedId?: number) {
    const where: Record<string, unknown> = { email };

    if (excludedId) {
      where.id = { [Op.ne]: excludedId };
    }

    return User.findOne({ where });
  },

  create(payload: Record<string, unknown>) {
    return User.create(payload);
  },

  update(user: any, payload: Record<string, unknown>) {
    return user.update(payload);
  }
};

