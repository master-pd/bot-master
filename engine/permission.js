// Permission system
export class PermissionManager {
  constructor() {
    this.levels = ['member', 'admin', 'owner', 'bot_owner'];
  }
  
  async resolve(ctx) {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    
    if (!userId) return { level: 'guest', permissions: [] };
    
    // Bot owner check
    if (userId.toString() === process.env.BOT_OWNER_ID) {
      return {
        level: 'bot_owner',
        permissions: this.getAllPermissions()
      };
    }
    
    // Owner check (chat creator)
    if (chatId) {
      try {
        const chatMember = await ctx.telegram.getChatMember(chatId, userId);
        if (chatMember.status === 'creator') {
          return {
            level: 'owner',
            permissions: this.getOwnerPermissions()
          };
        }
      } catch (e) {
        console.error('Error checking chat owner:', e);
      }
    }
    
    // Admin check
    if (chatId) {
      try {
        const chatMember = await ctx.telegram.getChatMember(chatId, userId);
        if (chatMember.status === 'administrator') {
          return {
            level: 'admin',
            permissions: this.getAdminPermissions()
          };
        }
      } catch (e) {
        console.error('Error checking admin:', e);
      }
    }
    
    // Default member
    return {
      level: 'member',
      permissions: this.getMemberPermissions()
    };
  }
  
  getAllPermissions() {
    return [
      'all', 'ban', 'kick', 'mute', 'unmute', 'warn', 'pin', 'unpin',
      'invite', 'promote', 'demote', 'delete', 'config', 'stats',
      'report', 'info', 'help', 'welcome'
    ];
  }
  
  getOwnerPermissions() {
    return [
      'ban', 'kick', 'mute', 'unmute', 'warn', 'pin', 'unpin',
      'invite', 'promote', 'demote', 'delete', 'config', 'stats',
      'report', 'info', 'help', 'welcome'
    ];
  }
  
  getAdminPermissions() {
    return [
      'ban', 'kick', 'mute', 'unmute', 'warn', 'pin', 'delete',
      'report', 'info', 'help', 'welcome'
    ];
  }
  
  getMemberPermissions() {
    return ['report', 'info', 'help'];
  }
  
  hasPermission(userPerms, requiredPerm) {
    if (userPerms.includes('all')) return true;
    return userPerms.includes(requiredPerm);
  }
}

export const permissionManager = new PermissionManager();
