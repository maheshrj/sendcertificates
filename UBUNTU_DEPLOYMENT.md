# Ubuntu Server Deployment Guide - Certificate App

**Complete guide to deploy your certificate application on Ubuntu Server**

Works on:
- ✅ Ubuntu 22.04 LTS (Recommended)
- ✅ Ubuntu 20.04 LTS
- ✅ Ubuntu 24.04 LTS
- ✅ Any Ubuntu-based server (Local, AWS EC2, DigitalOcean, Linode, etc.)

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Server Setup](#initial-server-setup)
3. [Install All Services](#install-all-services)
4. [Deploy Application](#deploy-application)
5. [Configure Nginx](#configure-nginx)
6. [Setup SSL Certificate](#setup-ssl-certificate)
7. [Production Optimizations](#production-optimizations)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## ✅ Prerequisites

### **What You Need:**
- Ubuntu server (22.04 LTS recommended)
- Root or sudo access
- At least 2GB RAM (4GB+ recommended)
- 20GB+ disk space
- Internet connection

### **Server Specifications:**

| Tier | RAM | CPU | Disk | Good For |
|------|-----|-----|------|----------|
| **Minimum** | 2GB | 1 core | 20GB | Testing, < 100 certs/day |
| **Recommended** | 4GB | 2 cores | 40GB | Production, < 1000 certs/day |
| **Optimal** | 8GB+ | 4 cores | 80GB+ | High volume, 5000+ certs/day |

---

## 🔐 Step 1: Initial Server Setup

### 1.1 Connect to Your Server

```bash
# Connect via SSH
ssh root@YOUR_SERVER_IP
# Or
ssh ubuntu@YOUR_SERVER_IP
```

### 1.2 Update System

```bash
# Update package lists
sudo apt update

# Upgrade all packages
sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git build-essential software-properties-common
```

### 1.3 Create Non-Root User (if needed)

```bash
# Create new user (if you're logged in as root)
adduser ubuntu

# Add to sudo group
usermod -aG sudo ubuntu

# Switch to new user
su - ubuntu
```

### 1.4 Configure Firewall

```bash
# Install UFW (if not installed)
sudo apt install -y ufw

# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow 22/tcp
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## 🚀 Step 2: Install All Services

### 2.1 Install Node.js 20.x

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### 2.2 Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version

# Setup PM2 startup script
pm2 startup
# Copy and run the command it outputs
```

### 2.3 Install PostgreSQL

```bash
# Install PostgreSQL 14
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

**Configure PostgreSQL:**

```bash
# Switch to postgres user
sudo -i -u postgres

# Create database
createdb certificate

# Create user with password
createuser --interactive --pwprompt
# Enter username: certuser
# Enter password: [choose a strong password]
# Superuser: n
# Create databases: n
# Create roles: n

# Grant privileges
psql -c "GRANT ALL PRIVILEGES ON DATABASE certificate TO certuser;"

# Exit postgres user
exit
```

**Configure PostgreSQL for local access:**

```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Find the line that looks like:
# local   all             all                                     peer

# Add this line ABOVE it:
local   certificate     certuser                                md5

# Save and exit (Ctrl+X, Y, Enter)

# Restart PostgreSQL
sudo systemctl restart postgresql
```

**Test database connection:**

```bash
psql -U certuser -d certificate
# Enter password when prompted
# If successful, you'll see: certificate=>

# Test query
SELECT version();

# Exit
\q
```

**Your DATABASE_URL will be:**
```
postgresql://certuser:YOUR_PASSWORD@localhost:5432/certificate
```

### 2.4 Install Redis

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis for production
sudo nano /etc/redis/redis.conf

# Find and update these settings (use Ctrl+W to search):

# 1. Search for "supervised" and change to:
supervised systemd

# 2. Search for "maxmemory" and add/change to:
maxmemory 2gb
maxmemory-policy allkeys-lru

# 3. For security, search for "requirepass" and uncomment/set (optional):
# requirepass your-strong-redis-password

# Save and exit (Ctrl+X, Y, Enter)

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping
# Should return: PONG

# If you set a password, test with:
# redis-cli -a your-password ping
```

### 2.5 Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx

# Test - should see Nginx welcome page
curl http://localhost
```

### 2.6 Install Certbot (for SSL)

```bash
# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

### 2.7 Install Canvas Dependencies

```bash
# Required for certificate image generation with Canvas
sudo apt install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    pkg-config
```

### 2.8 Install Additional Monitoring Tools

```bash
# Install htop for resource monitoring
sudo apt install -y htop

# Install net-tools for network utilities
sudo apt install -y net-tools
```

---

## 📦 Step 3: Deploy Application

### 3.1 Create Application Directory

```bash
# Create directory
sudo mkdir -p /var/www/certificate-app

# Set ownership to current user
sudo chown -R $USER:$USER /var/www/certificate-app

# Navigate to directory
cd /var/www/certificate-app
```

### 3.2 Upload Application Files

**Method 1: Using Git (Recommended)**

```bash
cd /var/www/certificate-app

# Clone your repository
git clone YOUR_REPOSITORY_URL .

# Example:
# git clone https://github.com/yourusername/certificate-app.git .
```

**Method 2: Upload via SCP (from Windows)**

From your Windows machine (PowerShell):

```powershell
# Navigate to your app directory
cd C:\Users\Mahesh\Downloads\certificate-app-master\certificate-app-master

# Create a zip file (exclude large folders)
# Use 7-Zip or compress manually, excluding:
# - node_modules/
# - .next/
# - .git/

# Upload to Ubuntu server
scp certificate-app.zip ubuntu@YOUR_SERVER_IP:/var/www/certificate-app/

# On Ubuntu server, extract:
cd /var/www/certificate-app
unzip certificate-app.zip
rm certificate-app.zip
```

**Method 3: Using FileZilla (GUI)**

1. Download FileZilla: https://filezilla-project.org/
2. Connect:
   - Host: `sftp://YOUR_SERVER_IP`
   - Username: `ubuntu`
   - Password: [your password]
   - Port: `22`
3. Navigate to `/var/www/certificate-app`
4. Upload all files except `node_modules`, `.next`, `.git`

**Method 4: Using rsync (Fast sync from Windows WSL/Git Bash)**

```bash
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
    /c/Users/Mahesh/Downloads/certificate-app-master/certificate-app-master/ \
    ubuntu@YOUR_SERVER_IP:/var/www/certificate-app/
```

### 3.3 Install Dependencies

```bash
cd /var/www/certificate-app

# Install Node.js dependencies
npm install

# This may take 2-5 minutes
```

### 3.4 Create Production Environment File

```bash
# Create .env.production
nano .env.production
```

**Paste this (update with your actual values):**

```env
# ==========================================
# DATABASE CONFIGURATION
# ==========================================
DATABASE_URL=postgresql://certuser:YOUR_DB_PASSWORD@localhost:5432/certificate

# ==========================================
# JWT & AUTHENTICATION
# ==========================================
JWT_SECRET=08b28e1943b3e8ac4be09f3d2e2785fc0613e3ed527dc67125593bb5b6f46760

# Admin Email
ADMIN_EMAIL=admin@yourdomain.com

# ==========================================
# AWS CREDENTIALS (S3 for certificate storage)
# ==========================================
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET_NAME=generate-certificates
NEXT_PUBLIC_AWS_REGION=ap-south-1

# ==========================================
# APPLICATION URL
# ==========================================
# Update with your domain or server IP
NEXT_PUBLIC_BASE_URL=https://app.sendcertificate.com
# Use your actual domain (this is used for QR codes and email links)

# ==========================================
# REDIS CONFIGURATION
# ==========================================
REDIS_URL=redis://localhost:6379
# If you set Redis password:
# REDIS_URL=redis://:your-redis-password@localhost:6379

# ==========================================
# SMTP CONFIGURATION
# ==========================================
# Gmail example (already configured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=smuthuviknesh2@gmail.com
SMTP_PASS=wlqt hcgd gqex zpxx
SMTP_SECURE=false
EMAIL_FROM=smuthuviknesh2@gmail.com

# Or use Outlook:
# SMTP_HOST=smtp-mail.outlook.com
# SMTP_USER=your-email@outlook.com

# Or use AWS SES (cheapest):
# SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
# SMTP_USER=your-ses-smtp-user
# SMTP_PASS=your-ses-smtp-password

EMAIL_LIMIT=2

# ==========================================
# ENVIRONMENT
# ==========================================
NODE_ENV=production
```

**Save and exit:** `Ctrl+X`, `Y`, `Enter`

**Important:** Replace these values:
- `YOUR_DB_PASSWORD` - PostgreSQL password you created
- `YOUR_SERVER_IP` - Your Ubuntu server's IP address
- Update AWS, SMTP credentials if different

### 3.5 Setup Database

```bash
cd /var/www/certificate-app

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Verify database
npx prisma db execute --stdin <<EOF
SELECT COUNT(*) as user_count FROM "User";
EOF
```

### 3.6 Build Application

```bash
cd /var/www/certificate-app

# Build for production
npm run build

# This takes 2-5 minutes
# You should see: ✓ Compiled successfully
```

### 3.7 Start Application with PM2

```bash
# Start application
pm2 start npm --name "certificate-app" -- start

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Copy and run the command it outputs (starts with sudo)

# Check status
pm2 status

# View logs
pm2 logs certificate-app --lines 50
```

**Your app is now running on port 3000!**

Test it:
```bash
curl http://localhost:3000
```

---

## 🌐 Step 4: Configure Nginx Reverse Proxy

### 4.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/certificate-app
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    listen [::]:80;

    # Replace with your domain or server IP
    server_name YOUR_SERVER_IP;
    # After you have a domain: yourdomain.com www.yourdomain.com

    # Max upload size for certificate templates
    client_max_body_size 50M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/certificate-app-access.log;
    error_log /var/log/nginx/certificate-app-error.log;

    # Proxy to Next.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for long-running operations
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
    }

    # Cache static assets
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=3600, immutable";
    }

    # Cache images
    location ~* \.(jpg|jpeg|png|gif|ico|svg)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Favicon
    location = /favicon.ico {
        proxy_pass http://localhost:3000;
        access_log off;
        log_not_found off;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

**Save and exit:** `Ctrl+X`, `Y`, `Enter`

**Don't forget to replace `YOUR_SERVER_IP` with your actual IP!**

### 4.2 Enable Nginx Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/certificate-app /etc/nginx/sites-enabled/

# Remove default Nginx site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If successful, you'll see:
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Restart Nginx
sudo systemctl restart nginx
```

### 4.3 Access Your Application

Your app is now accessible at:
```
http://YOUR_SERVER_IP
```

**Test in browser or with curl:**
```bash
curl http://YOUR_SERVER_IP
```

---

## 🔒 Step 5: Setup SSL Certificate (Optional but Recommended)

### 5.1 Point Domain to Server

**If you have a domain:**

1. Login to your domain registrar (GoDaddy, Namecheap, etc.)
2. Go to DNS settings
3. Add **A Record**:
   ```
   Type: A
   Name: @ (or leave blank for root)
   Value: YOUR_SERVER_IP
   TTL: 3600
   ```
4. Add **CNAME Record** for www:
   ```
   Type: CNAME
   Name: www
   Value: yourdomain.com
   TTL: 3600
   ```

Wait 5-30 minutes for DNS propagation.

**Verify DNS:**
```bash
nslookup yourdomain.com
# Should return your server IP
```

### 5.2 Update Nginx Configuration with Domain

```bash
sudo nano /etc/nginx/sites-available/certificate-app

# Change server_name line to:
server_name yourdomain.com www.yourdomain.com;

# Save and exit

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 5.3 Install SSL Certificate (Free Let's Encrypt)

```bash
# Install SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts:
# 1. Enter email address for renewal notifications
# 2. Agree to Terms of Service (A)
# 3. Share email with EFF (optional - Y or N)
# 4. Choose option 2: Redirect HTTP to HTTPS

# Certbot will automatically:
# - Obtain SSL certificate
# - Configure Nginx to use HTTPS
# - Setup auto-renewal
```

**Test auto-renewal:**
```bash
sudo certbot renew --dry-run
```

### 5.4 Update Environment Variable

```bash
nano /var/www/certificate-app/.env.production

# Change NEXT_PUBLIC_BASE_URL to:
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Save and exit

# Rebuild and restart
cd /var/www/certificate-app
npm run build
pm2 restart certificate-app
```

**Your app is now live at:** https://yourdomain.com 🎉

---

## ⚡ Step 6: Production Optimizations

### 6.1 Optimize PostgreSQL

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/14/main/postgresql.conf
```

**For 4GB RAM server, update these settings:**

```conf
# Memory Configuration
shared_buffers = 1GB                    # 25% of RAM
effective_cache_size = 3GB              # 75% of RAM
maintenance_work_mem = 256MB
work_mem = 8MB

# Query Planner
random_page_cost = 1.1                  # For SSD
effective_io_concurrency = 200

# Write Ahead Log
wal_buffers = 16MB
checkpoint_completion_target = 0.9
min_wal_size = 1GB
max_wal_size = 4GB

# Parallel Query
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4
```

**Save and restart:**
```bash
sudo systemctl restart postgresql
```

### 6.2 Configure Log Rotation for PM2

```bash
# Install PM2 log rotate module
pm2 install pm2-logrotate

# Configure rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 6.3 Setup Swap (for memory-intensive operations)

```bash
# Check if swap exists
free -h

# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Optimize swap usage (use swap less aggressively)
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

# Verify
free -h
```

### 6.4 Setup Automated Backups

**Database Backup Script:**

```bash
# Create backup directory
mkdir -p ~/backups/database

# Create backup script
nano ~/backup-database.sh
```

**Paste:**

```bash
#!/bin/bash
BACKUP_DIR="$HOME/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
PGPASSWORD=YOUR_DB_PASSWORD pg_dump -U certuser -h localhost certificate | gzip > $BACKUP_DIR/certificate_$DATE.sql.gz

# Keep only last 7 backups
ls -t $BACKUP_DIR/certificate_*.sql.gz | tail -n +8 | xargs rm -f

echo "Database backup completed: certificate_$DATE.sql.gz"
```

**Make executable and schedule:**

```bash
chmod +x ~/backup-database.sh

# Test it
./backup-database.sh

# Schedule with cron (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /home/ubuntu/backup-database.sh
```

**Application Backup Script:**

```bash
nano ~/backup-app.sh
```

**Paste:**

```bash
#!/bin/bash
BACKUP_DIR="$HOME/backups/app"
APP_DIR="/var/www/certificate-app"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup app files (exclude node_modules and .next)
tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='.next' \
    $APP_DIR

# Keep only last 7 backups
ls -t $BACKUP_DIR/app_*.tar.gz | tail -n +8 | xargs rm -f

echo "App backup completed: app_$DATE.tar.gz"
```

**Make executable and schedule:**

```bash
chmod +x ~/backup-app.sh

# Edit crontab
crontab -e

# Add (daily at 3 AM):
0 3 * * * /home/ubuntu/backup-app.sh
```

### 6.5 Setup System Update Script

```bash
nano ~/update-system.sh
```

**Paste:**

```bash
#!/bin/bash
echo "Updating system packages..."
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y
echo "System updated successfully!"
```

**Schedule:**

```bash
chmod +x ~/update-system.sh
crontab -e

# Add (weekly on Sunday at 4 AM):
0 4 * * 0 /home/ubuntu/update-system.sh
```

---

## 📊 Step 7: Monitoring & Maintenance

### 7.1 Useful Commands

**PM2 Management:**
```bash
pm2 status                      # View app status
pm2 restart certificate-app     # Restart app
pm2 stop certificate-app        # Stop app
pm2 logs certificate-app        # View logs (live)
pm2 logs certificate-app --lines 100  # View last 100 lines
pm2 monit                       # Resource monitor
pm2 flush                       # Clear logs
```

**PostgreSQL:**
```bash
# Connect to database
psql -U certuser -d certificate

# Inside psql:
\dt              # List tables
\l               # List databases
\du              # List users
\q               # Exit

# Backup manually
pg_dump -U certuser -h localhost certificate > backup.sql

# Restore
psql -U certuser -h localhost certificate < backup.sql
```

**Redis:**
```bash
# Connect to Redis
redis-cli

# Inside redis-cli:
ping             # Test connection (returns PONG)
info memory      # Memory usage
dbsize           # Number of keys
keys *           # List all keys (use carefully in production)
flushall         # Clear all data (CAREFUL!)
```

**Nginx:**
```bash
sudo nginx -t                           # Test configuration
sudo systemctl restart nginx            # Restart
sudo systemctl status nginx             # Check status
sudo tail -f /var/log/nginx/error.log  # View error logs
sudo tail -f /var/log/nginx/access.log # View access logs
```

**System Resources:**
```bash
htop                  # Interactive process viewer
free -h               # Memory usage
df -h                 # Disk usage
du -sh /var/www/*     # Directory sizes
top                   # CPU and memory usage
```

### 7.2 Update Application

**When deploying updates:**

```bash
cd /var/www/certificate-app

# Pull latest code (if using Git)
git pull origin main

# Or upload new files via SCP/SFTP

# Install new dependencies
npm install

# Run new migrations
npx prisma generate
npx prisma migrate deploy

# Rebuild
npm run build

# Restart
pm2 restart certificate-app

# Check logs
pm2 logs certificate-app --lines 100
```

### 7.3 Check Application Health

```bash
# Check if app is responding
curl http://localhost:3000

# Check health endpoint
curl http://YOUR_SERVER_IP/health

# Check PM2 status
pm2 status

# Check logs for errors
pm2 logs certificate-app --err --lines 50
```

---

## 🆘 Troubleshooting

### Issue: App won't start

```bash
# Check PM2 logs
pm2 logs certificate-app

# Check if port 3000 is in use
sudo lsof -i :3000

# Check environment variables
cat /var/www/certificate-app/.env.production

# Restart with fresh logs
pm2 delete certificate-app
pm2 start npm --name "certificate-app" -- start
pm2 logs certificate-app
```

### Issue: Database connection failed

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U certuser -d certificate

# Check DATABASE_URL in .env.production
grep DATABASE_URL /var/www/certificate-app/.env.production

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Issue: Redis connection error

```bash
# Check if Redis is running
sudo systemctl status redis-server

# Test connection
redis-cli ping

# Restart Redis
sudo systemctl restart redis-server

# Check logs
sudo tail -f /var/log/redis/redis-server.log
```

### Issue: Nginx errors

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Issue: SSL certificate renewal failed

```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal

# Check auto-renewal
sudo certbot renew --dry-run
```

---

## 🔐 Security Best Practices

### 1. Disable Root Login

```bash
sudo nano /etc/ssh/sshd_config

# Set:
PermitRootLogin no
PasswordAuthentication no  # Use SSH keys only

# Restart SSH
sudo systemctl restart sshd
```

### 2. Setup Fail2Ban

```bash
sudo apt install -y fail2ban

# Start and enable
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status sshd
```

### 3. Keep System Updated

```bash
# Enable automatic security updates
sudo apt install -y unattended-upgrades

# Configure
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 📚 Quick Reference

### Essential Commands

```bash
# Application
pm2 status
pm2 restart certificate-app
pm2 logs certificate-app

# Services
sudo systemctl status postgresql
sudo systemctl status redis-server
sudo systemctl status nginx

# Monitoring
htop
df -h
free -h

# Logs
pm2 logs certificate-app
sudo tail -f /var/log/nginx/error.log
```

### Important Files

```
App Directory: /var/www/certificate-app
Environment: /var/www/certificate-app/.env.production
Nginx Config: /etc/nginx/sites-available/certificate-app
Nginx Logs: /var/log/nginx/
PostgreSQL Config: /etc/postgresql/14/main/postgresql.conf
Redis Config: /etc/redis/redis.conf
```

---

## ✅ Deployment Checklist

- [ ] Server has Ubuntu 22.04 LTS
- [ ] System updated and firewall configured
- [ ] Node.js 20.x installed
- [ ] PM2 installed and configured
- [ ] PostgreSQL installed and database created
- [ ] Redis installed and running
- [ ] Nginx installed
- [ ] Application files uploaded
- [ ] .env.production created with correct values
- [ ] Dependencies installed (`npm install`)
- [ ] Database migrations run
- [ ] Application built (`npm run build`)
- [ ] PM2 started and saved
- [ ] Nginx reverse proxy configured
- [ ] Firewall ports opened (80, 443)
- [ ] Domain pointed to server (if applicable)
- [ ] SSL certificate installed
- [ ] Automated backups configured
- [ ] Application tested and working

---

## 🎉 Congratulations!

Your certificate application is now running on Ubuntu!

**Access:** http://YOUR_SERVER_IP (or https://yourdomain.com)

**Next Steps:**
1. Test certificate generation
2. Monitor logs and performance
3. Setup monitoring alerts
4. Configure automated backups

**Need help?** Check the troubleshooting section or review logs with `pm2 logs certificate-app`.
