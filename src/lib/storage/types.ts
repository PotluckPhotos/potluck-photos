export interface StorageProvider {
  putPresignedUrl(key: string, contentType: string): Promise<string>;
  getPublicUrl(key: string): string;
  delete(key: string): Promise<void>;
}
