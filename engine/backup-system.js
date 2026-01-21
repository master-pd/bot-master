// engine/backup-system.js
import { db } from './database.js';
import { logger } from './logger.js';

export class BackupSystem {
  constructor() {
    this.backupInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.maxBackups = 30; // Keep last 30 backups
    this.backupPath = 'backups/';
  }
  
  async scheduleBackups() {
    // Schedule automatic backups
    setInterval(() => {
      this.createBackup().catch(error => {
        logger.error('Scheduled backup failed:', error);
      });
    }, this.backupInterval);
    
    logger.info('✅ Backup system scheduled');
  }
  
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup-${timestamp}`;
    
    logger.info(`Creating backup: ${backupId}`);
    
    try {
      // Backup users
      const users = await db.query('SELECT * FROM users');
      const groups = await db.query('SELECT * FROM groups');
      const reports = await db.query('SELECT * FROM reports');
      const configs = await db.query('SELECT * FROM bot_configs');
      
      const backupData = {
        id: backupId,
        timestamp: new Date().toISOString(),
        counts: {
          users: users.rowCount,
          groups: groups.rowCount,
          reports: reports.rowCount,
          configs: configs.rowCount
        },
        data: {
          users: users.rows,
          groups: groups.rows,
          reports: reports.rows,
          configs: configs.rows
        }
      };
      
      // Save backup to database or cloud storage
      await this.saveBackup(backupData);
      
      // Clean old backups
      await this.cleanOldBackups();
      
      logger.info(`✅ Backup completed: ${backupId}`);
      
      return backupId;
      
    } catch (error) {
      logger.error('Backup creation failed:', error);
      throw error;
    }
  }
  
  async saveBackup(backupData) {
    // Save to database backup table
    await db.query(
      `INSERT INTO backups (backup_id, data, created_at) 
       VALUES ($1, $2, $3)`,
      [backupData.id, JSON.stringify(backupData), new Date()]
    );
    
    // Optional: Upload to cloud storage
    if (process.env.BACKUP_STORAGE_URL) {
      await this.uploadToCloud(backupData);
    }
  }
  
  async uploadToCloud(backupData) {
    try {
      await fetch(process.env.BACKUP_STORAGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData)
      });
    } catch (error) {
      logger.warn('Cloud backup upload failed:', error);
    }
  }
  
  async cleanOldBackups() {
    const result = await db.query(
      `SELECT backup_id FROM backups 
       ORDER BY created_at DESC 
       OFFSET $1`,
      [this.maxBackups]
    );
    
    if (result.rows.length > 0) {
      const oldBackups = result.rows.map(row => row.backup_id);
      
      await db.query(
        'DELETE FROM backups WHERE backup_id = ANY($1)',
        [oldBackups]
      );
      
      logger.info(`🧹 Cleaned ${oldBackups.length} old backups`);
    }
  }
  
  async restoreBackup(backupId) {
    logger.info(`Restoring from backup: ${backupId}`);
    
    try {
      // Get backup data
      const result = await db.query(
        'SELECT data FROM backups WHERE backup_id = $1',
        [backupId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Backup not found');
      }
      
      const backupData = result.rows[0].data;
      
      // Start restoration
      await this.restoreData(backupData.data);
      
      logger.info(`✅ Restoration completed: ${backupId}`);
      
      return true;
      
    } catch (error) {
      logger.error('Restoration failed:', error);
      throw error;
    }
  }
  
  async restoreData(data) {
    // Use transaction for safety
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Clear existing data
      await client.query('TRUNCATE TABLE users, groups, reports, bot_configs RESTART IDENTITY');
      
      // Restore users
      if (data.users && data.users.length > 0) {
        const userValues = data.users.map(user => 
          `(${user.telegram_id}, '${user.username}', '${user.first_name}')`
        ).join(',');
        
        await client.query(
          `INSERT INTO users (telegram_id, username, first_name) 
           VALUES ${userValues}`
        );
      }
      
      // Restore groups
      if (data.groups && data.groups.length > 0) {
        for (const group of data.groups) {
          await client.query(
            `INSERT INTO groups (telegram_id, title, type, settings) 
             VALUES ($1, $2, $3, $4)`,
            [group.telegram_id, group.title, group.type, JSON.stringify(group.settings)]
          );
        }
      }
      
      // Restore configurations
      if (data.configs && data.configs.length > 0) {
        for (const config of data.configs) {
          await client.query(
            `INSERT INTO bot_configs (chat_id, config_key, config_value) 
             VALUES ($1, $2, $3)`,
            [config.chat_id, config.config_key, JSON.stringify(config.config_value)]
          );
        }
      }
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async listBackups() {
    const result = await db.query(
      `SELECT backup_id, created_at, 
              (data->>'counts') as counts 
       FROM backups 
       ORDER BY created_at DESC 
       LIMIT 50`
    );
    
    return result.rows;
  }
}

// Add backup table to database
export async function createBackupTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS backups (
      id SERIAL PRIMARY KEY,
      backup_id VARCHAR(100) UNIQUE NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_backups_created ON backups(created_at);
  `);
}
