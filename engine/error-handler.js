// engine/error-handler.js
import { logger } from './logger.js';

export class ErrorHandler {
  static handle(error, context = null) {
    // Log error
    logger.error('Error occurred:', error);
    
    // Classify error type
    const errorType = this.classifyError(error);
    
    // Take appropriate action
    this.takeAction(errorType, error, context);
    
    // Return user-friendly message
    return this.getUserMessage(errorType);
  }
  
  static classifyError(error) {
    if (error.name === 'TelegramError') {
      if (error.response?.error_code === 403) {
        return 'BOT_NOT_ADMIN';
      }
      if (error.response?.error_code === 400) {
        return 'BAD_REQUEST';
      }
      return 'TELEGRAM_API_ERROR';
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return 'NETWORK_ERROR';
    }
    
    if (error.message?.includes('database') || error.message?.includes('query')) {
      return 'DATABASE_ERROR';
    }
    
    if (error.message?.includes('permission') || error.message?.includes('access')) {
      return 'PERMISSION_ERROR';
    }
    
    if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
      return 'RATE_LIMIT_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }
  
  static takeAction(errorType, error, context) {
    switch (errorType) {
      case 'BOT_NOT_ADMIN':
        // Bot is not admin in group
        if (context?.chat?.id) {
          this.notifyAdmins(context, '⚠️ I need admin permissions to function properly.');
        }
        break;
        
      case 'DATABASE_ERROR':
        // Log and notify owner
        this.notifyOwner(`🚨 Database error: ${error.message}`);
        break;
        
      case 'RATE_LIMIT_ERROR':
        // Slow down processing
        setTimeout(() => {}, 1000);
        break;
        
      case 'NETWORK_ERROR':
        // Retry logic could go here
        break;
        
      default:
        // Log and monitor
        this.monitorError(error);
    }
  }
  
  static getUserMessage(errorType) {
    const messages = {
      'BOT_NOT_ADMIN': 'I need admin permissions to perform this action.',
      'PERMISSION_ERROR': 'You do not have permission to perform this action.',
      'RATE_LIMIT_ERROR': 'Please wait a moment before trying again.',
      'DATABASE_ERROR': 'A temporary issue occurred. Please try again.',
      'NETWORK_ERROR': 'Network issue. Please try again.',
      'BAD_REQUEST': 'Invalid request. Please check your input.',
      'UNKNOWN_ERROR': 'Something went wrong. Please try again later.'
    };
    
    return messages[errorType] || messages.UNKNOWN_ERROR;
  }
  
  static async notifyOwner(message) {
    const ownerId = process.env.BOT_OWNER_ID;
    if (!ownerId) return;
    
    try {
      await fetch(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ownerId,
            text: `🔴 ${message}`,
            parse_mode: 'HTML'
          })
        }
      );
    } catch (e) {
      logger.error('Failed to notify owner:', e);
    }
  }
  
  static async notifyAdmins(context, message) {
    try {
      const admins = await context.telegram.getChatAdministrators(context.chat.id);
      
      for (const admin of admins) {
        if (!admin.user.is_bot) {
          try {
            await context.telegram.sendMessage(
              admin.user.id,
              message,
              { parse_mode: 'HTML' }
            );
          } catch (e) {
            // Admin might have PMs disabled
          }
        }
      }
    } catch (e) {
      logger.error('Failed to notify admins:', e);
    }
  }
  
  static monitorError(error) {
    // Send to monitoring service
    if (process.env.MONITORING_URL) {
      fetch(process.env.MONITORING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          platform: 'Bot Master'
        })
      }).catch(e => logger.error('Monitoring failed:', e));
    }
  }
}

// Global error handler for async functions
export function withErrorHandling(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      return ErrorHandler.handle(error, args[0]);
    }
  };
}
