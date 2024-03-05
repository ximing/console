/**
 * Migration Scripts Index
 * Exports all available migrations
 */

import type { Migration } from '../types.js';

/**
 * All available migrations
 * Empty array - using Drizzle migrations instead
 */
export const ALL_MIGRATIONS: Migration[] = [];

/**
 * Get all migrations for a specific table
 */
export function getMigrationsForTable(tableName: string): Migration[] {
  return ALL_MIGRATIONS.filter((m) => m.tableName === tableName).sort(
    (a, b) => a.version - b.version
  );
}

/**
 * Get migrations from a specific version onwards for a table
 */
export function getMigrationsFromVersion(tableName: string, fromVersion: number): Migration[] {
  return getMigrationsForTable(tableName).filter((m) => m.version > fromVersion);
}

/**
 * Get the latest version for a table
 */
export function getLatestVersion(tableName: string): number {
  const migrations = getMigrationsForTable(tableName);
  if (migrations.length === 0) {
    return 0;
  }
  return Math.max(...migrations.map((m) => m.version));
}

/**
 * Get all table names that have migrations
 */
export function getAllTableNames(): string[] {
  return [...new Set(ALL_MIGRATIONS.map((m) => m.tableName))];
}
