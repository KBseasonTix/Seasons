import { createClient } from 'redis';
import { config } from 'dotenv';
import * as Sentry from '@sentry/node';

// Load environment variables
config();

// Initialize Redis client
const client = createClient({
  url: process.env.REDIS_URL
});

// Connect to Redis on startup
client.connect().catch(err => {
  console.error('Redis connection error:', err);
  Sentry.captureException(err);
});

client.on('error', (err) => {
  console.error('Redis error:', err);
  Sentry.captureException(err);
});

// Key prefixes for different data types
const USER_PREFIX = 'user:';
const PAYMENT_QUEUE = 'payment:queue';

/**
 * Cache user data in Redis
 * @param userId User ID
 * @param userData User data object
 * @param ttl Time to live in seconds (default: 1 hour)
 */
export const cacheUser = async (userId: string, userData: any, ttl = 3600) => {
  try {
    await client.set(
      `${USER_PREFIX}${userId}`,
      JSON.stringify(userData),
      { EX: ttl }
    );
    return true;
  } catch (error) {
    console.error('Redis cache user error:', error);
    Sentry.captureException(error);
    return false;
  }
};

/**
 * Get cached user data from Redis
 * @param userId User ID
 * @returns User data object or null if not found
 */
export const getCachedUser = async (userId: string) => {
  try {
    const userData = await client.get(`${USER_PREFIX}${userId}`);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Redis get cached user error:', error);
    Sentry.captureException(error);
    return null;
  }
};

/**
 * Delete cached user data
 * @param userId User ID
 */
export const deleteCachedUser = async (userId: string) => {
  try {
    await client.del(`${USER_PREFIX}${userId}`);
    return true;
  } catch (error) {
    console.error('Redis delete cached user error:', error);
    Sentry.captureException(error);
    return false;
  }
};

/**
 * Add a payment to the processing queue
 * @param seasonId Season ID
 * @param amount Payment amount
 * @param type Payment type (community or platform)
 */
export const enqueuePayment = async (
  seasonId: string,
  amount: number,
  type: 'community' | 'platform'
) => {
  try {
    const payment = { seasonId, amount, type, timestamp: Date.now() };
    await client.lPush(PAYMENT_QUEUE, JSON.stringify(payment));
    return true;
  } catch (error) {
    console.error('Redis enqueue payment error:', error);
    Sentry.captureException(error);
    return false;
  }
};

/**
 * Get pending payments from the queue
 * @param count Maximum number of payments to retrieve (default: 50)
 * @returns Array of payment objects
 */
export const getPendingPayments = async (count = 50) => {
  try {
    const paymentStrings = await client.lRange(PAYMENT_QUEUE, 0, count - 1);
    return paymentStrings.map(p => JSON.parse(p));
  } catch (error) {
    console.error('Redis get pending payments error:', error);
    Sentry.captureException(error);
    return [];
  }
};

/**
 * Remove processed payments from the queue
 * @param count Number of payments to remove from the head of the queue
 */
export const clearProcessedPayments = async (count: number) => {
  try {
    // If no payments to clear, return early
    if (count <= 0) return true;
    
    // Trim the list by removing the first 'count' elements
    await client.lTrim(PAYMENT_QUEUE, count, -1);
    return true;
  } catch (error) {
    console.error('Redis clear processed payments error:', error);
    Sentry.captureException(error);
    return false;
  }
};

/**
 * Set a rate limit for an operation
 * @param key Rate limit key (usually userId + operation)
 * @param ttl Time to live in seconds
 * @param maxAttempts Maximum attempts allowed within TTL
 * @returns Boolean indicating if rate limit was hit
 */
export const checkRateLimit = async (
  key: string,
  ttl: number,
  maxAttempts: number
) => {
  const rateLimitKey = `rate:${key}`;
  
  try {
    // Increment counter for this key
    const attempts = await client.incr(rateLimitKey);
    
    // If this is the first attempt, set expiration
    if (attempts === 1) {
      await client.expire(rateLimitKey, ttl);
    }
    
    return attempts <= maxAttempts;
  } catch (error) {
    console.error('Redis rate limit error:', error);
    Sentry.captureException(error);
    // In case of error, allow the operation to proceed
    return true;
  }
};

export default client; 