import { createHash, randomBytes } from 'crypto';

/**
 * Generates an API key whose raw value must only be returned once.
 */
export function generateApiKey(prefix = 'mw_dev'): string {
  return `${prefix}_${randomBytes(32).toString('hex')}`;
}

/**
 * Produces the stable SHA-256 digest persisted for API key authentication.
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Returns a non-sensitive prefix suitable for operational identification.
 */
export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.slice(0, 16);
}
