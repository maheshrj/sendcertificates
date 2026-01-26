#!/bin/bash

# Database Restoration Script
# Usage: ./restore-database.sh <backup-file.sql.gz>

if [ -z "$1" ]; then
    echo "Usage: ./restore-database.sh <backup-file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lh /var/backups/certificate-app/backup_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE=$1
DB_NAME="certificate"
DB_USER="certuser"
DB_PASSWORD="Sendcertificates@00"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "========================================="
echo "Database Restoration"
echo "========================================="
echo "Backup file: $BACKUP_FILE"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""
echo "WARNING: This will OVERWRITE the current database!"
echo "All existing data will be LOST!"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restoration cancelled"
    exit 0
fi

echo ""
echo "Starting restoration at $(date)..."

# Stop the application first
echo "Stopping application..."
pm2 stop certificate-app

# Decompress and restore
echo "Restoring database..."
gunzip -c $BACKUP_FILE | PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h localhost $DB_NAME

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"
else
    echo "❌ ERROR: Restoration failed!"
    pm2 start certificate-app
    exit 1
fi

# Restart the application
echo "Restarting application..."
pm2 restart certificate-app

echo ""
echo "Restoration completed at $(date)"
echo "========================================="

exit 0
