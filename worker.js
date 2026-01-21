// worker.js - FINAL COMPLETE VERSION
import { loadAllFeatures } from './engine/loader.js';
import { createContext } from './engine/context.js';
import { dispatchEvent } from './engine/dispatcher.js';
import { handleApiRequest } from './engine/api.js';
import { initDatabase } from './engine/database.js';
import { RateLimiter } from './engine/ratelimit.js';
import { logger } from './engine/logger.js';

// Global initialization flag
let isInitialized = false;
let features = [];
let versions = [];
let rateLimiter = null;

// Initialize platform
async function initializePlatform() {
  if (isInitialized) return;
  
  logger.info('🚀 Initializing Bot Master Platform...');
  
  try {
    // Initialize database
    await initDatabase();
    logger.info('✅ Database initialized');
    
    // Initialize rate limiter
    rateLimiter = new RateLimiter();
    logger.info('✅ Rate limiter initialized');
    
    // Load features
    const loadResult = await loadAllFeatures();
    features = loadResult.features;
    versions = loadResult.versions;
    
    logger.info(`✅ Loaded ${features.length} features from ${versions.length} versions`);
    isInitialized = true;
    
  } catch (error) {
    logger.error('Platform initialization failed:', error);
    throw error;
  }
}

// Validate Telegram webhook
function validateWebhook(request) {
  const contentType = request.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return false;
  }
  
  // Add Telegram secret token validation if set
  const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
  if (process.env.WEBHOOK_SECRET && secretToken !== process.env.WEBHOOK_SECRET) {
    return false;
  }
  
  return true;
}

// Main fetch handler
export default {
  async fetch(request, env, ctx) {
    try {
      // Initialize platform on first request
      if (!isInitialized) {
        await initializePlatform();
      }
      
      const url = new URL(request.url);
      const clientIP = request.headers.get('cf-connecting-ip') || 'unknown';
      
      // Log request
      logger.info(`Request: ${request.method} ${url.pathname} from ${clientIP}`);
      
      // Health check endpoint
      if (url.pathname === '/health') {
        return Response.json({
          status: 'online',
          platform: 'Bot Master Platform',
          versions: versions.length,
          features: features.length,
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        });
      }
      
      // Set webhook endpoint
      if (url.pathname === '/set-webhook' && request.method === 'POST') {
        const webhookUrl = `${url.origin}/webhook`;
        const response = await fetch(
          `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook?url=${webhookUrl}&max_connections=40`
        );
        const result = await response.json();
        return Response.json(result);
      }
      
      // Delete webhook endpoint
      if (url.pathname === '/delete-webhook' && request.method === 'POST') {
        const response = await fetch(
          `https://api.telegram.org/bot${env.BOT_TOKEN}/deleteWebhook`
        );
        return Response.json(await response.json());
      }
      
      // Webhook endpoint for Telegram
      if (url.pathname === '/webhook' && request.method === 'POST') {
        // Validate webhook request
        if (!validateWebhook(request)) {
          return new Response('Unauthorized', { status: 401 });
        }
        
        // Rate limiting
        if (rateLimiter) {
          const rateLimitKey = `webhook:${clientIP}`;
          const limitResult = await rateLimiter.check(rateLimitKey, 'webhook', 100, 60);
          
          if (!limitResult.allowed) {
            logger.warn(`Rate limit exceeded for IP: ${clientIP}`);
            return new Response('Too Many Requests', { status: 429 });
          }
        }
        
        // Parse update
        const update = await request.json();
        
        // Validate update structure
        if (!update.update_id) {
          return new Response('Invalid update', { status: 400 });
        }
        
        // Process update asynchronously (don't block response)
        ctx.waitUntil(processTelegramUpdate(update, env));
        
        // Immediate response to Telegram
        return new Response('OK');
      }
      
      // API endpoints
      if (url.pathname.startsWith('/api/')) {
        return handleApiRequest(request, env);
      }
      
      // Bot info endpoint
      if (url.pathname === '/info') {
        const botInfo = await fetch(
          `https://api.telegram.org/bot${env.BOT_TOKEN}/getMe`
        ).then(r => r.json());
        
        return Response.json({
          bot: botInfo,
          platform: {
            name: 'Bot Master',
            version: '1.0.0',
            features: features.map(f => f.name),
            uptime: process.uptime()
          }
        });
      }
      
      // Default response
      return Response.json({
        message: '🤖 Bot Master Platform',
        description: 'A serverless Telegram bot platform',
        endpoints: [
          'GET  /health',
          'POST /webhook (Telegram)',
          'POST /set-webhook',
          'POST /delete-webhook',
          'GET  /info',
          'GET  /api/status',
          'GET  /api/features'
        ],
        documentation: 'https://github.com/yourusername/bot-master'
      });
      
    } catch (error) {
      logger.error('Fetch handler error:', error);
      
      return Response.json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      }, { status: 500 });
    }
  }
};

// Process Telegram update
async function processTelegramUpdate(update, env) {
  try {
    logger.info(`Processing update #${update.update_id}`);
    
    // Create context
    const context = createContext(update, env.BOT_TOKEN, env);
    
    // User rate limiting
    if (rateLimiter && context.from) {
      const userLimitKey = `user:${context.from.id}`;
      const userLimit = await rateLimiter.check(userLimitKey, 'message', 20, 60);
      
      if (!userLimit.allowed) {
        logger.warn(`User ${context.from.id} rate limited`);
        
        // Notify user if in private chat
        if (context.chat?.type === 'private') {
          await context.reply(
            '⚠️ You are sending messages too fast. Please slow down.'
          );
        }
        return;
      }
      
      // Spam detection
      if (context.text && await rateLimiter.isSpam(context.text, context.from.id)) {
        logger.warn(`Spam detected from user ${context.from.id}`);
        return;
      }
    }
    
    // Dispatch to features
    const result = await dispatchEvent(context, features);
    
    if (result.processed) {
      logger.info(`Update #${update.update_id} processed by ${result.responses.length} features`);
    } else {
      logger.debug(`Update #${update.update_id} not processed by any feature`);
    }
    
  } catch (error) {
    logger.error('Error processing update:', error);
    
    // Send error to bot owner
    if (env.BOT_OWNER_ID) {
      try {
        await fetch(
          `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: env.BOT_OWNER_ID,
              text: `🚨 Platform Error:\n${error.message}\nUpdate: ${JSON.stringify(update.update_id)}`,
              parse_mode: 'HTML'
            })
          }
        );
      } catch (e) {
        logger.error('Failed to notify owner:', e);
      }
    }
  }
}
