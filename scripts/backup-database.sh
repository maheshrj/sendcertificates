#!/bin/bash

# Database Backup Script
# Runs daily at 2 AM via cron

# Configuration
BACKUP_DIR="/var/backups/certificate-app"
DB_NAME="certificate"
DB_USER="certuser"
DB_PASSWORD="Sendcertificates@00"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"
RETENTION_DAYS=30

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Log start
echo "========================================" >> /var/log/db-backup.log
echo "Starting backup at $(date)" >> /var/log/db-backup.log

# Create backup
echo "Creating backup..." >> /var/log/db-backup.log
PGPASSWORD=$DB_PASSWORD pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_FILE 2>> /var/log/db-backup.log

# Check if backup was created
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not created!" >> /var/log/db-backup.log
    exit 1
fi

# Compress backup
echo "Compressing backup..." >> /var/log/db-backup.log
gzip $BACKUP_FILE

# Verify compressed file exists
if [ ! -f "${BACKUP_FILE}.gz" ]; then
    echo "ERROR: Compression failed!" >> /var/log/db-backup.log
    exit 1
fi

SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
echo "Backup created: ${BACKUP_FILE}.gz (Size: $SIZE)" >> /var/log/db-backup.log

# Delete old backups (older than 30 days)
echo "Cleaning up old backups..." >> /var/log/db-backup.log
DELETED=$(find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "Deleted $DELETED old backup(s)" >> /var/log/db-backup.log

# List current backups
BACKUP_COUNT=$(ls -1 $BACKUP_DIR/backup_*.sql.gz 2>/dev/null | wc -l)
echo "Total backups: $BACKUP_COUNT" >> /var/log/db-backup.log

echo "Backup completed successfully at $(date)" >> /var/log/db-backup.log
echo "========================================" >> /var/log/db-backup.log

exit 0
