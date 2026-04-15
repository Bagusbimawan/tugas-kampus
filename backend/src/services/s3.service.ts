import crypto from 'crypto';
import path from 'path';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { env } from '../config/env';
import { ApiError } from '../utils/api-error';

const s3Client = new S3Client({
  region: env.awsRegion,
  credentials:
    env.lightsailBucketAccessKeyId && env.lightsailBucketSecretAccessKey
      ? {
          accessKeyId: env.lightsailBucketAccessKeyId,
          secretAccessKey: env.lightsailBucketSecretAccessKey
        }
      : undefined
});

const sanitizeKeyPart = (value: string) => value.toLowerCase().replace(/[^a-z0-9/_-]+/g, '-');

const buildFileExtension = (originalName: string, mimeType: string) => {
  const extensionFromName = path.extname(originalName).toLowerCase();

  if (extensionFromName) {
    return extensionFromName;
  }

  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    default:
      return '';
  }
};

const buildPublicUrl = (key: string) => {
  if (env.lightsailBucketPublicUrl) {
    return `${env.lightsailBucketPublicUrl.replace(/\/$/, '')}/${key}`;
  }

  return `https://${env.lightsailBucketName}.${env.awsRegion}.amazonaws.com/${key}`;
};

export const s3Service = {
  async uploadProductImage(file: Express.Multer.File, productId: number) {
    if (!env.lightsailBucketName) {
      throw new ApiError(500, 'LIGHTSAIL_BUCKET_NAME belum dikonfigurasi');
    }

    if (!env.lightsailBucketAccessKeyId || !env.lightsailBucketSecretAccessKey) {
      throw new ApiError(
        500,
        'LIGHTSAIL_BUCKET_ACCESS_KEY_ID dan LIGHTSAIL_BUCKET_SECRET_ACCESS_KEY belum dikonfigurasi'
      );
    }

    const key = [
      sanitizeKeyPart(env.lightsailBucketKeyPrefix),
      'products',
      String(productId),
      `${Date.now()}-${crypto.randomUUID()}${buildFileExtension(
        file.originalname,
        file.mimetype
      )}`
    ].join('/');

    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.lightsailBucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000',
        Metadata: {
          productId: String(productId),
          uploadedAt: new Date().toISOString()
        }
      })
    );

    return {
      key,
      imageUrl: buildPublicUrl(key)
    };
  }
};
