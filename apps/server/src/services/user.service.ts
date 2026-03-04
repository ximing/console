import { Service } from 'typedi';
import { eq } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { users } from '../db/schema/users.js';
import { generateUid } from '../utils/id.js';
import { logger } from '../utils/logger.js';

import type { User, NewUser } from '../db/schema/users.js';

@Service()
export class UserService {
  /**
   * Create a new user
   */
  async createUser(userData: NewUser): Promise<User> {
    try {
      const db = getDatabase();

      // Check if user with email already exists
      if (userData.email) {
        const existingUser = await this.getUserByEmail(userData.email);
        if (existingUser) {
          throw new Error('User with this email already exists');
        }
      }

      // Create new user record
      const id = userData.id || generateUid();
      const newUser: NewUser = {
        id,
        email: userData.email,
        password: userData.password,
        username: userData.username,
        avatar: userData.avatar,
      };

      // Insert user into MySQL
      await db.insert(users).values(newUser);

      // Fetch the created user to get auto-generated timestamps
      const [createdUser] = await db.select().from(users).where(eq(users.id, id));

      return createdUser;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const db = getDatabase();
      const results = await db.select().from(users).where(eq(users.email, email)).limit(1);

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      const db = getDatabase();
      const results = await db.select().from(users).where(eq(users.id, id)).limit(1);

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }
}
