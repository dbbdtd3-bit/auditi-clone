import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const OBS_REGION = process.env.OBS_REGION ?? 'eu-de';
const OBS_ENDPOINT = process.env.OBS_ENDPOINT ?? 'https://obs.eu-de.otc.t-systems.com';
const OBS_ACCESS_KEY = process.env.OBS_ACCESS_KEY ?? '';
const OBS_SECRET_KEY = process.env.OBS_SECRET_KEY ?? '';
const OBS_BUCKET = process.env.OBS_BUCKET ?? '';

export const obs = new S3Client({
  region: OBS_REGION,
  endpoint: OBS_ENDPOINT,
  credentials: {
    accessKeyId: OBS_ACCESS_KEY,
    secretAccessKey: OBS_SECRET_KEY,
  },
  forcePathStyle: true,
});

function requireObsConfig() {
  const missing = [
    !OBS_ENDPOINT ? 'OBS_ENDPOINT' : null,
    !OBS_REGION ? 'OBS_REGION' : null,
    !OBS_ACCESS_KEY ? 'OBS_ACCESS_KEY' : null,
    !OBS_SECRET_KEY ? 'OBS_SECRET_KEY' : null,
    !OBS_BUCKET ? 'OBS_BUCKET' : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Object Storage ist nicht vollständig konfiguriert: ${missing.join(', ')}`);
  }
}

export async function getPresignedUpload(
  key: string,
  mimeType: string,
  expiresIn = 300
): Promise<string> {
  requireObsConfig();
  return getSignedUrl(
    obs,
    new PutObjectCommand({ Bucket: OBS_BUCKET, Key: key, ContentType: mimeType }),
    { expiresIn }
  );
}

export async function getPresignedDownload(
  key: string,
  expiresIn = 3600
): Promise<string> {
  requireObsConfig();
  return getSignedUrl(
    obs,
    new GetObjectCommand({ Bucket: OBS_BUCKET, Key: key }),
    { expiresIn }
  );
}

export async function deleteObject(key: string): Promise<void> {
  requireObsConfig();
  await obs.send(new DeleteObjectCommand({ Bucket: OBS_BUCKET, Key: key }));
}
