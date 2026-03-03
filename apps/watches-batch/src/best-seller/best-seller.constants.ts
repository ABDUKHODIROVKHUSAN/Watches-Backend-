export const BEST_SELLER_JOB_NAME = 'hourly-best-sellers';
export const BEST_SELLER_LOCK_KEY = 'batch:hourly-best-sellers';

export const ROLLING_WINDOW_DAYS = 7;
export const LOCK_TTL_MS = 55 * 60 * 1000;
export const ROTATION_ROW_SIZE = 3;
export const ROTATION_POOL_LIMIT = 30;

export const BEST_SELLER_WEIGHTS = {
	views: 1,
	likes: 3,
	orders: 8,
} as const;
