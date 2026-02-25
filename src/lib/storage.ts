import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

/**
 * Storage Interface for dependency injection.
 * In Phase 4, we will add 'S3StorageService' or 'SupabaseStorageService'.
 */
export interface StorageService {
  uploadFile(file: File, folder: string): Promise<string>;
  saveBuffer(buffer: Buffer, originalName: string, folder: string): Promise<string>;
  readFile(filePath: string): Promise<Buffer>;
  deleteFile(filePath: string): Promise<void>;
}

/**
 * Temporary Storage Service using OS temp directory.
 * This is compliant with Vercel Serverless (for single invocation) and persistent environments (for workers).
 *
 * WARNING: On Vercel, files in /tmp are ephemeral and not shared between invocations.
 * This means the API that uploads the file must process it immediately OR pass the content to a shared store.
 * For this phase, we assume the Worker is running in a persistent environment (e.g., VPS, Railway, Render)
 * OR we accept that Vercel functions will process small batches synchronously if needed.
 *
 * Ideally, use S3/Supabase for production.
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

    // Return absolute path for internal use
    return filepath;
  }

  async readFile(filePath: string): Promise<Buffer> {
    // Security check: ensure path is within tmpdir?
    // For now, trust the path if it's absolute.
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

// Singleton instance
export const storage: StorageService = new TmpStorageService();

// Re-export convenience functions matching old API
export const uploadFile = (file: File, folder: string = 'submissions') => storage.uploadFile(file, folder);
export const saveBuffer = (buffer: Buffer, name: string, folder: string = 'submissions') => storage.saveBuffer(buffer, name, folder);
export const readFile = (path: string) => storage.readFile(path);
export const deleteFile = (path: string) => storage.deleteFile(path);
