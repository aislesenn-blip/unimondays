import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const IS_PROD = process.env.NODE_ENV === 'production';
const UPLOAD_ROOT = IS_PROD ? os.tmpdir() : path.join(process.cwd(), 'public/uploads');

const ensureDir = async (dir: string) => {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e: any) {
    if (e.code !== 'EEXIST') throw e;
  }
};

export async function uploadFile(file: File, folder: string = 'submissions'): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name);
  const uuid = crypto.randomUUID();
  const filename = `${uuid}${ext}`;

  const targetDir = path.join(UPLOAD_ROOT, folder);
  await ensureDir(targetDir);

  const filepath = path.join(targetDir, filename);
  await fs.writeFile(filepath, buffer);

  if (IS_PROD) {
    return filepath;
  } else {
    return `/uploads/${folder}/${filename}`;
  }
}

export async function readFile(fileUrl: string): Promise<Buffer> {
  let filepath = fileUrl;

  if (fileUrl.startsWith('/uploads/')) {
    filepath = path.join(process.cwd(), 'public', fileUrl);
  } else if (!path.isAbsolute(fileUrl)) {
    filepath = path.join(UPLOAD_ROOT, fileUrl);
  }

  try {
    return await fs.readFile(filepath);
  } catch (error) {
    console.error("Error reading file:", filepath, error);
    throw new Error("File not found or unreadable.");
  }
}
