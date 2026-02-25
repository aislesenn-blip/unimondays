import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { SupabaseStorageService } from './storage-supabase';

/**
 * Storage Interface for dependency injection.
 */
export interface StorageService {
  uploadFile(file: File, folder: string): Promise<string>;
  saveBuffer(buffer: Buffer, originalName: string, folder: string): Promise<string>;
  readFile(filePath: string): Promise<Buffer>;
  deleteFile(filePath: string): Promise<void>;
}

/**
 * Temporary Storage Service using OS temp directory.
 */
class TmpStorageService implements StorageService {
  private rootDir: string;

  constructor() {
    this.rootDir = os.tmpdir();
    console.log(`[Storage] Initialized TmpStorageService at ${this.rootDir}`);
  }

  private async ensureDir(dir: string) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (e: any) {
      if (e.code !== 'EEXIST') throw e;
    }
  }

  async uploadFile(file: File, folder: string = 'submissions'): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    return this.saveBuffer(buffer, file.name, folder);
  }

  async saveBuffer(buffer: Buffer, originalName: string, folder: string = 'submissions'): Promise<string> {
    const ext = path.extname(originalName) || '.bin';
    const uuid = crypto.randomUUID();
    const filename = `${uuid}${ext}`;

    const targetDir = path.join(this.rootDir, 'playbook_uploads', folder);
    await this.ensureDir(targetDir);

    const filepath = path.join(targetDir, filename);
    await fs.writeFile(filepath, buffer);

    return filepath;
  }

  async readFile(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      console.error(`[Storage] Error reading file: ${filePath}`, error);
      throw new Error(`File not found or unreadable: ${filePath}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`[Storage] Failed to delete file: ${filePath}`, error);
    }
  }
}

// Factory to switch between implementations
const useSupabase = process.env.USE_SUPABASE_STORAGE === 'true' || process.env.NODE_ENV === 'production';

export const storage: StorageService = useSupabase
  ? new SupabaseStorageService()
  : new TmpStorageService();

// Re-export convenience functions
export const uploadFile = (file: File, folder: string = 'submissions') => storage.uploadFile(file, folder);
export const saveBuffer = (buffer: Buffer, name: string, folder: string = 'submissions') => storage.saveBuffer(buffer, name, folder);
export const readFile = (path: string) => storage.readFile(path);
export const deleteFile = (path: string) => storage.deleteFile(path);
