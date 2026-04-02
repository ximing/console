import { Service } from 'typedi';
import { getDatabase } from '../db/connection.js';
import { yjsDocuments } from '../db/schema/yjs.js';
import { eq } from 'drizzle-orm';

@Service()
export class YjsService {
  /**
   * Get Yjs document state by document name
   * Returns Uint8Array for Hocuspocus compatibility
   */
  async getYjsState(docName: string): Promise<Uint8Array | null> {
    const db = getDatabase();
    const row = await db
      .select({ data: yjsDocuments.data })
      .from(yjsDocuments)
      .where(eq(yjsDocuments.docName, docName))
      .limit(1)
      .then((rows) => rows[0]);

    if (!row?.data) return null;
    // Data is stored as base64 string, convert back to Uint8Array
    const buffer = Buffer.from(row.data, 'base64');
    return new Uint8Array(buffer);
  }

  /**
   * Save or update Yjs document state
   */
  async saveYjsState(docName: string, data: Uint8Array): Promise<void> {
    const db = getDatabase();
    // Convert Uint8Array to base64 string for storage
    const base64Data = Buffer.from(data).toString('base64');
    // Upsert: update if exists, insert if not
    await db
      .insert(yjsDocuments)
      .values({ docName, data: base64Data })
      .onDuplicateKeyUpdate({
        set: { data: base64Data, updatedAt: new Date() },
      });
  }
}
