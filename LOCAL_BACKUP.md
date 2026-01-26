# Local Database Backup - Complete Guide

## Overview

Automated daily database backups stored locally on the server with 30-day retention.

**Backup Location:** `/var/backups/certificate-app/`  
**Schedule:** Daily at 2:00 AM  
**Retention:** 30 days (automatic cleanup)  
**Format:** `backup_YYYYMMDD_HHMMSS.sql.gz` (compressed)

---

## Initial Setup

### Step 1: Pull Latest Code
```bash
cd /var/www/certificate-app
git pull origin main
```

### Step 2: Make Scripts Executable
```bash
chmod +x scripts/backup-database.sh
chmod +x scripts/restore-database.sh
```

### Step 3: Test Backup Manually
```bash
./scripts/backup-database.sh
```

### Step 4: Verify Backup Created
```bash
ls -lh /var/backups/certificate-app/
```

Expected output:
```
-rw-r--r-- 1 root root 45M Jan 26 22:30 backup_20260126_223000.sql.gz
```

### Step 5: Set Up Cron Job (Daily at 2 AM)
```bash
crontab -e
```

Add this line:
```
0 2 * * * /var/www/certificate-app/scripts/backup-database.sh
```

Save and exit:
- `Ctrl + O` (save)
- `Enter` (confirm)
- `Ctrl + X` (exit)

### Step 6: Verify Cron Job
```bash
crontab -l
```

---

## Backup Script Details

**Location:** `/var/www/certificate-app/scripts/backup-database.sh`

**What it does:**
1. Creates SQL dump of database
2. Compresses with gzip
3. Saves to `/var/backups/certificate-app/`
4. Uploads to Google Drive (if enabled)
5. Deletes backups older than 30 days
6. Logs everything to `/var/log/db-backup.log`

**Configuration:**
```bash
BACKUP_DIR="/var/backups/certificate-app"
DB_NAME="certificate"
DB_USER="certuser"
DB_PASSWORD="Sendcertificates@00"
RETENTION_DAYS=30
GDRIVE_ENABLED=true
```

---

## Manual Operations

### Create Backup Now
```bash
/var/www/certificate-app/scripts/backup-database.sh
```

### List All Backups
```bash
ls -lth /var/backups/certificate-app/
```

### Count Backups
```bash
ls -1 /var/backups/certificate-app/backup_*.sql.gz | wc -l
```

### Check Backup Size
```bash
du -sh /var/backups/certificate-app/
```

### View Latest Backup
```bash
ls -lt /var/backups/certificate-app/ | head -2
```

### Delete Specific Backup
```bash
rm /var/backups/certificate-app/backup_20260126_223000.sql.gz
```

### Delete All Backups (CAREFUL!)
```bash
rm /var/backups/certificate-app/backup_*.sql.gz
```

---

## Restoration

### List Available Backups
```bash
./scripts/restore-database.sh
```

### Restore from Specific Backup
```bash
./scripts/restore-database.sh /var/backups/certificate-app/backup_20260126_223000.sql.gz
```

**⚠️ WARNING:** This will overwrite the current database!

### Restoration Process
1. Script stops the application (`pm2 stop`)
2. Decompresses backup
3. Restores to database
4. Restarts application (`pm2 restart`)

---

## Monitoring

### Check Backup Logs
```bash
tail -f /var/log/db-backup.log
```

### View Last 50 Log Lines
```bash
tail -50 /var/log/db-backup.log
```

### Check Today's Backups
```bash
ls -lh /var/backups/certificate-app/backup_$(date +%Y%m%d)*.sql.gz
```

### Verify Backup Integrity
```bash
gunzip -t /var/backups/certificate-app/backup_20260126_223000.sql.gz
echo $?  # Should return 0 if OK
```

### View Backup Contents (first 20 lines)
```bash
gunzip -c /var/backups/certificate-app/backup_20260126_223000.sql.gz | head -20
```

---

## Cron Job Management

### View Current Cron Jobs
```bash
crontab -l
```

### Edit Cron Jobs
```bash
crontab -e
```

### Remove All Cron Jobs
```bash
crontab -r
```

