// Report system feature
export default {
  name: 'report',
  version: 'v1',
  description: 'Report system for users',
  events: ['message'],
  permissions: ['member', 'admin', 'owner', 'bot_owner'],
  ignore_if_sender_is_bot: true,
  
  async handler(ctx) {
    const text = ctx.message?.text;
    if (!text) return;
    
    // Check for report command
    if (text.startsWith('/report')) {
      return await handleReportCommand(ctx);
    }
    
    return null;
  }
};

async function handleReportCommand(ctx) {
  const replyTo = ctx.message.reply_to_message;
  
  if (!replyTo) {
    return ctx.reply(
      '📝 <b>How to report:</b>\n\n' +
      '1. Reply to the offensive message with /report\n' +
      '2. Or use: /report [reason]\n\n' +
      'Example: <code>/report spam</code>'
    );
  }
  
  try {
    const targetUser = replyTo.from;
    const reporter = ctx.from;
    const reason = ctx.message.text.split(' ').slice(1).join(' ') || 'No reason provided';
    const chat = ctx.chat;
    
    // Create report object
    const report = {
      id: generateReportId(),
      target_user: {
        id: targetUser.id,
        name: `${targetUser.first_name} ${targetUser.last_name || ''}`,
        username: targetUser.username
      },
      reporter: {
        id: reporter.id,
        name: `${reporter.first_name} ${reporter.last_name || ''}`,
        username: reporter.username
      },
      chat: {
        id: chat.id,
        title: chat.title,
        type: chat.type
      },
      message: {
        id: replyTo.message_id,
        text: replyTo.text?.substring(0, 200) || '[Media message]',
        date: new Date(replyTo.date * 1000).toISOString()
      },
      reason: reason,
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    
    // In production: Save to database
    // await saveReport(report);
    
    // Notify group admins
    await notifyAdmins(ctx, report);
    
    // Notify bot owner (via PM)
    await notifyBotOwner(report);
    
    // Confirm to reporter
    await ctx.reply(
      `✅ <b>Report submitted!</b>\n\n` +
      `👤 Reported user: <b>${targetUser.first_name}</b>\n` +
      `📝 Reason: ${reason}\n\n` +
      `The admins have been notified.`
    );
    
    return { action: 'report_submitted', reportId: report.id };
    
  } catch (error) {
    console.error('Report error:', error);
    return ctx.reply('❌ Failed to submit report. Please try again.');
  }
}

async function notifyAdmins(ctx, report) {
  try {
    const admins = await ctx.telegram.getChatAdministrators(ctx.chat.id);
    
    for (const admin of admins) {
      if (!admin.user.is_bot) {
        try {
          await ctx.telegram.sendMessage(
            admin.user.id,
            `🚨 <b>New Report Alert</b>\n\n` +
            `Chat: <b>${report.chat.title}</b>\n` +
            `Reported user: <b>${report.target_user.name}</b> (@${report.target_user.username || 'N/A'})\n` +
            `Reporter: <b>${report.reporter.name}</b>\n` +
            `Reason: ${report.reason}\n\n` +
            `Message: ${report.message.text}\n\n` +
            `⚠️ Please review and take appropriate action.`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {
          // Admin might have PMs disabled
          console.log(`Could not message admin ${admin.user.id}`);
        }
      }
    }
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
}

async function notifyBotOwner(report) {
  const ownerId = process.env.BOT_OWNER_ID;
  
  if (!ownerId) return;
  
  try {
    // This would need bot instance - simplified for now
    // In production, use bot instance to send message
    console.log('Report for bot owner:', report);
    
    // Simulated owner notification
    // await bot.telegram.sendMessage(ownerId, `New report: ${report.id}`);
  } catch (error) {
    console.error('Error notifying bot owner:', error);
  }
}

function generateReportId() {
  return 'RPT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}
