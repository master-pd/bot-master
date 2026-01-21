#!/bin/bash
# deploy.sh

echo "🚀 Starting Bot Master Platform Deployment..."

# Check dependencies
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm"
    exit 1
fi

if ! command -v wrangler &> /dev/null; then
    echo "📦 Installing Wrangler..."
    npm install -g wrangler
fi

echo "📁 Checking project structure..."
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔐 Setting up environment variables..."
if [ ! -f ".env" ]; then
    echo "⚠️ .env file not found, creating from template..."
    cp .env.example .env
    echo "📝 Please edit .env file with your credentials"
    exit 1
fi

echo "⚙️ Configuring Cloudflare..."
read -p "Enter your Cloudflare account email: " CLOUDFLARE_EMAIL
read -p "Enter your Cloudflare API key: " CLOUDFLARE_API_KEY

# Login to Cloudflare
echo "🔐 Logging into Cloudflare..."
wrangler config --api-key "$CLOUDFLARE_API_KEY" --email "$CLOUDFLARE_EMAIL"

echo "🗄️ Setting up database..."
read -p "Do you want to set up Neon.tech database? (y/n): " SETUP_DB
if [[ $SETUP_DB == "y" ]]; then
    echo "🌐 Please create a database on Neon.tech and update DATABASE_URL in .env"
    read -p "Press Enter when done..."
fi

echo "🔑 Setting secrets..."
# Set bot token
read -p "Enter your Telegram bot token: " BOT_TOKEN
wrangler secret put BOT_TOKEN <<< "$BOT_TOKEN"

# Set owner ID
read -p "Enter your Telegram user ID: " OWNER_ID
wrangler secret put BOT_OWNER_ID <<< "$OWNER_ID"

# Set database URL if exists
if grep -q "DATABASE_URL" .env; then
    DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2)
    wrangler secret put DATABASE_URL <<< "$DATABASE_URL"
fi

echo "🚀 Deploying to Cloudflare Workers..."
npm run deploy

echo "🌐 Setting webhook..."
WORKER_URL=$(wrangler whoami | grep -o "https://.*\.workers\.dev")
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WORKER_URL}/webhook"

echo "✅ Deployment completed!"
echo "📊 Worker URL: $WORKER_URL"
echo "🔧 Health check: $WORKER_URL/health"
echo "🤖 Your bot is now online!"
