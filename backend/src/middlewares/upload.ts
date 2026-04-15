import { NextFunction, Request, Response } from 'express';
import multer from 'multer';

import { env } from '../config/env';
import { ApiError } from '../utils/api-error';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.maxUploadSizeMb * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new ApiError(400, 'Format gambar harus jpg, png, atau webp'));
      return;
    }

    cb(null, true);
  }
});

export const productImageUploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  upload.single('image')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new ApiError(400, `Ukuran gambar maksimal ${env.maxUploadSizeMb}MB`));
      return;
    }

    next(error);
  });
};
