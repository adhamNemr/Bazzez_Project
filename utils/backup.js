const fs = require('fs');
const path = require('path');

// Configuration
const DB_FILE = path.join(__dirname, '../database.sqlite');
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_BACKUPS = 30; // Keep the last 30 backups

/**
 * Creates a backup of the database.sqlite file.
 * Returns true if successful, false otherwise.
 */
function performBackup() {
    try {
        // 1. Ensure backup directory exists
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        // 2. Check if original DB exists
        if (!fs.existsSync(DB_FILE)) {
            console.warn('⚠️ No database.sqlite found to backup.');
            return false;
        }

        // 3. Generate timestamped filename
        const now = new Date();
        const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
        const backupFile = path.join(BACKUP_DIR, `database_backup_${timestamp}.sqlite`);

        // 4. Copy the file
        fs.copyFileSync(DB_FILE, backupFile);
        console.log(`✅ [Auto Backup] Database backed up successfully to: ${backupFile}`);

        // 5. Clean up old backups
        cleanupOldBackups();

        return true;
    } catch (error) {
        console.error('❌ [Auto Backup Error] Failed to backup database:', error);
        return false;
    }
}

/**
 * Removes older backups if they exceed MAX_BACKUPS
 */
function cleanupOldBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.startsWith('database_backup_') && file.endsWith('.sqlite'))
            .map(file => ({
                name: file,
                path: path.join(BACKUP_DIR, file),
                time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time); // Sort newest first

        if (files.length > MAX_BACKUPS) {
            const filesToDelete = files.slice(MAX_BACKUPS);
            filesToDelete.forEach(file => {
                fs.unlinkSync(file.path);
                console.log(`🧹 [Auto Backup Cleanup] Deleted old backup: ${file.name}`);
            });
        }
    } catch (error) {
        console.error('❌ [Auto Backup Error] Failed to cleanup old backups:', error);
    }
}

/**
 * Starts the auto-backup scheduler.
 * @param {number} intervalHours - How often to run the backup in hours.
 */
function startAutoBackup(intervalHours = 12) {
    console.log(`🕒 [Auto Backup] Scheduler started. Backing up every ${intervalHours} hours.`);
    
    // Perform an initial backup on startup just in case
    performBackup();

    // Schedule periodic backups
    const intervalMs = intervalHours * 60 * 60 * 1000;
    setInterval(() => {
        performBackup();
    }, intervalMs);
}

module.exports = {
    performBackup,
    startAutoBackup
};
