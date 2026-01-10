# Hostinger KVM VPS Deployment Guide - Certificate App

**Complete guide to deploy your certificate application on Hostinger KVM VPS**

**Recommended Plan:** KVM 4 - ₹749/month
- 4 vCPU cores
- 16 GB RAM
- 200 GB NVMe SSD
- 16 TB bandwidth

**Total Monthly Cost:** ₹749 (~$9/month) - **3x cheaper than AWS Lightsail!**

---

## 📋 Table of Contents

1. [Why Hostinger?](#why-hostinger)
2. [Purchase & Setup VPS](#purchase--setup-vps)
3. [Initial Server Setup](#initial-server-setup)
4. [Install All Services](#install-all-services)
5. [Deploy Application](#deploy-application)
6. [Configure Domain & SSL](#configure-domain--ssl)
7. [Production Optimizations](#production-optimizations)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🎯 Why Hostinger?

### **Cost Comparison:**

| Component | Hostinger KVM 4 | AWS Lightsail |
|-----------|-----------------|---------------|
| Server | ₹749/mo (16GB RAM) | ₹1,000/mo (2GB RAM) |
| Database | Included | ₹1,250/mo extra |
| Redis | Included | Included |
| **Total** | **₹749/mo** | **₹2,250/mo** |
| **Savings** | - | **Save ₹1,501/mo!** |

### **Advantages:**
- ✅ **3x cheaper** than AWS Lightsail
- ✅ **5x more RAM** (16GB vs 3GB)
- ✅ **2x more CPU** (4 cores vs 2)
- ✅ **Simpler setup** - Everything on one server
- ✅ **NVMe SSD** - Faster disk performance
- ✅ **Indian support** - Local customer service
- ✅ **Rupee pricing** - No exchange rate fluctuations

### **Perfect for:**
- 📊 Certificate generation app (handles 1000s of certs/day)
- 📧 Bulk email sending
- 🎨 Image processing with Canvas
- 💾 PostgreSQL database
- 🔄 Redis job queues

---

## 🛒 Step 1: Purchase & Setup VPS

### 1.1 Order Hostinger KVM VPS

1. Visit: https://www.hostinger.in/vps-hosting
2. Select **KVM 4** plan (₹749/mo)
3. Choose billing period:
   - Monthly: ₹2,599/mo
   - 12 months: ₹1,999/mo
   - **24 months: ₹749/mo** ⭐ **Best deal**
4. Complete checkout

### 1.2 Initial VPS Setup

After purchase:

1. Check email for **VPS credentials**:
   - IP Address
   - Root password
   - SSH access details

2. Login to **hPanel** (Hostinger control panel)

3. Go to **VPS** → Your VPS

4. **Choose Operating System:**
   - Select: **Ubuntu 22.04 LTS** (64-bit)
   - Click **Change OS**
   - Confirm (this will reinstall the OS)
   - Wait 5-10 minutes

5. **Set Root Password:**
   - Go to **Server** tab
   - Click **Root Password**
   - Set a strong password
   - Save it securely!

### 1.3 Get Server Details

From hPanel, note down:
```
IP Address: xxx.xxx.xxx.xxx
Root Username: root
Root Password: [Your password]
SSH Port: 22 (default)
```

---

## 🔐 Step 2: Initial Server Setup

### 2.1 Connect via SSH

**Windows (PowerShell or CMD):**
```bash
ssh root@YOUR_VPS_IP
# Enter password when prompted
```

**Or use PuTTY:**
1. Download PuTTY: https://www.putty.org/
2. Host: `YOUR_VPS_IP`
3. Port: `22`
4. Click **Open**
5. Login as: `root`
6. Password: [Your root password]

### 2.2 Create Non-Root User (Security Best Practice)

```bash
# Create new user
adduser ubuntu
# Set password and fill details

# Add to sudo group
usermod -aG sudo ubuntu

# Allow passwordless sudo (optional)
echo "ubuntu ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/ubuntu

# Switch to new user
su - ubuntu
```

From now on, use the `ubuntu` user instead of root.

### 2.3 Update System

```bash
# Update package lists
sudo apt update

# Upgrade all packages
sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git build-essential software-properties-common
```

---

## 🚀 Step 3: Install All Services

### 3.1 Install Node.js 20.x

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x
npm --version
```

### 3.2 Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### 3.3 Install PostgreSQL

```bash
# Install PostgreSQL 14
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify it's running
sudo systemctl status postgresql
```

**Configure PostgreSQL:**

```bash
# Switch to postgres user
sudo -i -u postgres

# Create database
createdb certificate

# Create user (use a strong password!)
createuser --interactive --pwprompt
# Enter name: certuser
# Enter password: [strong password]
# Superuser: n
# Create databases: n
# Create roles: n

# Grant privileges
psql -c "GRANT ALL PRIVILEGES ON DATABASE certificate TO certuser;"

# Exit postgres user
exit
```

**Get Database URL:**
```
postgresql://certuser:YOUR_PASSWORD@localhost:5432/certificate
```

**Configure PostgreSQL for remote access (if needed later):**

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Find and change:
listen_addresses = 'localhost'  # Keep as localhost for security

# Edit pg_hba.conf for local access
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add this line under "# IPv4 local connections:"
host    certificate    certuser    127.0.0.1/32    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 3.4 Install Redis

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis for production
sudo nano /etc/redis/redis.conf

# Update these settings:
# Find and change:
supervised systemd
maxmemory 2gb
maxmemory-policy allkeys-lru

# Save and exit (Ctrl+X, Y, Enter)

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping  # Should return "PONG"
```

### 3.5 Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Test
curl http://localhost  # Should return Nginx welcome page
```

### 3.6 Install Certbot (for SSL)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 3.7 Install Canvas Dependencies

```bash
# Required for certificate image generation
sudo apt install -y build-essential libcairo2-dev libpango1.0-dev \
    libjpeg-dev libgif-dev librsvg2-dev
```

### 3.8 Configure Firewall (UFW)

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## 📦 Step 4: Deploy Application

### 4.1 Create Application Directory

```bash
# Create directory
sudo mkdir -p /var/www/certificate-app

# Set ownership
sudo chown -R ubuntu:ubuntu /var/www/certificate-app

# Navigate to directory
cd /var/www/certificate-app
```

### 4.2 Upload Application Files

**Method 1: Using Git (Recommended)**

```bash
cd /var/www/certificate-app

# Clone your repository
git clone YOUR_REPOSITORY_URL .

# Or if you don't have a repo, use Method 2
```

**Method 2: Upload via SCP/SFTP**

From your Windows machine:

```bash
# Create zip file (exclude node_modules, .next)
# In PowerShell:
cd C:\Users\Mahesh\Downloads\certificate-app-master\certificate-app-master

# Use 7-Zip or compress manually, excluding:
# - node_modules/
# - .next/
# - .git/

# Upload to server
scp certificate-app.zip ubuntu@YOUR_VPS_IP:/var/www/certificate-app/

# On server, extract:
cd /var/www/certificate-app
unzip certificate-app.zip
rm certificate-app.zip
```

**Method 3: Using FileZilla (GUI)**

1. Download FileZilla: https://filezilla-project.org/
2. Connect with:
   - Host: `sftp://YOUR_VPS_IP`
   - Username: `ubuntu`
   - Password: [ubuntu user password]
   - Port: `22`
3. Upload files to `/var/www/certificate-app`

### 4.3 Install Dependencies

```bash
cd /var/www/certificate-app

# Install Node.js dependencies
npm install
```

### 4.4 Create Production Environment File

```bash
# Create .env.production
nano .env.production
```

Paste this (update with your actual values):

```env
# Database Configuration
DATABASE_URL=postgresql://certuser:YOUR_DB_PASSWORD@localhost:5432/certificate

# JWT Secret
JWT_SECRET=08b28e1943b3e8ac4be09f3d2e2785fc0613e3ed527dc67125593bb5b6f46760

# Admin Email
ADMIN_EMAIL=admin@yourdomain.com

# AWS Credentials (S3 for certificate storage)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET_NAME=generate-certificates
NEXT_PUBLIC_AWS_REGION=ap-south-1

# Application URL (update with your domain or IP)
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Redis (local)
REDIS_URL=redis://localhost:6379

# SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=smuthuviknesh2@gmail.com
SMTP_PASS=wlqt hcgd gqex zpxx
SMTP_SECURE=false
EMAIL_FROM=smuthuviknesh2@gmail.com
EMAIL_LIMIT=2

# Environment
NODE_ENV=production
```

Save and exit: `Ctrl+X`, `Y`, `Enter`

### 4.5 Run Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Verify database
npx prisma db execute --stdin <<EOF
SELECT COUNT(*) FROM "User";
EOF
```

### 4.6 Build Application

```bash
# Build for production
npm run build

# This takes 2-3 minutes
```

### 4.7 Start with PM2

```bash
# Start application
pm2 start npm --name "certificate-app" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command it outputs

# Check status
pm2 status

# View logs
pm2 logs certificate-app --lines 50
```

---

## 🌐 Step 5: Configure Nginx Reverse Proxy

### 5.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/certificate-app
```

Paste this configuration:

```nginx
server {
    listen 80;
    listen [::]:80;

    # Replace with your domain or VPS IP
    server_name yourdomain.com www.yourdomain.com;

    # Max upload size (for certificate templates)
    client_max_body_size 50M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/certificate-app-access.log;
    error_log /var/log/nginx/certificate-app-error.log;

    # Proxy to Next.js
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

        # Timeouts for long operations
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
    }

    # Cache static files
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=3600, immutable";
    }
}
```

Save and exit.

### 5.2 Enable Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/certificate-app /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 5.3 Access Your Application

Your app should now be accessible at:
```
http://YOUR_VPS_IP
```

Test it in your browser!

---

## 🔒 Step 6: Configure Domain & SSL

### 6.1 Point Domain to Hostinger VPS

**Option A: Using Hostinger Nameservers (Recommended)**

If your domain is registered with Hostinger:

1. In hPanel, go to **Domains**
2. Click your domain → **DNS/Nameservers**
3. Add **A Record**:
   ```
   Type: A
   Name: @ (for root domain)
   Value: YOUR_VPS_IP
   TTL: 14400
   ```
4. Add **CNAME Record**:
   ```
   Type: CNAME
   Name: www
   Value: yourdomain.com
   TTL: 14400
   ```

**Option B: External Domain Registrar**

If your domain is with another registrar (GoDaddy, Namecheap, etc.):

1. Login to your domain registrar
2. Go to DNS settings
3. Add **A Record**:
   ```
   Type: A
   Host: @ (or leave blank)
   Points to: YOUR_VPS_IP
   TTL: 3600
   ```
4. Add **CNAME Record**:
   ```
   Type: CNAME
   Host: www
   Points to: yourdomain.com
   TTL: 3600
   ```

Wait 5-30 minutes for DNS propagation.

**Verify DNS:**
```bash
# Check if domain points to your IP
nslookup yourdomain.com
dig yourdomain.com
```

### 6.2 Install SSL Certificate (Free Let's Encrypt)

```bash
# Update Nginx config with your domain
sudo nano /etc/nginx/sites-available/certificate-app

# Change server_name line to:
server_name yourdomain.com www.yourdomain.com;

# Save and exit

# Test Nginx
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Install SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# 1. Enter email address
# 2. Agree to Terms of Service
# 3. Choose option 2: Redirect HTTP to HTTPS

# Verify auto-renewal works
sudo certbot renew --dry-run
```

### 6.3 Update Application URL

```bash
# Edit environment file
nano /var/www/certificate-app/.env.production

# Update this line:
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Save and exit

# Rebuild and restart
cd /var/www/certificate-app
npm run build
pm2 restart certificate-app
```

**Your app is now live at:** https://yourdomain.com 🎉

---

## ⚡ Step 7: Production Optimizations

### 7.1 Optimize PostgreSQL

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/14/main/postgresql.conf

# Update these settings for 16GB RAM:
shared_buffers = 4GB                    # 25% of RAM
effective_cache_size = 12GB              # 75% of RAM
maintenance_work_mem = 1GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1                   # For NVMe SSD
effective_io_concurrency = 200
work_mem = 16MB
min_wal_size = 2GB
max_wal_size = 8GB
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4

# Save and restart
sudo systemctl restart postgresql
```

### 7.2 Optimize Redis

```bash
# Already configured in Step 3.4
# Verify settings:
redis-cli config get maxmemory
redis-cli config get maxmemory-policy
```

### 7.3 Configure Log Rotation

```bash
# Install PM2 log rotate
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 7.4 Setup Swap (for memory-intensive operations)

```bash
# Create 4GB swap file
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Optimize swap usage
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

### 7.5 Setup Automated Backups

**Database Backups:**

```bash
# Create backup script
nano ~/backup-database.sh
```

Paste:

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U certuser -h localhost certificate | gzip > $BACKUP_DIR/certificate_$DATE.sql.gz

# Keep only last 7 backups
ls -t $BACKUP_DIR/certificate_*.sql.gz | tail -n +8 | xargs rm -f

echo "Database backup completed: certificate_$DATE.sql.gz"
```

Make executable and schedule:

```bash
chmod +x ~/backup-database.sh

# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /home/ubuntu/backup-database.sh
```

**Application Backups:**

```bash
# Create backup script
nano ~/backup-app.sh
```

Paste:

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups/app"
APP_DIR="/var/www/certificate-app"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup app files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='.next' \
    $APP_DIR

# Keep only last 7 backups
ls -t $BACKUP_DIR/app_*.tar.gz | tail -n +8 | xargs rm -f

echo "App backup completed: app_$DATE.tar.gz"
```

Make executable and schedule:

```bash
chmod +x ~/backup-app.sh

# Edit crontab
crontab -e

# Add this line (daily at 3 AM):
0 3 * * * /home/ubuntu/backup-app.sh
```

---

## 📊 Step 8: Monitoring & Maintenance

### 8.1 Install Monitoring Tools

```bash
# Install htop for resource monitoring
sudo apt install -y htop

# Install netdata (optional - web-based monitoring)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Access Netdata at: http://YOUR_VPS_IP:19999
```

### 8.2 Useful Commands

**PM2 Management:**
```bash
pm2 status                    # View app status
pm2 restart certificate-app   # Restart app
pm2 stop certificate-app      # Stop app
pm2 logs certificate-app      # View logs
pm2 monit                     # Resource monitor
pm2 flush                     # Clear logs
```

**PostgreSQL:**
```bash
# Connect to database
psql -U certuser -d certificate

# Inside psql:
\dt              # List tables
\l               # List databases
\du              # List users
SELECT COUNT(*) FROM "User";  # Query
\q               # Exit
```

**Redis:**
```bash
# Connect to Redis
redis-cli

# Inside redis-cli:
ping             # Test connection
info memory      # Memory usage
dbsize           # Number of keys
keys *           # List all keys (use carefully)
flushall         # Clear all data (careful!)
```

**Nginx:**
```bash
sudo nginx -t                         # Test config
sudo systemctl restart nginx          # Restart
sudo tail -f /var/log/nginx/error.log # Error logs
sudo tail -f /var/log/nginx/access.log # Access logs
```

**System Resources:**
```bash
htop                  # Interactive process viewer
free -h               # Memory usage
df -h                 # Disk usage
du -sh /var/www/*     # Directory sizes
```

### 8.3 Update Application

When deploying updates:

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

---

## 💰 Cost Analysis

### **Hostinger KVM 4:**
```
Monthly: ₹749
Yearly: ₹8,988
2-Year Plan: ₹17,976 (best value)
```

### **What's Included:**
- ✅ 4 vCPU cores
- ✅ 16 GB RAM
- ✅ 200 GB NVMe SSD
- ✅ 16 TB bandwidth
- ✅ 1 dedicated IP
- ✅ Root access
- ✅ DDoS protection
- ✅ 24/7 support

### **Additional Costs:**
- S3 Storage: ~₹80/month (minimal)
- Domain: ~₹800/year (optional)
- SSL: Free (Let's Encrypt)

**Total: ~₹830/month** (vs ₹2,250/month on AWS!)

---

## 🔐 Security Best Practices

### 1. Disable Root Login

```bash
sudo nano /etc/ssh/sshd_config

# Set:
PermitRootLogin no
PasswordAuthentication no  # Use SSH keys

# Restart SSH
sudo systemctl restart sshd
```

### 2. Setup Fail2Ban

```bash
sudo apt install -y fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 3. Regular Updates

```bash
# Create update script
nano ~/update-system.sh
```

Paste:

```bash
#!/bin/bash
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y
npm update -g
echo "System updated!"
```

Make executable and schedule:

```bash
chmod +x ~/update-system.sh
crontab -e

# Add (weekly on Sunday at 4 AM):
0 4 * * 0 /home/ubuntu/update-system.sh
```

---

## 🆘 Troubleshooting

### PostgreSQL connection issues:
```bash
# Check if running
sudo systemctl status postgresql

# Check logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Test connection
psql -U certuser -d certificate
```

### Redis connection issues:
```bash
# Check status
sudo systemctl status redis-server

# Test
redis-cli ping

# Restart
sudo systemctl restart redis-server
```

### Application not starting:
```bash
# Check PM2 logs
pm2 logs certificate-app

# Check port 3000
sudo lsof -i :3000

# Restart
pm2 restart certificate-app
```

### Nginx errors:
```bash
# Check config
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log

# Restart
sudo systemctl restart nginx
```

---

## 📚 Additional Resources

- **Hostinger Support:** https://www.hostinger.in/tutorials/
- **hPanel Guide:** Available in your account
- **PM2 Docs:** https://pm2.keymetrics.io/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Nginx Docs:** https://nginx.org/en/docs/

---

## 🎉 Deployment Complete!

Your certificate application is now running on Hostinger VPS with:
- ✅ 16GB RAM (plenty for bulk certificate generation)
- ✅ PostgreSQL database
- ✅ Redis job queue
- ✅ SSL certificate
- ✅ Automated backups
- ✅ Production optimizations

**At just ₹749/month - that's amazing value!** 🚀

**Access:** https://yourdomain.com
