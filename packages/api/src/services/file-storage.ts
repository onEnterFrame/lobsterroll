import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import type { Config } from '../config.js';

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export class FileStorageService {
  private client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor(config: Config) {
    this.bucket = config.S3_BUCKET;
    this.endpoint = config.S3_ENDPOINT;
    this.client = new S3Client({
      endpoint: config.S3_ENDPOINT,
      region: config.S3_REGION,
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY,
        secretAccessKey: config.S3_SECRET_KEY,
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<UploadResult> {
    const key = `uploads/${randomUUID()}/${filename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    return {
      url: `${this.endpoint}/${this.bucket}/${key}`,
      filename,
      size: buffer.length,
      mimeType,
    };
  }
}
