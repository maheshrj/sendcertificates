# Google Drive Backup Setup - Complete Documentation

## ✅ Setup Complete

**Google Account:** cobalt.renault87@gmail.com  
**Remote Name:** cpgdrive  
**Backup Folder:** certificate-backups  
**Status:** Working ✅

---

## What Was Configured

### 1. rclone Installation
```bash
curl https://rclone.org/install.sh | sudo bash
```

### 2. Google Drive Configuration
```bash
rclone config
# Remote name: cpgdrive
# Storage: Google Drive
# Account: cobalt.renault87@gmail.com
```

### 3. Backup Folder Created
```bash
rclone mkdir cpgdrive:certificate-backups
```

### 4. Tested Successfully
```bash
rclone ls cpgdrive:certificate-backups/
# Output: 5 test.txt ✅
```

---

## How It Works

### Daily Backup Flow (2 AM)

1. **Create Database Backup**
   - Location: `/var/backups/certificate-app/`
   - Format: `backup_YYYYMMDD_HHMMSS.sql.gz`

2. **Upload to Google Drive**
   - Remote: `cpgdrive:certificate-backups/`
   - Account: cobalt.renault87@gmail.com
   - Automatic upload via rclone

3. **Cleanup Old Backups**
   - Local: Delete backups > 30 days
   - Google Drive: Delete backups > 30 days

---

## Manual Operations

### View Google Drive Backups
```bash
rclone ls cpgdrive:certificate-backups/
```

### Download Backup from Google Drive
```bash
rclone copy cpgdrive:certificate-backups/backup_20260126_020000.sql.gz /tmp/
```

### Upload Specific File
```bash
rclone copy /path/to/backup.sql.gz cpgdrive:certificate-backups/
```

### Check Google Drive Storage
```bash
rclone about cpgdrive:
```

### Delete Specific Backup
```bash
rclone delete cpgdrive:certificate-backups/backup_20260126_020000.sql.gz
```

---

## Monitoring

### Check Backup Logs
```bash
tail -f /var/log/db-backup.log
```

### Verify Latest Backup
```bash
# Local
ls -lth /var/backups/certificate-app/ | head -5

# Google Drive
rclone ls cpgdrive:certificate-backups/ --max-depth 1
```

### Count Backups
```bash
# Local
ls -1 /var/backups/certificate-app/backup_*.sql.gz | wc -l

# Google Drive
rclone ls cpgdrive:certificate-backups/ | wc -l
```

---

## Cron Job Setup

### Current Schedule
```bash
# Daily at 2 AM
0 2 * * * /var/www/certificate-app/scripts/backup-database.sh
```

### View Cron Jobs
```bash
crontab -l
```

### Edit Cron Schedule
```bash
crontab -e
```

---

## Troubleshooting

### Test Backup Script
```bash
cd /var/www/certificate-app
./scripts/backup-database.sh
```

### Check rclone Configuration
```bash
rclone config show
```

### Test Google Drive Connection
```bash
rclone lsd cpgdrive:
```

### Re-authenticate (if token expires)
```bash
# On local Windows machine
rclone authorize "drive"

# Copy token to server
rclone config reconnect cpgdrive:
```

---

## Backup Locations

### Local Server
- **Path:** `/var/backups/certificate-app/`
- **Retention:** 30 days
- **Format:** `backup_YYYYMMDD_HHMMSS.sql.gz`

### Google Drive
- **Account:** cobalt.renault87@gmail.com
- **Folder:** certificate-backups
- **Retention:** 30 days
- **Access:** https://drive.google.com

---

## Restoration Procedure

### From Local Backup
```bash
./scripts/restore-database.sh /var/backups/certificate-app/backup_20260126_020000.sql.gz
```

### From Google Drive Backup
```bash
# Download first
rclone copy cpgdrive:certificate-backups/backup_20260126_020000.sql.gz /tmp/

# Then restore
./scripts/restore-database.sh /tmp/backup_20260126_020000.sql.gz
```

---

## Security

- ✅ **Encryption:** Backups stored securely in Google Drive
- ✅ **Access Control:** Only cobalt.renault87@gmail.com can access
- ✅ **Authentication:** OAuth2 token stored in `/root/.config/rclone/rclone.conf`
- ✅ **Permissions:** Config file protected with `chmod 600`

---

## Storage Usage

### Example Calculation
- **Backup Size:** ~50 MB (compressed)
- **Daily Backups:** 30 days
- **Total Local:** ~1.5 GB
- **Total Google Drive:** ~1.5 GB

**Google Drive Free Tier:** 15 GB ✅ Plenty of space!

---

## Maintenance

### Weekly Checks
- [ ] Verify backups are running (check logs)
- [ ] Confirm Google Drive uploads working
- [ ] Check storage usage

### Monthly Tasks
- [ ] Test restoration from backup
- [ ] Verify backup integrity
- [ ] Review retention policy

---

## Quick Reference

```bash
# View backups
rclone ls cpgdrive:certificate-backups/

# Manual backup
./scripts/backup-database.sh

# Check logs
tail -f /var/log/db-backup.log

# Test connection
rclone lsd cpgdrive:

# Storage info
rclone about cpgdrive:
```

---

## Contact Information

**Google Account:** cobalt.renault87@gmail.com  
**Remote Name:** cpgdrive  
**Backup Folder:** certificate-backups  
**Server:** srv1261747  
**Setup Date:** January 26, 2026

---

**Status:** ✅ Fully Operational  
**Last Updated:** January 26, 2026
