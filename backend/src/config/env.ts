import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const defaultPort = 3001;

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || defaultPort),
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  awsRegion:
    process.env.LIGHTSAIL_BUCKET_REGION ||
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    'ap-southeast-1',
  lightsailBucketName: process.env.LIGHTSAIL_BUCKET_NAME || '',
  lightsailBucketAccessKeyId: process.env.LIGHTSAIL_BUCKET_ACCESS_KEY_ID || '',
  lightsailBucketSecretAccessKey: process.env.LIGHTSAIL_BUCKET_SECRET_ACCESS_KEY || '',
  lightsailBucketPublicUrl: process.env.LIGHTSAIL_BUCKET_PUBLIC_URL || '',
  lightsailBucketKeyPrefix: process.env.LIGHTSAIL_BUCKET_KEY_PREFIX || 'kasir-app',
  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB || 5)
};
