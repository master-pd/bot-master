// db-helpers.js
import { db } from './database.js';

export async function getUser(telegramId) {
  const result = await db.query(
    'SELECT * FROM users WHERE telegram_id = $1',
    [telegramId]
  );
  return result.rows[0];
}

export async function createOrUpdateUser(user) {
  const query = `
    INSERT INTO users (telegram_id, username, first_name, last_name, language_code, is_bot)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (telegram_id) 
    DO UPDATE SET 
      username = EXCLUDED.username,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      last_seen = NOW()
    RETURNING *;
  `;
  
  const result = await db.query(query, [
    user.id,
    user.username,
    user.first_name,
    user.last_name || '',
    user.language_code || 'en',
    user.is_bot || false
  ]);
  
  return result.rows[0];
}

export async function saveReport(report) {
  const query = `
    INSERT INTO reports (id, target_user_id, reporter_id, chat_id, message_id, reason, evidence)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  
  const result = await db.query(query, [
    report.id,
    report.target_user.id,
    report.reporter.id,
    report.chat.id,
    report.message.id,
    report.reason,
    JSON.stringify(report.message)
  ]);
  
  return result.rows[0];
}

export async function getChatConfig(chatId, key) {
  const result = await db.query(
    'SELECT config_value FROM bot_configs WHERE chat_id = $1 AND config_key = $2',
    [chatId, key]
  );
  return result.rows[0]?.config_value;
}

export async function setChatConfig(chatId, key, value) {
  const query = `
    INSERT INTO bot_configs (chat_id, config_key, config_value)
    VALUES ($1, $2, $3)
    ON CONFLICT (chat_id, config_key) 
    DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = NOW()
    RETURNING *;
  `;
  
  const result = await db.query(query, [chatId, key, JSON.stringify(value)]);
  return result.rows[0];
}
