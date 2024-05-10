import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  type CreateBucketCommandInput,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';
import path from 'path';
import { Service } from 'typedi';

import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const MAX_PRESIGNED_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

@Service()
export class StorageService {
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private objectPrefix: string;

  constructor() {
    this.bucketName = config.s3?.bucket || 'avatars';
    this.objectPrefix = this.normalizeObjectPrefix(config.s3?.prefix || 'avatars');
    this.initializeS3();
  }

  /**
   * Initialize S3 client (compatible with AWS S3 and MinIO)
   */
  private initializeS3() {
    try {
      if (!config.s3) {
        logger.warn('S3 not configured, avatar upload will be disabled');
        return;
      }

      const clientConfig: S3ClientConfig = {
        region: config.s3.region,
        credentials: {
          accessKeyId: config.s3.accessKeyId,
          secretAccessKey: config.s3.secretAccessKey,
        },
        forcePathStyle: config.s3.forcePathStyle,
      };

      if (config.s3.endpoint) {
        clientConfig.endpoint = config.s3.endpoint;
      }

      this.s3Client = new S3Client(clientConfig);

      // Ensure bucket exists for upload operations
      void this.ensureBucket();

      logger.info('S3 client initialized successfully', {
        endpoint: config.s3.endpoint,
        bucket: this.bucketName,
        objectPrefix: this.objectPrefix,
        forcePathStyle: config.s3.forcePathStyle,
      });
    } catch (error) {
      logger.error('Failed to initialize S3 client', { error });
    }
  }

  private isBucketNotFoundError(error: any): boolean {
    const statusCode = error?.$metadata?.httpStatusCode;
    const code = error?.name || error?.Code;
    return statusCode === 404 || code === 'NotFound' || code === 'NoSuchBucket';
  }

  private getS3ClientOrThrow(): S3Client {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }
    return this.s3Client;
  }

  private normalizeObjectPrefix(prefix: string): string {
    return prefix
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)
      .join('/');
  }

  private buildObjectName(fileName: string): string {
    return this.objectPrefix ? `${this.objectPrefix}/${fileName}` : fileName;
  }

  /**
   * Ensure bucket exists, create if not
   */
  private async ensureBucket() {
    const s3Client = this.s3Client;
    if (!s3Client) return;

    try {
      await s3Client.send(
        new HeadBucketCommand({
          Bucket: this.bucketName,
        })
      );
      return;
    } catch (error) {
      if (!this.isBucketNotFoundError(error)) {
        logger.error('Failed to check bucket existence', {
          error,
          bucket: this.bucketName,
        });
        return;
      }
    }

    try {
      const createInput: CreateBucketCommandInput = {
        Bucket: this.bucketName,
      };

      if (config.s3 && config.s3.region !== 'us-east-1') {
        createInput.CreateBucketConfiguration = {
          LocationConstraint: config.s3.region as NonNullable<
            CreateBucketCommandInput['CreateBucketConfiguration']
          >['LocationConstraint'],
        };
      }

      await s3Client.send(new CreateBucketCommand(createInput));
      logger.info('Bucket created successfully', { bucket: this.bucketName });
    } catch (error) {
      logger.error('Failed to create bucket', {
        error,
        bucket: this.bucketName,
      });
    }
  }

  /**
   * Upload file to S3 storage
   */
  async uploadFile(buffer: Buffer, originalName: string, contentType: string): Promise<string> {
    const s3Client = this.getS3ClientOrThrow();

    // Generate unique file name
    const ext = path.extname(originalName);
    const fileName = `${nanoid()}${ext}`;
    const objectName = this.buildObjectName(fileName);

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: objectName,
          Body: buffer,
          ContentType: contentType,
        })
      );

      logger.info('File uploaded to S3', { objectName });
      return objectName;
    } catch (error) {
      logger.error('Failed to upload file to S3', { error });
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Generate presigned URL for object (temporary access)
   */
  async getPresignedUrl(
    objectName: string,
    expirySeconds: number = MAX_PRESIGNED_URL_EXPIRY_SECONDS
  ) {
    const s3Client = this.getS3ClientOrThrow();

    try {
      const safeExpiry = Math.max(
        1,
        Math.min(Math.floor(expirySeconds), MAX_PRESIGNED_URL_EXPIRY_SECONDS)
      );

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: objectName,
      });

      return await getSignedUrl(s3Client, command, { expiresIn: safeExpiry });
    } catch (error) {
      logger.error('Failed to generate presigned URL', { error, objectName });
      throw new Error('Failed to generate presigned URL');
    }
  }

  /**
   * Delete file from S3 storage
   */
  async deleteFile(objectName: string): Promise<void> {
    const s3Client = this.getS3ClientOrThrow();

    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: objectName,
        })
      );
      logger.info('File deleted from S3', { objectName });
    } catch (error) {
      logger.error('Failed to delete file from S3', { error, objectName });
      // Don't throw error for delete failures
    }
  }

  /**
   * Check if S3 storage is available
   */
  isAvailable(): boolean {
    return this.s3Client !== null;
  }
}
