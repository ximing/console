import { Service } from 'typedi';
import { getPool } from '../db/connection.js';
import { logger } from '../utils/logger.js';

@Service()
export class YjsService {
  /**
   * Get Yjs document state by document name
   * Returns Uint8Array for Hocuspocus compatibility
   * Uses mysql2 native binary storage (no base64 encoding)
   */
  async getYjsState(docName: string): Promise<Uint8Array | null> {
    const pool = getPool();
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT data FROM yjs_documents WHERE doc_name = ?',
        [docName]
      );

      if (!rows[0]?.data) {
        return null;
      }

      // mysql2 returns Buffer for binary columns
      const buffer = rows[0].data as Buffer;
      return new Uint8Array(buffer);
    } catch (err) {
      logger.error('Failed to get Yjs state', { docName, error: err });
      throw err;
    }
  }

  /**
   * Save or update Yjs document state
   * Uses mysql2 native binary storage (no base64 encoding)
   */
  async saveYjsState(docName: string, data: Uint8Array): Promise<void> {
    const pool = getPool();
    try {
      // Convert Uint8Array to Buffer for mysql2
      const buffer = Buffer.from(data);

      await pool.query(
        `INSERT INTO yjs_documents (doc_name, data, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE data = ?, updated_at = NOW()`,
        [docName, buffer, buffer]
      );

      logger.debug('Yjs state saved', { docName, dataLength: data.length });
    } catch (err) {
      logger.error('Failed to save Yjs state', { docName, error: err });
      throw err;
    }
  }
}

// Need to import mysql types
import type mysql from 'mysql2/promise';
