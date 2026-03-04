import { Service } from 'typedi';
import * as Minio from 'minio';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { nanoid } from 'nanoid';
import path from 'path';

@Service()
export class StorageService {
  private minioClient: Minio.Client | null = null;
  private bucketName: string;

  constructor() {
    this.bucketName = config.minio?.bucket || 'avatars';
    this.initializeMinIO();
  }

  /**
   * Initialize MinIO client
   */
  private initializeMinIO() {
    try {
      if (!config.minio?.endpoint) {
        logger.warn('MinIO not configured, avatar upload will be disabled');
        return;
      }

      this.minioClient = new Minio.Client({
        endPoint: config.minio.endpoint,
        port: config.minio.port,
        useSSL: config.minio.useSSL,
        accessKey: config.minio.accessKey,
        secretKey: config.minio.secretKey,
      });

      // Ensure bucket exists
      this.ensureBucket();

      logger.info('MinIO client initialized successfully', {
        endpoint: config.minio.endpoint,
        bucket: this.bucketName,
      });
    } catch (error) {
      logger.error('Failed to initialize MinIO client', { error });
    }
  }

  /**
   * Ensure bucket exists, create if not
   */
  private async ensureBucket() {
    if (!this.minioClient) return;

    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        logger.info(`Bucket ${this.bucketName} created`);

        // Set bucket policy to private
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };
        // Note: We'll generate presigned URLs instead of making bucket public
      }
    } catch (error) {
      logger.error('Failed to ensure bucket exists', { error });
    }
  }

  /**
   * Upload file to MinIO
   * @param buffer File buffer
   * @param originalName Original file name
   * @param contentType File content type
   * @returns Object key in MinIO
   */
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    contentType: string
  ): Promise<string> {
    if (!this.minioClient) {
      throw new Error('MinIO client not initialized');
    }

    // Generate unique file name
    const ext = path.extname(originalName);
    const fileName = `${nanoid()}${ext}`;
    const objectName = `avatars/${fileName}`;

    try {
      await this.minioClient.putObject(this.bucketName, objectName, buffer, buffer.length, {
        'Content-Type': contentType,
      });

      logger.info('File uploaded to MinIO', { objectName });
      return objectName;
    } catch (error) {
      logger.error('Failed to upload file to MinIO', { error });
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Generate presigned URL for object (temporary access)
   * @param objectName Object key in MinIO
   * @param expirySeconds URL expiry time in seconds (default 7 days)
   * @returns Presigned URL
   */
  async getPresignedUrl(objectName: string, expirySeconds: number = 7 * 24 * 60 * 60): Promise<string> {
    if (!this.minioClient) {
      throw new Error('MinIO client not initialized');
    }

    try {
      const url = await this.minioClient.presignedGetObject(
        this.bucketName,
        objectName,
        expirySeconds
      );
      return url;
    } catch (error) {
      logger.error('Failed to generate presigned URL', { error, objectName });
      throw new Error('Failed to generate presigned URL');
    }
  }

  /**
   * Delete file from MinIO
   * @param objectName Object key in MinIO
   */
  async deleteFile(objectName: string): Promise<void> {
    if (!this.minioClient) {
      throw new Error('MinIO client not initialized');
    }

    try {
      await this.minioClient.removeObject(this.bucketName, objectName);
      logger.info('File deleted from MinIO', { objectName });
    } catch (error) {
      logger.error('Failed to delete file from MinIO', { error, objectName });
      // Don't throw error for delete failures
    }
  }

  /**
   * Check if MinIO is available
   */
  isAvailable(): boolean {
    return this.minioClient !== null;
  }
}
