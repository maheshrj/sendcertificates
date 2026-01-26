# Google Drive Backup Setup Guide

## Overview
Automatically upload database backups to Google Drive for offsite storage.

---

## Step 1: Install rclone

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Verify installation
rclone version
```

---

## Step 2: Configure Google Drive

```bash
# Start configuration
rclone config

# Follow these steps:
# n) New remote
# name> gdrive
# Storage> drive (Google Drive)
# client_id> (press Enter to use default)
# client_secret> (press Enter to use default)
# scope> 1 (Full access)
# root_folder_id> (press Enter)
# service_account_file> (press Enter)
# Edit advanced config? n
# Use auto config? n (because you're on a server)
```

**You'll get a URL - Open it on your local computer:**
1. Copy the URL
2. Open in browser
3. Login to your Google account
4. Grant permissions
5. Copy the verification code
6. Paste it back in the terminal

```bash
# Verify configuration
rclone lsd gdrive:

# Create backup folder in Google Drive
rclone mkdir gdrive:certificate-backups
```

---

## Step 3: Update Backup Script

**Edit:** `scripts/backup-database.sh`

Add this at the end (before `exit 0`):

```bash
# Upload to Google Drive
echo "Uploading to Google Drive..." >> /var/log/db-backup.log
rclone copy "${BACKUP_FILE}.gz" gdrive:certificate-backups/ --log-file=/var/log/db-backup.log

if [ $? -eq 0 ]; then
    echo "✅ Backup uploaded to Google Drive successfully" >> /var/log/db-backup.log
else
    echo "❌ Failed to upload to Google Drive" >> /var/log/db-backup.log
fi

# Optional: Delete old backups from Google Drive (older than 30 days)
rclone delete gdrive:certificate-backups/ --min-age 30d --log-file=/var/log/db-backup.log
echo "Cleaned up old Google Drive backups" >> /var/log/db-backup.log
```

---

## Step 4: Test Upload

```bash
# Test manual upload
rclone copy /var/backups/certificate-app/backup_*.sql.gz gdrive:certificate-backups/

# Verify upload
rclone ls gdrive:certificate-backups/
```

---

## Step 5: Verify Daily Backups

After setting up cron, check:

```bash
# Check local backups
ls -lh /var/backups/certificate-app/

# Check Google Drive backups
rclone ls gdrive:certificate-backups/

# Check upload log
tail -f /var/log/db-backup.log
```

---

## Alternative: Google Drive Desktop Sync

If you prefer GUI:

1. Install Google Drive Desktop on your local machine
2. Set up rsync from server to your local machine
3. Google Drive will auto-sync

```bash
# On server, sync to your local machine
rsync -avz /var/backups/certificate-app/ user@your-local-ip:/path/to/google-drive/certificate-backups/
```

---

## Monitoring

### Check Google Drive storage:
```bash
rclone about gdrive:
```

### List all backups:
```bash
rclone ls gdrive:certificate-backups/ --max-depth 1
```

### Download backup from Google Drive:
```bash
rclone copy gdrive:certificate-backups/backup_20260126_020000.sql.gz /tmp/
```

---

## Troubleshooting

### rclone not found:
```bash
which rclone
# If not found, reinstall
curl https://rclone.org/install.sh | sudo bash
```

### Authentication expired:
```bash
rclone config reconnect gdrive:
```

### Upload fails:
```bash
# Check rclone config
rclone config show

# Test connection
rclone lsd gdrive:

# Check logs
tail -50 /var/log/db-backup.log
```

---

## Security Notes

1. ✅ **Encryption:** rclone supports encryption
2. ✅ **Access:** Only your Google account can access
3. ✅ **Credentials:** Stored in `~/.config/rclone/rclone.conf`
4. ⚠️ **Protect config:** `chmod 600 ~/.config/rclone/rclone.conf`

---

## Storage Calculation

**Example:**
- Backup size: ~50 MB compressed
- Daily backups: 30 days
- Total: ~1.5 GB

**Google Drive Free:** 15 GB ✅ Plenty of space!

---

## Complete Backup Flow

```
Daily at 2 AM:
1. Create database backup → /var/backups/certificate-app/
2. Compress with gzip
3. Upload to Google Drive → gdrive:certificate-backups/
4. Delete local backups > 30 days
5. Delete Google Drive backups > 30 days
6. Log everything
```

---

**Setup Time:** ~15 minutes  
**Cost:** Free (Google Drive 15GB)  
**Reliability:** ⭐⭐⭐⭐⭐
