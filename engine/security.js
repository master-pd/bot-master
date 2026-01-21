// engine/security.js
export class SecurityMiddleware {
  // Sanitize user input
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remove dangerous HTML/JavaScript
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }
  
  // Validate user ID
  static isValidUserId(id) {
    if (!id) return false;
    const numId = Number(id);
    return !isNaN(numId) && numId > 0 && Number.isInteger(numId);
  }
  
  // Validate chat ID
  static isValidChatId(id) {
    if (!id) return false;
    const numId = Number(id);
    return !isNaN(numId) && Number.isInteger(numId);
  }
  
  // Check for SQL injection patterns
  static hasSQLInjection(text) {
    if (typeof text !== 'string') return false;
    
    const sqlPatterns = [
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
      /w*((\%27)|(\'))\s*((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      /((\%27)|(\'))union/i,
      /select.*from/i,
      /insert.*into/i,
      /delete.*from/i,
      /update.*set/i,
      /drop.*table/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(text));
  }
  
  // Check for XSS patterns
  static hasXSS(text) {
    if (typeof text !== 'string') return false;
    
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<embed/gi,
      /<object/gi,
      /<applet/gi
    ];
    
    return xssPatterns.some(pattern => pattern.test(text));
  }
  
  // Validate Telegram update structure
  static isValidUpdate(update) {
    if (!update || typeof update !== 'object') return false;
    
    // Must have update_id
    if (!update.update_id || typeof update.update_id !== 'number') {
      return false;
    }
    
    // Check for at least one valid update type
    const validTypes = [
      'message',
      'edited_message',
      'channel_post',
      'edited_channel_post',
      'inline_query',
      'chosen_inline_result',
      'callback_query',
      'shipping_query',
      'pre_checkout_query',
      'poll',
      'poll_answer',
      'my_chat_member',
      'chat_member',
      'chat_join_request'
    ];
    
    const hasValidType = validTypes.some(type => update[type]);
    return hasValidType;
  }
  
  // Rate limit check wrapper
  static async checkRateLimit(limiter, key, action, limit, window) {
    if (!limiter) return { allowed: true };
    return await limiter.check(key, action, limit, window);
  }
}

// Input validation for features
export function validateInput(input, rules) {
  const errors = [];
  
  for (const [field, rule] of Object.entries(rules)) {
    const value = input[field];
    
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    
    if (value !== undefined && value !== null) {
      // Type checking
      if (rule.type && typeof value !== rule.type) {
        errors.push(`${field} must be ${rule.type}`);
      }
      
      // Length checking
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters`);
      }
      
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${field} must be at most ${rule.maxLength} characters`);
      }
      
      // Pattern matching
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
      
      // Custom validation
      if (rule.validate && !rule.validate(value)) {
        errors.push(`${field} validation failed`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
