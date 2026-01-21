// versions/v1/help.feature.js
export default {
  name: 'help',
  version: 'v1',
  description: 'Help command and information',
  events: ['message'],
  permissions: ['member', 'admin', 'owner', 'bot_owner'],
  ignore_if_sender_is_bot: true,
  
  async handler(ctx) {
    const text = ctx.message?.text;
    if (!text || !text.startsWith('/help')) return;
    
    const userPerms = await getUserPermissions(ctx);
    
    if (userPerms.includes('admin')) {
      return await sendAdminHelp(ctx);
    } else {
      return await sendMemberHelp(ctx);
    }
  }
};

async function sendAdminHelp(ctx) {
  const helpText = `
🎯 <b>Bot Master Platform - Admin Commands</b>

👮 <b>Moderation:</b>
• /ban [reason] - Ban user (reply to message)
• /kick [reason] - Kick user from group
• /mute [minutes] - Mute user (default: 60min)
• /unmute - Unmute user
• /warn [reason] - Warn user
• /warns @username - Check user warnings
• /delwarn @username - Delete warning

📌 <b>Management:</b>
• /pin - Pin message (reply to message)
• /unpin - Unpin message
• /promote - Promote to admin
• /demote - Remove admin
• /adminlist - List all admins
• /settings - Group settings

📝 <b>Reports:</b>
• /reports - View pending reports
• /resolve [report_id] - Mark report as resolved
• /ignore [report_id] - Ignore report

🛠 <b>Bot Control:</b>
• /config - Configure bot settings
• /stats - Group statistics
• /broadcast - Broadcast message
• /backup - Backup group data

👤 <b>User Info:</b>
• /info @username - User information
• /id - Get user/chat ID
• /me - Your info

📚 <b>Member Commands:</b>
• /report [reason] - Report user (reply to message)
• /rules - Group rules
• /help - Show this help

<i>Use /help [command] for detailed info</i>
`;

  return ctx.reply(helpText);
}

async function sendMemberHelp(ctx) {
  const helpText = `
🤖 <b>Bot Master Platform</b>

Welcome! I'm a moderation bot with these features:

📋 <b>Available Commands:</b>
• /start - Start the bot
• /help - Show this message
• /rules - Group rules
• /id - Get your ID
• /me - Your information
• /report [reason] - Report a user (reply to message)
• /feedback [message] - Send feedback

🛡️ <b>Reporting:</b>
To report a user:
1. Reply to their message
2. Type /report [reason]
Example: <code>/report spam messages</code>

📜 <b>Group Rules:</b>
1. Be respectful to everyone
2. No spam or advertising
3. No NSFW content
4. Follow admin instructions
5. Use English when possible

❓ <b>Need Help?</b>
Contact group admins or use /report for issues.

<i>This bot is powered by Bot Master Platform</i>
`;

  return ctx.reply(helpText);
}
