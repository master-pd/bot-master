import { BackupSystem } from '../engine/backup-system.js';
import { createBackupTable } from '../engine/backup-system.js';

async function runBackup() {
  console.log('💾 Starting manual backup...\n');
  
  try {
    // Ensure backup table exists
    await createBackupTable();
    
    const backupSystem = new BackupSystem();
    const backupId = await backupSystem.createBackup();
    
    console.log(`✅ Backup created successfully: ${backupId}`);
    
    // List recent backups
    const backups = await backupSystem.listBackups();
    
    console.log('\n📋 Recent backups:');
    backups.forEach((backup, index) => {
      const date = new Date(backup.created_at).toLocaleString();
      console.log(`  ${index + 1}. ${backup.backup_id} - ${date}`);
    });
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

runBackup();
