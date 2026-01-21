// Auto-reply system feature
import autoreplyData from '../../data/autoreply.json' assert { type: 'json' };

export default {
  name: 'autoreply',
  version: 'v1',
  description: 'Automatic replies to messages',
  events: ['message'],
  permissions: ['member', 'admin', 'owner', 'bot_owner'],
  ignore_if_sender_is_bot: true,
  
  async handler(ctx) {
    const text = ctx.message?.text;
    if (!text) return;
    
    // Don't reply to commands
    if (text.startsWith('/')) return;
    
    const reply = findAutoReply(text);
    if (reply) {
      await ctx.reply(reply);
      return { action: 'autoreply_sent', trigger: text };
    }
    
    return null;
  }
};

function findAutoReply(message) {
  const msg = message.toLowerCase().trim();
  
  // Check exact matches
  for (const [trigger, reply] of Object.entries(autoreplyData.exact)) {
    if (msg === trigger.toLowerCase()) {
      return getRandomReply(reply);
    }
  }
  
  // Check contains matches
  for (const [trigger, reply] of Object.entries(autoreplyData.contains)) {
    if (msg.includes(trigger.toLowerCase())) {
      return getRandomReply(reply);
    }
  }
  
  // Check regex patterns
  for (const pattern of autoreplyData.regex) {
    const regex = new RegExp(pattern.pattern, 'i');
    if (regex.test(msg)) {
      return getRandomReply(pattern.reply);
    }
  }
  
  return null;
}

function getRandomReply(reply) {
  if (Array.isArray(reply)) {
    return reply[Math.floor(Math.random() * reply.length)];
  }
  return reply;
}
