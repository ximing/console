import { Service } from 'typedi';

import type { ActionHandler } from './types.js';

/**
 * Registry for managing action handlers
 */
@Service()
export class ActionRegistry {
  private handlers: Map<string, ActionHandler> = new Map();

  /**
   * Register a new action handler
   * @param handler - The action handler to register
   */
  register(handler: ActionHandler): void {
    if (this.handlers.has(handler.id)) {
      throw new Error(`Action with id "${handler.id}" is already registered`);
    }
    this.handlers.set(handler.id, handler);
  }

  /**
   * Get an action handler by ID
   * @param id - The action handler ID
   * @returns The action handler or undefined if not found
   */
  get(id: string): ActionHandler | undefined {
    return this.handlers.get(id);
  }

  /**
   * Get all registered action handlers
   * @returns Array of all registered action handlers
   */
  getAll(): ActionHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Check if an action handler exists
   * @param id - The action handler ID
   * @returns true if the handler exists
   */
  has(id: string): boolean {
    return this.handlers.has(id);
  }

  /**
   * Get all available action IDs
   * @returns Array of action IDs
   */
  getAvailableActions(): Array<{ id: string; name: string; description: string }> {
    return this.getAll().map((handler) => ({
      id: handler.id,
      name: handler.name,
      description: handler.description,
    }));
  }
}
