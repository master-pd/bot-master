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

### 2. Local Setup
```bash
# Clone and install
git clone <repository>
cd bot-master
npm install

# Configure
cp master.json.example master.json
# Edit master.json with your settings
