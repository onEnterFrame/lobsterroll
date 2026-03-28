import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import type { Config } from '../config.js';

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

const BUCKET = 'attachments';

export class FileStorageService {
  private supabaseUrl: string;
  private supabase: ReturnType<typeof createClient>;

  constructor(config: Config) {
    if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase URL and service role key required for file storage');
    }
    this.supabaseUrl = config.SUPABASE_URL;
    this.supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
  }

  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<UploadResult> {
    // Generate a unique path to avoid collisions
    const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '';
    const key = `${randomUUID()}${ext}`;

    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .upload(key, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`File upload failed: ${error.message}`);
    }

    // Public URL
    const { data: urlData } = this.supabase.storage
      .from(BUCKET)
      .getPublicUrl(key);

    return {
      url: urlData.publicUrl,
      filename,
      size: buffer.length,
      mimeType,
    };
  }
}
