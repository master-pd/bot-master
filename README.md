# 🤖 Bot Master Platform

A serverless, modular Telegram bot platform built on Cloudflare Workers.

## ✨ Features

- **🚀 Serverless** - No servers to manage
- **🔄 Auto-loading** - Features load automatically
- **📦 Modular** - Add features without restart
- **🔐 Permission-based** - Built-in permission system
- **💾 Database-ready** - PostgreSQL with Neon.tech

## 📁 Project Structure

- bot-master-platform/
- ├── worker.js # Main entry (DO NOT EDIT)
- ├── master.json # Global config
- ├── engine/ # Core engine
- ├── versions/ # Feature versions
- ├── data/ # JSON data files
- └── README.md

  
## 🚀 Quick Setup

### 1. Prerequisites
- Node.js 18+
- Cloudflare account
- Telegram bot token from @BotFather

---
```json
export default {
  name: 'feature_name',
  version: 'v1',
  events: ['message', 'callback_query'],
  permissions: ['admin'],
  handler: async (ctx) => {
    // Your code here
  }
};

```
---

#Table example 

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE,
  username VARCHAR(255),
  first_name VARCHAR(255),
  join_date TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reports (
  id VARCHAR(50) PRIMARY KEY,
  target_user_id BIGINT,
  reporter_id BIGINT,
  chat_id BIGINT,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```
### 2. Local Setup
```bash
# Clone and install
git clone <repository>
cd bot-master
npm install


