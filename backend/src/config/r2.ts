import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env';

// Cloudflare R2 nói chuyện qua S3-compatible API — chỉ cần đổi endpoint.
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: env.r2.accountId ? `https://${env.r2.accountId}.r2.cloudflarestorage.com` : undefined,
  credentials: {
    accessKeyId: env.r2.accessKeyId,
    secretAccessKey: env.r2.secretAccessKey,
  },
});
