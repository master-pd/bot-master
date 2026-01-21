// ratelimit.js
import { Redis } from '@upstash/redis/cloudflare';

export class RateLimiter {
  constructor() {
    this.redis = Redis.fromEnv();
  }
  
  async check(userId, action, limit = 10, window = 60) {
    const key = `ratelimit:${userId}:${action}`;
    const now = Date.now();
    const windowStart = now - (window * 1000);
    
    // Get existing requests
    const requests = await this.redis.zrangebyscore(key, windowStart, now);
    
    if (requests.length >= limit) {
      return { allowed: false, remaining: 0, reset: window };
    }
    
    // Add new request
    await this.redis.zadd(key, { score: now, member: now.toString() });
    await this.redis.expire(key, window);
    
    return { 
      allowed: true, 
      remaining: limit - requests.length - 1,
      reset: window 
    };
  }
  
  async isSpam(message, userId) {
    // Simple spam detection
    const key = `spam:${userId}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 5); // 5 seconds window
    
    if (count > 5) {
      return true;
    }
    
    // Check message content
    const spamPatterns = [
      /http(s)?:\/\/([a-z0-9]+\.)?[a-z0-9]+\.[a-z]{2,}/i,
      /[0-9]{10,}/,
      /(buy|sell|cheap|discount|offer)[\s\S]{0,50}(now|today|limited)/i
    ];
    
    return spamPatterns.some(pattern => pattern.test(message));
  }
}
