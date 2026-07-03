import type { StorageProvider } from "./types";
import { r2Storage } from "./r2";
import { localStorage } from "./local";

function createStorage(): StorageProvider {
  switch (process.env.STORAGE_PROVIDER) {
    case "local":
      return localStorage;
    case "r2":
    default:
      return r2Storage;
  }
}

export const storage = createStorage();
export type { StorageProvider } from "./types";
