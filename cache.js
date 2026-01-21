// cache.js
export class CacheManager {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 300; // 5 minutes
  }
  
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, {
      value,
      expires: Date.now() + (ttl * 1000)
    });
    
    // Auto cleanup
    setTimeout(() => {
      if (this.cache.get(key)?.expires <= Date.now()) {
        this.cache.delete(key);
      }
    }, ttl * 1000);
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expires <= Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  delete(key) {
    this.cache.delete(key);
  }
  
  clear() {
    this.cache.clear();
  }
}
