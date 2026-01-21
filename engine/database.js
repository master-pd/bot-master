import { Pool } from 'pg';
import { logger } from './logger.js';

let pool = null;

export function getDatabase() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      logger.warn('DATABASE_URL not set. Running without database.');
      return null;
    }
    
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    
    // Connection events
    pool.on('connect', () => {
      logger.debug('Database connected');
    });
    
    pool.on('error', (err) => {
      logger.error('Database pool error:', err);
    });
  }
  
  return pool;
}

export const db = getDatabase();

// Initialize database tables
export async function initDatabase() {
  if (!db) {
    logger.warn('Database not configured. Skipping initialization.');
    return;
  }
  
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(255),
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255),
        language_code VARCHAR(10),
        is_bot BOOLEAN DEFAULT false,
        is_premium BOOLEAN DEFAULT false,
        join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        violation_count INTEGER DEFAULT 0,
        warning_count INTEGER DEFAULT 0,
        is_blacklisted BOOLEAN DEFAULT false,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        title VARCHAR(500) NOT NULL,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        member_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(50) PRIMARY KEY,
        target_user_id BIGINT NOT NULL,
        reporter_id BIGINT NOT NULL,
        chat_id BIGINT NOT NULL,
        message_id BIGINT,
        reason TEXT NOT NULL,
        evidence JSONB,
        status VARCHAR(20) DEFAULT 'pending',
        reviewed_by BIGINT,
        review_notes TEXT,
        action_taken VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        reviewed_at TIMESTAMP WITH TIME ZONE
      );
      
      CREATE TABLE IF NOT EXISTS violations (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        chat_id BIGINT NOT NULL,
        violation_type VARCHAR(50) NOT NULL,
        reason TEXT NOT NULL,
        action_taken VARCHAR(50) NOT NULL,
        admin_id BIGINT,
        expires_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS warnings (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        chat_id BIGINT NOT NULL,
        warning_reason TEXT NOT NULL,
        admin_id BIGINT NOT NULL,
        severity INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS bot_configs (
        id SERIAL PRIMARY KEY,
        chat_id BIGINT NOT NULL,
        config_key VARCHAR(100) NOT NULL,
        config_value JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(chat_id, config_key)
      );
      
      CREATE TABLE IF NOT EXISTS autoreply_patterns (
        id SERIAL PRIMARY KEY,
        chat_id BIGINT,
        pattern_type VARCHAR(20) NOT NULL,
        trigger_text TEXT NOT NULL,
        reply_text TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by BIGINT,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS backups (
        id SERIAL PRIMARY KEY,
        backup_id VARCHAR(100) UNIQUE NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_groups_telegram_id ON groups(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
      CREATE INDEX IF NOT EXISTS idx_reports_target_user ON reports(target_user_id);
      CREATE INDEX IF NOT EXISTS idx_violations_user ON violations(user_id);
      CREATE INDEX IF NOT EXISTS idx_warnings_user ON warnings(user_id);
      CREATE INDEX IF NOT EXISTS idx_bot_configs_chat ON bot_configs(chat_id);
      CREATE INDEX IF NOT EXISTS idx_autoreply_chat ON autoreply_patterns(chat_id);
      CREATE INDEX IF NOT EXISTS idx_backups_created ON backups(created_at);
    `);
    
    logger.info('✅ Database tables created/verified');
    
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

// Helper functions
export async function query(text, params) {
  if (!db) {
    throw new Error('Database not configured');
  }
  
  try {
    const start = Date.now();
    const result = await db.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug(`Query executed in ${duration}ms: ${text.substring(0, 100)}...`);
    
    return result;
  } catch (error) {
    logger.error('Database query error:', { query: text, params, error });
    throw error;
  }
}

// Health check
export async function checkDatabaseHealth() {
  try {
    const result = await query('SELECT NOW() as time');
    return {
      healthy: true,
      timestamp: result.rows[0].time,
      message: 'Database connection is healthy'
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      message: 'Database connection failed'
    };
  }
}
