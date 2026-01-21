// versions/v1/settings.feature.js
export default {
  name: 'settings',
  version: 'v1',
  description: 'Bot settings configuration',
  events: ['message'],
  permissions: ['admin', 'owner', 'bot_owner'],
  ignore_if_sender_is_bot: true,
  
  async handler(ctx) {
    const text = ctx.message?.text;
    if (!text || !text.startsWith('/settings')) return;
    
    const args = text.split(' ').slice(1);
    
    if (args.length === 0) {
      return await showSettings(ctx);
    }
    
    const [action, key, ...valueParts] = args;
    const value = valueParts.join(' ');
    
    switch (action.toLowerCase()) {
      case 'set':
        return await setSetting(ctx, key, value);
      case 'get':
        return await getSetting(ctx, key);
      case 'reset':
        return await resetSetting(ctx, key);
      default:
        return ctx.reply('❌ Invalid action. Use: /settings [set|get|reset]');
    }
  }
};

async function showSettings(ctx) {
  const settings = {
    welcome: '✅ Enabled',
    autoreply: '✅ Enabled',
    reports: '✅ Enabled',
    antispam: '✅ Enabled',
    nsfw_filter: '❌ Disabled'
  };
  
  let settingsText = '⚙️ <b>Current Settings:</b>\n\n';
  
  for (const [key, value] of Object.entries(settings)) {
    settingsText += `• ${key}: ${value}\n`;
  }
  
  settingsText += '\n📝 <b>Usage:</b>\n';
  settingsText += '/settings set welcome off\n';
  settingsText += '/settings get welcome\n';
  settingsText += '/settings reset welcome\n\n';
  settingsText += '📋 <b>Available settings:</b>\n';
  settingsText += 'welcome, autoreply, reports, antispam, nsfw_filter';
  
  return ctx.reply(settingsText);
}

async function setSetting(ctx, key, value) {
  const validSettings = ['welcome', 'autoreply', 'reports', 'antispam', 'nsfw_filter'];
  const validValues = ['on', 'off', 'true', 'false', 'enable', 'disable'];
  
  if (!validSettings.includes(key)) {
    return ctx.reply(`❌ Invalid setting. Available: ${validSettings.join(', ')}`);
  }
  
  const normalizedValue = value.toLowerCase();
  const isEnabled = ['on', 'true', 'enable'].includes(normalizedValue);
  
  // Save to database
  await setChatConfig(ctx.chat.id, key, isEnabled);
  
  return ctx.reply(
    `✅ Setting updated!\n\n` +
    `<b>${key}</b>: ${isEnabled ? '✅ Enabled' : '❌ Disabled'}`
  );
}

async function getSetting(ctx, key) {
  const value = await getChatConfig(ctx.chat.id, key);
  
  if (value === null) {
    return ctx.reply(`⚠️ Setting <b>${key}</b> is not configured (using default)`);
  }
  
  return ctx.reply(
    `🔧 <b>Setting:</b> ${key}\n` +
    `<b>Value:</b> ${value ? '✅ Enabled' : '❌ Disabled'}`
  );
}

async function resetSetting(ctx, key) {
  // Delete from database
  await db.query(
    'DELETE FROM bot_configs WHERE chat_id = $1 AND config_key = $2',
    [ctx.chat.id, key]
  );
  
  return ctx.reply(`✅ Setting <b>${key}</b> has been reset to default`);
}
