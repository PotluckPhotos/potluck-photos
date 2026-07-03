import { mkdir, unlink } from "fs/promises";
import path from "path";
import type { StorageProvider } from "./types";

const uploadDir = path.join(process.cwd(), "public", "uploads");

export const localStorage: StorageProvider = {
  // No presigning without a cloud provider — the client uploads through our own
  // API route instead, so this just points there.
  async putPresignedUrl(key) {
    await mkdir(uploadDir, { recursive: true });
    return `/api/upload?key=${encodeURIComponent(key)}`;
  },
  getPublicUrl(key) {
    return `/uploads/${key}`;
  },
  async delete(key) {
    await unlink(path.join(uploadDir, key)).catch(() => {});
  },
};
