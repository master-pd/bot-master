import { db } from '../engine/database.js';

async function seedDatabase() {
  console.log('🌱 Seeding database with initial data...\n');
  
  try {
    // Seed auto-reply patterns
    const patterns = [
      {
        chat_id: null,
        pattern_type: 'exact',
        trigger_text: 'hello',
        reply_text: 'Hi there! 👋'
      },
      {
        chat_id: null,
        pattern_type: 'exact',
        trigger_text: 'hi',
        reply_text: 'Hello! How can I help?'
      },
      {
        chat_id: null,
        pattern_type: 'contains',
        trigger_text: 'thank',
        reply_text: 'You\'re welcome! 😊'
      },
      {
        chat_id: null,
        pattern_type: 'contains',
        trigger_text: 'bot',
        reply_text: 'Yes, I\'m a bot! 🤖'
      }
    ];
    
    for (const pattern of patterns) {
      await db.query(
        `INSERT INTO autoreply_patterns 
         (chat_id, pattern_type, trigger_text, reply_text) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [pattern.chat_id, pattern.pattern_type, pattern.trigger_text, pattern.reply_text]
      );
    }
    
    console.log(`✅ Seeded ${patterns.length} auto-reply patterns`);
    
    // Seed default bot configurations
    const defaultConfigs = [
      {
        chat_id: 0, // Global defaults
        config_key: 'welcome',
        config_value: true
      },
      {
        chat_id: 0,
        config_key: 'autoreply',
        config_value: true
      },
      {
        chat_id: 0,
        config_key: 'reports',
        config_value: true
      },
      {
        chat_id: 0,
        config_key: 'antispam',
        config_value: true
      }
    ];
    
    for (const config of defaultConfigs) {
      await db.query(
        `INSERT INTO bot_configs (chat_id, config_key, config_value) 
         VALUES ($1, $2, $3)
         ON CONFLICT (chat_id, config_key) DO NOTHING`,
        [config.chat_id, config.config_key, JSON.stringify(config.config_value)]
      );
    }
    
    console.log(`✅ Seeded ${defaultConfigs.length} default configurations`);
    
    console.log('\n🎉 Database seeding completed!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
