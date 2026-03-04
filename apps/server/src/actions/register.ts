import { Container } from 'typedi';

import { ActionRegistry } from './registry.js';
import { HttpRequestAction } from './http-request.action.js';
import { MealNutritionAction } from './meal-nutrition.action.js';

/**
 * Initialize and register all built-in actions
 * This module is auto-loaded by IOC
 */
export function registerBuiltinActions() {
  const registry = Container.get(ActionRegistry);

  // Register HTTP Request action
  registry.register(new HttpRequestAction());

  // Register Meal Nutrition action
  registry.register(new MealNutritionAction());

  return registry;
}

// Auto-register on import
registerBuiltinActions();
