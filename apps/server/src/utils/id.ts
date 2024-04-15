import { customAlphabet } from 'nanoid';

const typeid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 23);

/**
 * Generate a unique user ID with 'u' prefix
 */
export const generateUid = () => {
  return `u${typeid()}`;
};
