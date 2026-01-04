/**
 * Event names emitted by the Featureflow client.
 */

/** Emitted when features are successfully loaded and initialized */
export const INIT = 'INIT';

/** Emitted when features are loaded (after initialization or update) */
export const LOADED = 'LOADED';

/** Emitted when features are loaded from local cache */
export const LOADED_FROM_CACHE = 'LOADED_FROM_CACHE';

/** Emitted when an error occurs during feature loading */
export const ERROR = 'ERROR';

/** Emitted when features are updated after a user context change */
export const UPDATED = 'UPDATED';

/**
 * All available event names.
 */
export const events = {
  INIT,
  LOADED,
  LOADED_FROM_CACHE,
  ERROR,
  UPDATED
} as const;

export default events;

