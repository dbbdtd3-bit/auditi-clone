import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const obs = new S3Client({
  region: 'eu-de',
  endpoint: 'https://obs.eu-de.otc.t-systems.com',
  credentials: {
    accessKeyId: process.env.OBS_ACCESS_KEY!,
    secretAccessKey: process.env.OBS_SECRET_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.OBS_BUCKET!;

export async function getPresignedUpload(
  key: string,
  mimeType: string,
  expiresIn = 300
): Promise<string> {
  return getSignedUrl(
    obs,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: mimeType }),
    { expiresIn }
  );
}

export async function getPresignedDownload(
  key: string,
  expiresIn = 3600
): Promise<string> {
  return getSignedUrl(
    obs,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn }
  );
}

export async function deleteObject(key: string): Promise<void> {
  await obs.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
