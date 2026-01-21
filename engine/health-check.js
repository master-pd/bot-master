// engine/health-check.js
import { db } from './database.js';
import { logger } from './logger.js';

export class HealthChecker {
  constructor() {
    this.services = {};
  }
  
  async checkAll() {
    const checks = [
      this.checkDatabase(),
      this.checkTelegramAPI(),
      this.checkStorage(),
      this.checkMemory(),
      this.checkFeatures()
    ];
    
    const results = await Promise.allSettled(checks.map(check => check()));
    
    const status = {
      timestamp: new Date().toISOString(),
      platform: 'Bot Master',
      version: '1.0.0',
      uptime: process.uptime(),
      services: {}
    };
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        Object.assign(status.services, result.value);
      } else {
        status.services[`service_${index}`] = {
          healthy: false,
          error: result.reason.message
        };
      }
    });
    
    // Overall health
    const allHealthy = Object.values(status.services).every(s => s.healthy);
    status.healthy = allHealthy;
    status.status = allHealthy ? 'healthy' : 'degraded';
    
    return status;
  }
  
  async checkDatabase() {
    try {
      if (!db) {
        return { database: { healthy: false, error: 'Not configured' } };
      }
      
      const start = Date.now();
      const result = await db.query('SELECT NOW() as time, version() as version');
      const latency = Date.now() - start;
      
      return {
        database: {
          healthy: true,
          latency: `${latency}ms`,
          version: result.rows[0].version.split(' ')[1],
          timestamp: result.rows[0].time
        }
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { database: { healthy: false, error: error.message } };
    }
  }
  
  async checkTelegramAPI() {
    try {
      const start = Date.now();
      const response = await fetch(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getMe`
      );
      const latency = Date.now() - start;
      const data = await response.json();
      
      return {
        telegram_api: {
          healthy: data.ok === true,
          latency: `${latency}ms`,
          bot_name: data.result?.username,
          can_join_groups: data.result?.can_join_groups
        }
      };
    } catch (error) {
      return { telegram_api: { healthy: false, error: error.message } };
    }
  }
  
  async checkStorage() {
    // Check if storage services are available
    const checks = {};
    
    // Check Redis if configured
    if (process.env.REDIS_URL) {
      try {
        const redis = new Redis(process.env.REDIS_URL);
        await redis.ping();
        checks.redis = { healthy: true };
        redis.quit();
      } catch (error) {
        checks.redis = { healthy: false, error: error.message };
      }
    }
    
    // Check Cloudinary if configured
    if (process.env.CLOUDINARY_URL) {
      checks.cloudinary = { healthy: true }; // Simplified check
    }
    
    return { storage: checks };
  }
  
  checkMemory() {
    const memory = process.memoryUsage();
    
    return {
      memory: {
        healthy: memory.heapUsed / memory.heapTotal < 0.9, // Less than 90% used
        heap_used: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heap_total: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
        usage_percent: `${((memory.heapUsed / memory.heapTotal) * 100).toFixed(2)}%`
      }
    };
  }
  
  async checkFeatures() {
    try {
      const { loadAllFeatures } = await import('./loader.js');
      const { features, versions } = await loadAllFeatures();
      
      return {
        features: {
          healthy: features.length > 0,
          count: features.length,
          active_features: features.map(f => f.name),
          versions: versions.map(v => v.name)
        }
      };
    } catch (error) {
      return { features: { healthy: false, error: error.message } };
    }
  }
}

export const healthChecker = new HealthChecker();
