// src/lib/storage.ts

// HARDWIRED: STRICTLY SUPABASE STORAGE ONLY
import { SupabaseStorageService } from './storage-supabase';

export interface StorageService {
  uploadFile(file: File, folder: string): Promise<string>;
  saveBuffer(buffer: Buffer, originalName: string, folder: string, mimeType?: string): Promise<string>;
  readFile(filePath: string, bucket?: string): Promise<Buffer>;
  deleteFile(filePath: string): Promise<void>;
}

// Instantiate Supabase Storage Service directly.
// This ensures no LocalStorageService fallback exists in production.
export const storage: StorageService = new SupabaseStorageService();

// Re-export convenience functions
export const uploadFile = (file: File, folder: string = 'submissions') => storage.uploadFile(file, folder);
export const saveBuffer = (buffer: Buffer, name: string, folder: string = 'submissions', mimeType?: string) => storage.saveBuffer(buffer, name, folder, mimeType);
export const readFile = (path: string, bucket?: string) => storage.readFile(path, bucket);
export const deleteFile = (path: string) => storage.deleteFile(path);