### Cron Schedule Examples
```bash
# Every day at 2 AM
0 2 * * * /var/www/certificate-app/scripts/backup-database.sh

# Every day at 3:30 AM
30 3 * * * /var/www/certificate-app/scripts/backup-database.sh

# Twice daily (2 AM and 2 PM)
0 2,14 * * * /var/www/certificate-app/scripts/backup-database.sh

# Every 6 hours
0 */6 * * * /var/www/certificate-app/scripts/backup-database.sh
```

---

## Troubleshooting

### Backup Not Running

**Check cron job exists:**
```bash
crontab -l
```

**Check cron service:**
```bash
systemctl status cron
```

**Restart cron:**
```bash
systemctl restart cron
```

### Backup Fails

**Check logs:**
```bash
tail -50 /var/log/db-backup.log
```

**Check disk space:**
```bash
df -h
```

**Check permissions:**
```bash
ls -la /var/backups/certificate-app/
```

**Fix permissions:**
```bash
chmod 755 /var/backups/certificate-app/
chmod +x /var/www/certificate-app/scripts/backup-database.sh
```

### Database Connection Issues

**Test database connection:**
```bash
PGPASSWORD=Sendcertificates@00 psql -U certuser -h localhost -d certificate -c "SELECT 1;"
```

**Check PostgreSQL status:**
```bash
systemctl status postgresql
```

### Restoration Fails

**Check backup file exists:**
```bash
ls -lh /var/backups/certificate-app/backup_20260126_223000.sql.gz
```

**Test decompression:**
```bash
gunzip -t /var/backups/certificate-app/backup_20260126_223000.sql.gz
```

**Check database exists:**
```bash
PGPASSWORD=Sendcertificates@00 psql -U certuser -h localhost -l
```

---

## Disaster Recovery

### Complete Recovery Procedure

1. **Stop application:**
```bash
pm2 stop certificate-app
```

2. **Find latest backup:**
```bash
ls -lt /var/backups/certificate-app/ | head -5
```

3. **Restore database:**
```bash
./scripts/restore-database.sh /var/backups/certificate-app/backup_YYYYMMDD_HHMMSS.sql.gz
```

4. **Verify restoration:**
```bash
PGPASSWORD=Sendcertificates@00 psql -U certuser -d certificate -c "SELECT COUNT(*) FROM \"User\";"
```

5. **Restart application:**
```bash
pm2 restart certificate-app
```

6. **Check health:**
```bash
curl http://localhost:3000/api/health
```

---

## Backup Storage Calculation

**Example:**
- Database size: ~100 MB
- Compressed: ~50 MB
- Daily backups: 30 days
- **Total storage needed: ~1.5 GB**

**Check current usage:**
```bash
du -sh /var/backups/certificate-app/
```

---

## Best Practices

### Daily Checks
- [ ] Verify backup ran (check logs)
- [ ] Confirm backup file created
- [ ] Check disk space

### Weekly Tasks
- [ ] Review backup logs for errors
- [ ] Verify backup sizes are normal
- [ ] Test restoration (on test database)

### Monthly Tasks
- [ ] Full restoration test
- [ ] Review retention policy
- [ ] Clean up old logs

---

## Security

**Backup File Permissions:**
```bash
# View permissions
ls -la /var/backups/certificate-app/

# Secure backups (only root can read)
chmod 600 /var/backups/certificate-app/backup_*.sql.gz
```

**Database Password Security:**
- Stored in script: `/var/www/certificate-app/scripts/backup-database.sh`
- Only root can read: `chmod 700 scripts/backup-database.sh`

---

## Quick Reference

```bash
# Manual backup
/var/www/certificate-app/scripts/backup-database.sh

# List backups
ls -lth /var/backups/certificate-app/

# Check logs
tail -f /var/log/db-backup.log

# Restore backup
./scripts/restore-database.sh /var/backups/certificate-app/backup_YYYYMMDD_HHMMSS.sql.gz

# View cron jobs
crontab -l

# Check disk space
df -h

# Backup integrity test
gunzip -t /var/backups/certificate-app/backup_*.sql.gz
```

---

## Configuration Summary

| Setting | Value |
|---------|-------|
| Backup Location | `/var/backups/certificate-app/` |
| Schedule | Daily at 2:00 AM |
| Retention | 30 days |
| Format | `.sql.gz` (compressed) |
| Log File | `/var/log/db-backup.log` |
| Database | certificate |
| User | certuser |
| Compression | gzip |

---

**Status:** ✅ Operational  
**Last Updated:** January 26, 2026
