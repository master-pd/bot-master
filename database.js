// database.js - Neon.tech PostgreSQL connection
import { Pool } from 'pg';

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// টেবিল স্ট্রাকচার
export async function initDatabase() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      telegram_id BIGINT UNIQUE,
      username VARCHAR(255),
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      language_code VARCHAR(10),
      is_bot BOOLEAN DEFAULT false,
      join_date TIMESTAMP DEFAULT NOW(),
      last_seen TIMESTAMP DEFAULT NOW(),
      violation_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      telegram_id BIGINT UNIQUE,
      title VARCHAR(500),
      type VARCHAR(50),
      description TEXT,
      member_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      settings JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS reports (
      id VARCHAR(50) PRIMARY KEY,
      target_user_id BIGINT,
      reporter_id BIGINT,
      chat_id BIGINT,
      message_id BIGINT,
      reason TEXT,
      evidence TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      reviewed_by BIGINT,
      review_notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      reviewed_at TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS violations (
      id SERIAL PRIMARY KEY,
      user_id BIGINT,
      chat_id BIGINT,
      violation_type VARCHAR(50),
      reason TEXT,
      action_taken VARCHAR(50),
      admin_id BIGINT,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS bot_configs (
      id SERIAL PRIMARY KEY,
      chat_id BIGINT,
      config_key VARCHAR(100),
      config_value JSONB,
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(chat_id, config_key)
    );
    
    CREATE TABLE IF NOT EXISTS analytics (
      id SERIAL PRIMARY KEY,
      event_type VARCHAR(50),
      chat_id BIGINT,
      user_id BIGINT,
      data JSONB,
      timestamp TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_violations_user ON violations(user_id);
  `);
}
