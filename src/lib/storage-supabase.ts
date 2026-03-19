import { StorageService } from './storage';
import { supabaseAdmin } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export class SupabaseStorageService implements StorageService {
  async uploadFile(file: File, folder: string = 'submissions'): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    // Pass mime type if available
    return this.saveBuffer(buffer, file.name, folder, file.type);
  }

  async saveBuffer(buffer: Buffer, originalName: string, folder: string = 'submissions', mimeType?: string): Promise<string> {
    const filename = `${uuidv4()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`; // Sanitize filename
    const storagePath = `${folder}/${filename}`;

    // Bucket Logic
    // 'exam_pdfs' for submissions, rubrics, gold standards
    // 'feedback_exports' for exports
    let bucket = 'exam_pdfs';
    if (folder.startsWith('feedback')) bucket = 'feedback_exports';

    // Content Type detection fallback
    let contentType = mimeType;
    if (!contentType) {
        const ext = path.extname(originalName).toLowerCase();
        if (ext === '.pdf') contentType = 'application/pdf';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';
        else contentType = 'application/octet-stream';
    }

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: contentType,
        upsert: false
      });

    if (error) {
      console.error('Supabase Upload Error:', error);
      throw new Error(`Failed to upload to Supabase: ${error.message}`);
    }

    // Return the path stored in the bucket
    return data?.path || storagePath;
  }

  async readFile(filePath: string, bucket: string = 'exam_pdfs'): Promise<Buffer> {
     // Clean path: remove leading slashes if present
     const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

     // Download from Supabase
     const { data, error } = await supabaseAdmin.storage.from(bucket).download(cleanPath);

     if (error) {
         console.error(`[Storage] Supabase Download Error: ${error.message} (Bucket: ${bucket}, Path: ${cleanPath})`);
         throw new Error(`Supabase Download Error for ${cleanPath} in ${bucket}: ${error.message}`);
     }
     return Buffer.from(await data.arrayBuffer());
  }

  async deleteFile(filePath: string): Promise<void> {
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const bucket = 'exam_pdfs'; // Default
    await supabaseAdmin.storage.from(bucket).remove([cleanPath]);
  }

  // V4.5 Cloud-Pull Architecture
  async fetchAndSaveFromUrl(url: string, folder: string = 'submissions'): Promise<string> {
      try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Failed to fetch file from URL: ${response.statusText}`);

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Attempt to derive filename from URL or headers
          let filename = 'cloud_import.pdf';
          const disposition = response.headers.get('content-disposition');
          if (disposition && disposition.includes('filename=')) {
              filename = disposition.split('filename=')[1].replace(/"/g, '');
          } else {
              const urlPath = new URL(url).pathname;
              filename = path.basename(urlPath) || 'cloud_import.pdf';
          }

          const mimeType = response.headers.get('content-type') || 'application/pdf';

          return this.saveBuffer(buffer, filename, folder, mimeType);
      } catch (e: any) {
          console.error("[Storage] Cloud Pull Error:", e);
          throw new Error(`Cloud Pull Failed: ${e.message}`);
      }
  }
}
