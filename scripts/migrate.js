import { db, initDatabase } from '../engine/database.js';
import { logger } from '../engine/logger.js';

async function runMigrations() {
  console.log('🔄 Running database migrations...\n');
  
  try {
    // Initialize database (creates tables if not exist)
    await initDatabase();
    console.log('✅ Base tables created/verified');
    
    // Add any additional migrations here
    await db.query(`
      -- Migration 1: Add analytics table if not exists
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
      
      -- Migration 2: Add cache table
      CREATE TABLE IF NOT EXISTS cache (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Migration 3: Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at);
      
      -- Migration 4: Add system user
      INSERT INTO users (telegram_id, username, first_name, is_bot) 
      VALUES (0, 'system', 'System', true) 
      ON CONFLICT (telegram_id) DO NOTHING;
    `);
    
    console.log('✅ All migrations completed successfully');
    
    // Verify tables
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n📊 Database tables:');
    tables.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.table_name}`);
    });
    
    console.log(`\n✅ Total tables: ${tables.rowCount}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
