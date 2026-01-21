// Admin management feature
export default {
  name: 'admin',
  version: 'v1',
  description: 'Admin and moderation commands',
  events: ['message'],
  permissions: ['admin', 'owner', 'bot_owner'],
  ignore_if_sender_is_bot: true,
  
  async handler(ctx) {
    const text = ctx.message?.text;
    if (!text || !text.startsWith('/')) return;
    
    const command = text.split(' ')[0].toLowerCase();
    
    switch (command) {
      case '/ban':
        return await handleBan(ctx);
      case '/kick':
        return await handleKick(ctx);
      case '/mute':
        return await handleMute(ctx);
      case '/warn':
        return await handleWarn(ctx);
      case '/pin':
        return await handlePin(ctx);
      case '/adminlist':
        return await handleAdminList(ctx);
      case '/promote':
        return await handlePromote(ctx);
      default:
        return null;
    }
  }
};

async function handleBan(ctx) {
  try {
    const replyTo = ctx.message.reply_to_message;
    if (!replyTo) {
      return ctx.reply('❌ Please reply to a message to ban the user');
    }
    
    const targetId = replyTo.from.id;
    const reason = ctx.message.text.split(' ').slice(1).join(' ') || 'No reason provided';
    
    await ctx.banUser(targetId);
    
    return ctx.reply(
      `✅ User <b>${replyTo.from.first_name}</b> has been banned.\n` +
      `📝 Reason: ${reason}\n` +
      `🛠 Admin: ${ctx.from.first_name}`
    );
  } catch (error) {
    console.error('Ban error:', error);
    return ctx.reply('❌ Failed to ban user. I might not have admin permissions.');
  }
}

async function handleKick(ctx) {
  try {
    const replyTo = ctx.message.reply_to_message;
    if (!replyTo) {
      return ctx.reply('❌ Please reply to a message to kick the user');
    }
    
    const targetId = replyTo.from.id;
    
    // Ban and immediately unban (kick)
    await ctx.banUser(targetId);
    await ctx.unbanUser(targetId);
    
    return ctx.reply(
      `👢 User <b>${replyTo.from.first_name}</b> has been kicked.\n` +
      `🛠 Admin: ${ctx.from.first_name}`
    );
  } catch (error) {
    console.error('Kick error:', error);
    return ctx.reply('❌ Failed to kick user.');
  }
}

async function handleMute(ctx) {
  try {
    const replyTo = ctx.message.reply_to_message;
    if (!replyTo) {
      return ctx.reply('❌ Please reply to a message to mute the user');
    }
    
    const targetId = replyTo.from.id;
    const duration = ctx.message.text.split(' ')[1] || '60'; // Default 60 minutes
    
    // Restrict user permissions
    await ctx.telegram.restrictChatMember(ctx.chat.id, targetId, {
      can_send_messages: false,
      can_send_media_messages: false,
      can_send_polls: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false,
      until_date: Math.floor(Date.now() / 1000) + (parseInt(duration) * 60)
    });
    
    return ctx.reply(
      `🔇 User <b>${replyTo.from.first_name}</b> has been muted for ${duration} minutes.\n` +
      `🛠 Admin: ${ctx.from.first_name}`
    );
  } catch (error) {
    console.error('Mute error:', error);
    return ctx.reply('❌ Failed to mute user.');
  }
}

async function handleWarn(ctx) {
  try {
    const replyTo = ctx.message.reply_to_message;
    if (!replyTo) {
      return ctx.reply('❌ Please reply to a message to warn the user');
    }
    
    const reason = ctx.message.text.split(' ').slice(1).join(' ') || 'Violation of rules';
    
    // Store warning in database (simplified)
    const warning = {
      userId: replyTo.from.id,
      chatId: ctx.chat.id,
      adminId: ctx.from.id,
      reason: reason,
      timestamp: new Date().toISOString()
    };
    
    // In production: Save to database
    // await saveWarning(warning);
    
    // Notify user via PM
    try {
      await ctx.telegram.sendMessage(
        replyTo.from.id,
        `⚠️ <b>You have been warned</b>\n` +
        `Chat: ${ctx.chat.title || 'Group'}\n` +
        `Reason: ${reason}\n` +
        `Admin: ${ctx.from.first_name}`
      );
    } catch (e) {
      // User might have PMs disabled
    }
    
    return ctx.reply(
      `⚠️ User <b>${replyTo.from.first_name}</b> has been warned.\n` +
      `📝 Reason: ${reason}\n` +
      `🛠 Admin: ${ctx.from.first_name}`
    );
  } catch (error) {
    console.error('Warn error:', error);
    return ctx.reply('❌ Failed to warn user.');
  }
}

async function handlePin(ctx) {
  try {
    const replyTo = ctx.message.reply_to_message;
    if (!replyTo) {
      return ctx.reply('❌ Please reply to a message to pin it');
    }
    
    await ctx.telegram.pinChatMessage(ctx.chat.id, replyTo.message_id);
    
    return ctx.reply(
      `📌 Message pinned by <b>${ctx.from.first_name}</b>`
    );
  } catch (error) {
    console.error('Pin error:', error);
    return ctx.reply('❌ Failed to pin message.');
  }
}

async function handleAdminList(ctx) {
  try {
    const admins = await ctx.telegram.getChatAdministrators(ctx.chat.id);
    
    let adminList = '👑 <b>Group Administrators:</b>\n\n';
    
    admins.forEach((admin, index) => {
      const user = admin.user;
      const status = admin.status === 'creator' ? '👑 Owner' : '🛠 Admin';
      adminList += `${index + 1}. ${user.first_name} ${user.last_name || ''} (@${user.username || 'NoUsername'}) - ${status}\n`;
    });
    
    return ctx.reply(adminList);
  } catch (error) {
    console.error('Admin list error:', error);
    return ctx.reply('❌ Failed to get admin list.');
  }
}

async function handlePromote(ctx) {
  try {
    const replyTo = ctx.message.reply_to_message;
    if (!replyTo) {
      return ctx.reply('❌ Please reply to a message to promote the user');
    }
    
    const targetId = replyTo.from.id;
    
    // Promote to admin
    await ctx.telegram.promoteChatMember(ctx.chat.id, targetId, {
      can_change_info: true,
      can_delete_messages: true,
      can_invite_users: true,
      can_restrict_members: true,
      can_pin_messages: true,
      can_promote_members: false
    });
    
    return ctx.reply(
      `⭐ User <b>${replyTo.from.first_name}</b> has been promoted to admin!\n` +
      `🎉 Congratulations!`
    );
  } catch (error) {
    console.error('Promote error:', error);
    return ctx.reply('❌ Failed to promote user. I might not have permission.');
  }
}
