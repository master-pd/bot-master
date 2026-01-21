#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
config({ path: join(__dirname, '..', '.env') });

console.log('🚀 Starting Bot Master Platform Deployment...\n');

async function deploy() {
  try {
    // 1. Check dependencies
    console.log('1️⃣ Checking dependencies...');
    execSync('npm --version', { stdio: 'inherit' });
    execSync('node --version', { stdio: 'inherit' });
    
    // 2. Install dependencies
    console.log('\n2️⃣ Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    
    // 3. Run tests
    console.log('\n3️⃣ Running tests...');
    try {
      execSync('npm test', { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️ Tests failed, but continuing deployment...');
    }
    
    // 4. Check environment
    console.log('\n4️⃣ Checking environment...');
    const requiredVars = ['BOT_TOKEN', 'BOT_OWNER_ID'];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
      console.log('Please set them in .env file or Cloudflare Secrets');
      process.exit(1);
    }
    
    // 5. Deploy to Cloudflare
    console.log('\n5️⃣ Deploying to Cloudflare Workers...');
    execSync('npx wrangler deploy', { stdio: 'inherit' });
    
    // 6. Get worker URL
    console.log('\n6️⃣ Getting worker URL...');
    const whoami = execSync('npx wrangler whoami', { encoding: 'utf-8' });
    const urlMatch = whoami.match(/https:\/\/[^\s]+/);
    const workerUrl = urlMatch ? urlMatch[0] : 'unknown';
    
    // 7. Set webhook
    console.log('\n7️⃣ Setting Telegram webhook...');
    const webhookUrl = `${workerUrl}/webhook`;
    const setWebhook = execSync(
      `curl -s -X POST "https://api.telegram.org/bot${process.env.BOT_TOKEN}/setWebhook?url=${webhookUrl}&max_connections=40"`,
      { encoding: 'utf-8' }
    );
    
    console.log('📡 Webhook response:', setWebhook);
    
    // 8. Health check
    console.log('\n8️⃣ Performing health check...');
    setTimeout(async () => {
      try {
        const health = await fetch(`${workerUrl}/health`);
        const data = await health.json();
        
        console.log('🏥 Health check result:', JSON.stringify(data, null, 2));
        
        if (data.status === 'online') {
          console.log('\n🎉 DEPLOYMENT SUCCESSFUL!');
          console.log(`🌐 Worker URL: ${workerUrl}`);
          console.log(`🤖 Bot is now online!`);
          console.log(`📊 Health: ${workerUrl}/health`);
          console.log(`ℹ️  Info: ${workerUrl}/info`);
        } else {
          console.error('❌ Health check failed');
        }
      } catch (error) {
        console.error('❌ Health check failed:', error.message);
      }
    }, 3000);
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deploy();
