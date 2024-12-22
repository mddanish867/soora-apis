import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from 'ioredis';
import { nanoid } from 'nanoid';

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL!);

interface RateLimitConfig {
  windowMs: number;     // Time window in milliseconds
  max: number;         // Max requests per window
  keyPrefix: string;   // Prefix for Redis keys
}

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // 100 requests per window
  keyPrefix: 'ratelimit:'
};

export const rateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const options: RateLimitConfig = { ...defaultConfig, ...config };

  return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    try {
      // Generate unique identifier for the client
      const clientId = req.headers['x-forwarded-for'] || 
                      req.socket.remoteAddress ||
                      nanoid();

      const key = `${options.keyPrefix}${clientId}`;

      // Get current count
      const current = await redis.get(key);
      const totalHits = current ? parseInt(current) + 1 : 1;

      if (totalHits > options.max) {
        const resetTime = await redis.pttl(key);
        res.setHeader('X-RateLimit-Limit', options.max);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));
        
        return res.status(429).json({
          error: 'Too Many Requests',
          retryAfter: Math.ceil(resetTime / 1000)
        });
      }

      // Set or update counter
      await redis.multi()
        .set(key, totalHits, 'PX', options.windowMs, 'NX')
        .pexpire(key, options.windowMs)
        .exec();

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - totalHits));
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      next();
    }
  };
};