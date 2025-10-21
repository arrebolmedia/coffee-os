/**
 * CoffeeOS POS Web - Environment Variables Configuration
 * Configuración de variables de entorno
 */

// API Configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
export const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10);

// App Configuration
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'CoffeeOS POS';
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

// Feature Flags
export const ENABLE_OFFLINE = process.env.NEXT_PUBLIC_ENABLE_OFFLINE !== 'false';
export const ENABLE_PWA = process.env.NEXT_PUBLIC_ENABLE_PWA !== 'false';
export const ENABLE_DEVTOOLS = process.env.NODE_ENV === 'development';

// Tax Configuration
export const TAX_RATE = parseFloat(process.env.NEXT_PUBLIC_TAX_RATE || '0.16'); // 16% IVA México

// Sync Configuration
export const SYNC_INTERVAL = parseInt(process.env.NEXT_PUBLIC_SYNC_INTERVAL || '60000', 10); // 1 minute
export const MAX_RETRY_ATTEMPTS = parseInt(process.env.NEXT_PUBLIC_MAX_RETRY_ATTEMPTS || '3', 10);

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  CART: 'coffeeos-cart',
  OFFLINE_DATA: 'coffeeos-offline',
  USER_PREFERENCES: 'coffeeos-preferences',
} as const;

// Export all
export const config = {
  api: {
    url: API_URL,
    timeout: API_TIMEOUT,
  },
  app: {
    name: APP_NAME,
    version: APP_VERSION,
  },
  features: {
    offline: ENABLE_OFFLINE,
    pwa: ENABLE_PWA,
    devtools: ENABLE_DEVTOOLS,
  },
  tax: {
    rate: TAX_RATE,
  },
  sync: {
    interval: SYNC_INTERVAL,
    maxRetries: MAX_RETRY_ATTEMPTS,
  },
  storage: STORAGE_KEYS,
};

export default config;
