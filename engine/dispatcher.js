// Event dispatcher
export async function dispatchEvent(ctx, features) {
  const responses = [];
  let processed = false;
  
  for (const feature of features) {
    try {
      // Check if feature should handle this event
      if (shouldHandleEvent(feature, ctx)) {
        // Check permissions
        if (await checkPermissions(feature, ctx)) {
          // Check ignore bot
          if (feature.ignore_if_sender_is_bot && ctx.from?.is_bot) {
            continue;
          }
          
          // Execute handler
          const result = await feature.handler(ctx);
          if (result) {
            responses.push({
              feature: feature.name,
              result
            });
            processed = true;
          }
        }
      }
    } catch (error) {
      console.error(`Error in feature ${feature.name}:`, error);
    }
  }
  
  return { processed, responses };
}

function shouldHandleEvent(feature, ctx) {
  const eventType = getEventType(ctx);
  
  if (feature.events.includes('*')) {
    return true;
  }
  
  // Check message events
  if (ctx.message?.text && feature.events.includes('message')) {
    // Check for commands if feature is command-based
    if (feature.command) {
      const text = ctx.message.text.toLowerCase();
      const command = feature.command.toLowerCase();
      return text.startsWith(`/${command}`) || text.startsWith(`/${command}@`);
    }
    return true;
  }
  
  // Check specific event types
  return feature.events.includes(eventType);
}

function getEventType(ctx) {
  if (ctx.message) return 'message';
  if (ctx.edited_message) return 'edited_message';
  if (ctx.callback_query) return 'callback_query';
  if (ctx.inline_query) return 'inline_query';
  if (ctx.chat_member) return 'chat_member';
  if (ctx.my_chat_member) return 'my_chat_member';
  if (ctx.chat_join_request) return 'chat_join_request';
  return 'unknown';
}

async function checkPermissions(feature, ctx) {
  if (!feature.permissions || feature.permissions.length === 0) {
    return true;
  }
  
  const userPermissions = await getUserPermissions(ctx);
  
  // Check if user has at least one required permission
  return feature.permissions.some(perm => userPermissions.includes(perm));
}

async function getUserPermissions(ctx) {
  // Simplified permission check
  // In production, fetch from database
  const ownerId = process.env.BOT_OWNER_ID;
  
  if (ctx.from?.id.toString() === ownerId) {
    return ['owner', 'admin', 'member'];
  }
  
  // Check if user is admin in group
  if (ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup') {
    try {
      const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
      if (chatMember.status === 'creator' || chatMember.status === 'administrator') {
        return ['admin', 'member'];
      }
    } catch (e) {
      console.error('Error checking admin status:', e);
    }
  }
  
  return ['member'];
}
