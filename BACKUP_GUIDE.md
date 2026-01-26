# Database Backup & Restoration Guide

## Automated Backups

### Setup

1. **Make scripts executable:**
```bash
cd /var/www/certificate-app
chmod +x scripts/backup-database.sh
chmod +x scripts/restore-database.sh
```

2. **Test backup manually:**
```bash
./scripts/backup-database.sh
```

3. **Verify backup created:**
```bash
ls -lh /var/backups/certificate-app/
```

4. **Set up cron job (runs daily at 2 AM):**
```bash
crontab -e

# Add this line:
0 2 * * * /var/www/certificate-app/scripts/backup-database.sh
```

5. **Verify cron job:**
```bash
crontab -l
```

---

## Backup Details

- **Location:** `/var/backups/certificate-app/`
- **Format:** `backup_YYYYMMDD_HHMMSS.sql.gz`
- **Schedule:** Daily at 2:00 AM
- **Retention:** 30 days (automatic cleanup)
- **Compression:** gzip
- **Log:** `/var/log/db-backup.log`

---

## Monitoring Backups

### Check backup log:
```bash
tail -f /var/log/db-backup.log
```

### List all backups:
```bash
ls -lh /var/backups/certificate-app/
```

### Check backup size:
```bash
du -sh /var/backups/certificate-app/
```

### Count backups:
```bash
ls -1 /var/backups/certificate-app/backup_*.sql.gz | wc -l
```

---

## Restoration

### List available backups:
```bash
./scripts/restore-database.sh
```

### Restore from specific backup:
```bash
./scripts/restore-database.sh /var/backups/certificate-app/backup_20260126_020000.sql.gz
```

**⚠️ WARNING:** This will overwrite the current database!

---

## Disaster Recovery Procedure

### If database is corrupted:

1. **Stop the application:**
```bash
pm2 stop certificate-app
```

2. **Find latest backup:**
```bash
ls -lt /var/backups/certificate-app/ | head -5
```

3. **Restore from backup:**
```bash
./scripts/restore-database.sh /var/backups/certificate-app/backup_YYYYMMDD_HHMMSS.sql.gz
```

4. **Verify restoration:**
```bash
psql -U certuser -d certificate -c "SELECT COUNT(*) FROM \"User\";"
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

## Backup Verification

### Test backup integrity:
```bash
# Decompress and check
gunzip -t /var/backups/certificate-app/backup_YYYYMMDD_HHMMSS.sql.gz
echo $?  # Should return 0 if OK
```

### Check backup content:
```bash
# View first 20 lines
gunzip -c /var/backups/certificate-app/backup_YYYYMMDD_HHMMSS.sql.gz | head -20
```

---

## Troubleshooting

### Backup fails:
```bash
# Check log
tail -50 /var/log/db-backup.log

# Check disk space
df -h

# Check permissions
ls -la /var/backups/certificate-app/
```

### Restoration fails:
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Check database exists
psql -U certuser -l

# Check backup file is valid
gunzip -t <backup-file.sql.gz>
```

---

## Best Practices

1. ✅ **Test restoration monthly** - Verify backups work
2. ✅ **Monitor backup logs** - Check for failures
3. ✅ **Keep offsite copy** - Copy to another server/cloud
4. ✅ **Document procedures** - Keep this guide updated
5. ✅ **Alert on failures** - Set up email alerts

---

## Offsite Backup (Optional)

### Copy to remote server:
```bash
# Using rsync
rsync -avz /var/backups/certificate-app/ user@remote-server:/backups/certificate-app/

# Using scp
scp /var/backups/certificate-app/backup_*.sql.gz user@remote-server:/backups/
```

### Copy to cloud storage (S3):
```bash
# Install AWS CLI
apt-get install awscli

# Configure AWS credentials
aws configure

# Sync to S3
aws s3 sync /var/backups/certificate-app/ s3://your-bucket/certificate-backups/
```

---

**Last Updated:** January 26, 2026
