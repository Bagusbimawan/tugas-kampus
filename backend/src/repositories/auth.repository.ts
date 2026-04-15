const { User } = require('../../models');

export const authRepository = {
  findByEmail(email: string) {
    return User.findOne({ where: { email } });
  },

  findById(id: number) {
    return User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
  }
};

