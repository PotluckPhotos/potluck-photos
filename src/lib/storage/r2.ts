import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageProvider } from "./types";

const bucket = process.env.STORAGE_BUCKET!;
const publicUrl = process.env.STORAGE_PUBLIC_URL;

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.STORAGE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
  },
});

export const r2Storage: StorageProvider = {
  async putPresignedUrl(key, contentType) {
    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    return getSignedUrl(client, command, { expiresIn: 300 });
  },
  getPublicUrl(key) {
    return `${publicUrl}/${key}`;
  },
  async delete(key) {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  },
};
