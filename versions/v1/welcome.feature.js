// Welcome system feature
export default {
  name: 'welcome',
  version: 'v1',
  description: 'Welcome new members with messages and images',
  events: ['chat_member'],
  permissions: ['member', 'admin', 'owner', 'bot_owner'],
  ignore_if_sender_is_bot: true,
  
  async handler(ctx) {
    // Check if it's a new member join
    if (ctx.chatMember && ctx.chatMember.new_chat_member.status === 'member') {
      return await handleNewMember(ctx);
    }
    
    return null;
  }
};

async function handleNewMember(ctx) {
  const newMember = ctx.chatMember.new_chat_member.user;
  const chat = ctx.chatMember.chat;
  
  // Don't welcome bots
  if (newMember.is_bot) return;
  
  try {
    // Get welcome message
    const welcomeMessage = getWelcomeMessage(newMember, chat);
    
    // Send welcome message
    await ctx.reply(welcomeMessage);
    
    // Optional: Send welcome image
    if (Math.random() > 0.5) { // 50% chance
      await sendWelcomeImage(ctx, newMember, chat);
    }
    
    return { action: 'welcome_sent', userId: newMember.id };
  } catch (error) {
    console.error('Welcome error:', error);
    return null;
  }
}

function getWelcomeMessage(user, chat) {
  const messages = [
    `🎉 Welcome <b>${user.first_name}</b> to <b>${chat.title}</b>!\nWe're happy to have you here!`,
    `👋 Hello <b>${user.first_name}</b>! Welcome to ${chat.title}!\nEnjoy your stay!`,
    `🌟 Welcome aboard, <b>${user.first_name}</b>!\nGreat to have you in ${chat.title}!`,
    `😊 Hi <b>${user.first_name}</b>! Welcome to the group!\nFeel free to introduce yourself!`,
    `🫡 Welcome <b>${user.first_name}</b>!\nYou're the ${getMemberCountText()} member!`
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
}

function getMemberCountText() {
  const counts = [
    'awesome', 'fantastic', 'amazing', 'wonderful', 'brilliant',
    'spectacular', 'excellent', 'outstanding', 'remarkable'
  ];
  return counts[Math.floor(Math.random() * counts.length)];
}

async function sendWelcomeImage(ctx, user, chat) {
  try {
    // Generate a simple welcome image URL (placeholder)
    // In production, use Cloudinary or similar
    const imageUrl = `https://via.placeholder.com/600x300/4a90e2/ffffff?text=Welcome+${encodeURIComponent(user.first_name)}+to+${encodeURIComponent(chat.title)}`;
    
    await ctx.telegram.sendPhoto(ctx.chat.id, imageUrl, {
      caption: `🎊 Welcome ${user.first_name}!`,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Welcome image error:', error);
  }
}
