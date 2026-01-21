// Context builder
import { Telegraf } from 'telegraf';

let botInstance = null;

export function createContext(update, botToken) {
  if (!botInstance) {
    botInstance = new Telegraf(botToken);
  }
  
  const ctx = {
    update,
    telegram: botInstance.telegram,
    botInfo: botInstance.botInfo,
    
    // Message properties
    message: update.message,
    editedMessage: update.edited_message,
    callbackQuery: update.callback_query,
    inlineQuery: update.inline_query,
    chatMember: update.chat_member,
    myChatMember: update.my_chat_member,
    chatJoinRequest: update.chat_join_request,
    
    // Extract common properties
    get from() {
      return this.message?.from || 
             this.editedMessage?.from ||
             this.callbackQuery?.from ||
             this.inlineQuery?.from ||
             this.chatMember?.from ||
             this.myChatMember?.from ||
             this.chatJoinRequest?.from;
    },
    
    get chat() {
      return this.message?.chat ||
             this.editedMessage?.chat ||
             this.callbackQuery?.message?.chat ||
             this.chatMember?.chat ||
             this.myChatMember?.chat ||
             this.chatJoinRequest?.chat;
    },
    
    get text() {
      return this.message?.text ||
             this.editedMessage?.text ||
             this.callbackQuery?.data;
    },
    
    get messageId() {
      return this.message?.message_id ||
             this.editedMessage?.message_id ||
             this.callbackQuery?.message?.message_id;
    },
    
    // Helper methods
    reply(text, options = {}) {
      return this.telegram.sendMessage(this.chat.id, text, {
        parse_mode: 'HTML',
        ...options
      });
    },
    
    deleteMessage() {
      if (this.chat && this.messageId) {
        return this.telegram.deleteMessage(this.chat.id, this.messageId);
      }
    },
    
    getChatMember(userId) {
      return this.telegram.getChatMember(this.chat.id, userId);
    },
    
    banUser(userId, options = {}) {
      return this.telegram.banChatMember(this.chat.id, userId, options);
    },
    
    unbanUser(userId) {
      return this.telegram.unbanChatMember(this.chat.id, userId);
    }
  };
  
  return ctx;
}
