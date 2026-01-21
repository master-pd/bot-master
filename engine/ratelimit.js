import { logger } from './logger.js';

export class RateLimiter {
  constructor() {
    this.redis = null;
    this.localCache = new Map();
    this.windows = new Map();
    
    // Initialize Redis if URL provided
    if (process.env.REDIS_URL) {
      this.initRedis();
    }
  }
  
  async initRedis() {
    try {
      const { Redis } = await import('ioredis');
      this.redis = new Redis(process.env.REDIS_URL);
      
      this.redis.on('connect', () => {
        logger.info('✅ Redis connected for rate limiting');
      });
      
      this.redis.on('error', (error) => {
        logger.error('Redis error:', error);
        this.redis = null;
      });
    } catch (error) {
      logger.warn('Redis not available, using local cache:', error.message);
      this.redis = null;
    }
  }
  
  async check(key, action, limit = 10, window = 60) {
    const cacheKey = `ratelimit:${key}:${action}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - window;
    
    if (this.redis) {
      // Use Redis for distributed rate limiting
      return await this.checkRedis(cacheKey, limit, window);
    } else {
      // Use local cache
      return this.checkLocal(cacheKey, limit, window);
    }
  }
  
  async checkRedis(key, limit, window) {
    try {
      // Use Redis sorted set for sliding window
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - window;
      
      // Remove old entries
      await this.redis.zremrangebyscore(key, 0, windowStart);
      
      // Count current requests
      const requestCount = await this.redis.zcard(key);
      
      if (requestCount >= limit) {
        return {
          allowed: false,
          remaining: 0,
          reset: window,
          retryAfter: await this.getRetryAfter(key, windowStart, window)
        };
      }
      
      // Add new request
      await this.redis.zadd(key, now, now.toString());
      await this.redis.expire(key, window);
      
      return {
        allowed: true,
        remaining: limit - requestCount - 1,
        reset: window
      };
      
    } catch (error) {
      logger.error('Redis rate limit check failed:', error);
      // Fallback to local cache
      return this.checkLocal(key, limit, window);
    }
  }
  
  checkLocal(key, limit, window) {
    const now = Date.now();
    const windowStart = now - (window * 1000);
    
    if (!this.windows.has(key)) {
      this.windows.set(key, []);
    }
    
    const requests = this.windows.get(key);
    
    // Remove old requests
    const validRequests = requests.filter(time => time > windowStart);
    this.windows.set(key, validRequests);
    
    if (validRequests.length >= limit) {
      return {
        allowed: false,
        remaining: 0,
        reset: window,
        retryAfter: Math.ceil((validRequests[0] + (window * 1000) - now) / 1000)
      };
    }
    
    // Add new request
    validRequests.push(now);
    
    // Auto cleanup after 5x window
    setTimeout(() => {
      if (this.windows.has(key)) {
        const oldRequests = this.windows.get(key);
        const updatedRequests = oldRequests.filter(time => time > now - (window * 5000));
        if (updatedRequests.length === 0) {
          this.windows.delete(key);
        } else {
          this.windows.set(key, updatedRequests);
        }
      }
    }, window * 5000);
    
    return {
      allowed: true,
      remaining: limit - validRequests.length,
      reset: window
    };
  }
  
  async getRetryAfter(key, windowStart, window) {
    try {
      if (this.redis) {
        const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
        if (oldest.length > 0) {
          const oldestTime = parseInt(oldest[1]);
          const retryTime = oldestTime + window - Math.floor(Date.now() / 1000);
          return Math.max(1, retryTime);
        }
      }
    } catch (error) {
      // Ignore error
    }
    
    return window;
  }
  
  async isSpam(message, userId) {
    // Check for spam patterns
    const spamPatterns = [
      /http(s)?:\/\/([a-z0-9]+\.)?[a-z0-9]+\.[a-z]{2,}/i,
      /[0-9]{10,}/,
      /(buy|sell|cheap|discount|offer|click here|limited time)[\s\S]{0,30}(now|today|limited|urgent)/i,
      /(@everyone|@here)/,
      /\b(viagra|cialis|porn|casino|lottery)\b/i
    ];
    
    const isSpamContent = spamPatterns.some(pattern => pattern.test(message));
    
    if (isSpamContent) {
      return true;
    }
    
    // Rate limit check for user
    const spamKey = `spam:${userId}`;
    const limitResult = await this.check(spamKey, 'message', 5, 10);
    
    return !limitResult.allowed;
  }
  
  // Cleanup old data
  cleanup() {
    const now = Date.now();
    for (const [key, requests] of this.windows.entries()) {
      const recentRequests = requests.filter(time => time > now - 3600000); // Keep last hour
      if (recentRequests.length === 0) {
        this.windows.delete(key);
      }
    }
  }
}
