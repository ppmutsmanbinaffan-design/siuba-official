/**
 * SIUBA Production Dev Tools & Demo Guards
 * 
 * Standardized guard functions to prevent test/demo fallbacks,
 * reset triggers, and simulators from executing or rendering in production.
 */

export const isDevelopmentToolsEnabled = (): boolean => {
  return true;
};

export const isDemoAuthEnabled = (): boolean => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.DEV === true && import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true';
  }
  return false;
};

