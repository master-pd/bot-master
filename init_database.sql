-- init_database.sql
-- Neon.tech PostgreSQL initialization script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
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

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  member_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{
    "welcome": true,
    "autoreply": true,
    "reports": true,
    "antispam": true,
    "nsfw_filter": false,
    "max_warnings": 3,
    "welcome_message": "Welcome {user} to {group}!",
    "language": "en"
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports table
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
  reviewed_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (target_user_id) REFERENCES users(telegram_id),
  FOREIGN KEY (reporter_id) REFERENCES users(telegram_id)
);

-- Violations table
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(telegram_id)
);

-- Warnings table
CREATE TABLE IF NOT EXISTS warnings (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  chat_id BIGINT NOT NULL,
  warning_reason TEXT NOT NULL,
  admin_id BIGINT NOT NULL,
  severity INTEGER DEFAULT 1, -- 1: low, 2: medium, 3: high
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(telegram_id)
);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  chat_id BIGINT,
  user_id BIGINT,
  data JSONB NOT NULL,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cache table for temporary data
CREATE TABLE IF NOT EXISTS cache (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bot configurations
CREATE TABLE IF NOT EXISTS bot_configs (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  config_key VARCHAR(100) NOT NULL,
  config_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chat_id, config_key)
);

-- Auto-reply patterns
CREATE TABLE IF NOT EXISTS autoreply_patterns (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT,
  pattern_type VARCHAR(20) NOT NULL, -- 'exact', 'contains', 'regex'
  trigger_text TEXT NOT NULL,
  reply_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by BIGINT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_groups_telegram_id ON groups(telegram_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target_user ON reports(target_user_id);
CREATE INDEX IF NOT EXISTS idx_violations_user ON violations(user_id);
CREATE INDEX IF NOT EXISTS idx_violations_active ON violations(is_active);
CREATE INDEX IF NOT EXISTS idx_warnings_user ON warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_warnings_active ON warnings(is_active);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_autoreply_chat ON autoreply_patterns(chat_id);
CREATE INDEX IF NOT EXISTS idx_autoreply_active ON autoreply_patterns(is_active);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at 
    BEFORE UPDATE ON groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_configs_updated_at 
    BEFORE UPDATE ON bot_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_autoreply_patterns_updated_at 
    BEFORE UPDATE ON autoreply_patterns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initial data
INSERT INTO users (telegram_id, username, first_name, is_bot) 
VALUES (0, 'system', 'System', true) 
ON CONFLICT (telegram_id) DO NOTHING;

COMMENT ON TABLE users IS 'Telegram users data';
COMMENT ON TABLE groups IS 'Telegram groups/channels data';
COMMENT ON TABLE reports IS 'User reports system';
COMMENT ON TABLE violations IS 'User violations and actions';
COMMENT ON TABLE warnings IS 'User warnings system';
COMMENT ON TABLE analytics IS 'Bot usage analytics';
COMMENT ON TABLE cache IS 'Temporary cache storage';
COMMENT ON TABLE bot_configs IS 'Bot configuration per chat';
COMMENT ON TABLE autoreply_patterns IS 'Auto-reply patterns and triggers';
