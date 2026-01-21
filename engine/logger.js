// engine/logger.js
export class Logger {
  constructor() {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    this.currentLevel = process.env.LOG_LEVEL || 'info';
  }
  
  log(level, message, ...args) {
    if (this.levels[level] <= this.levels[this.currentLevel]) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      
      if (level === 'error') {
        console.error(logMessage, ...args);
      } else if (level === 'warn') {
        console.warn(logMessage, ...args);
      } else {
        console.log(logMessage, ...args);
      }
      
      // Send to analytics if in production
      if (process.env.NODE_ENV === 'production' && level === 'error') {
        this.sendToAnalytics(level, message);
      }
    }
  }
  
  error(message, ...args) {
    this.log('error', message, ...args);
  }
  
  warn(message, ...args) {
    this.log('warn', message, ...args);
  }
  
  info(message, ...args) {
    this.log('info', message, ...args);
  }
  
  debug(message, ...args) {
    this.log('debug', message, ...args);
  }
  
  async sendToAnalytics(level, message) {
    // Send logs to external service if configured
    if (process.env.LOG_SERVICE_URL) {
      try {
        await fetch(process.env.LOG_SERVICE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level,
            message,
            timestamp: new Date().toISOString(),
            platform: 'Bot Master',
            environment: process.env.NODE_ENV
          })
        });
      } catch (error) {
        console.error('Failed to send log to analytics:', error);
      }
    }
  }
}

export const logger = new Logger();
