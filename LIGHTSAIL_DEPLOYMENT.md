# AWS Lightsail Deployment Guide - Certificate App

**Complete guide to deploy your certificate application on AWS Lightsail**

**Estimated Monthly Cost:** ~$27/month
- Lightsail Instance (2GB RAM): $12/month
- Lightsail Database (PostgreSQL, 1GB RAM): $15/month
- S3 Storage: Already configured (minimal cost)

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Create Lightsail Instance](#create-lightsail-instance)
3. [Create Lightsail Database](#create-lightsail-database)
4. [Setup Application](#setup-application)
5. [Configure Domain & SSL](#configure-domain--ssl)
6. [Production Optimizations](#production-optimizations)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🔧 Prerequisites

- ✅ AWS Account
- ✅ Domain name (optional but recommended)
- ✅ Your application code ready
- ✅ AWS credentials (S3, already configured)

---

## 🖥️ Step 1: Create Lightsail Instance

### 1.1 Access Lightsail Console

1. Login to AWS Console
2. Search for **"Lightsail"** in the top search bar
3. Click on **"Amazon Lightsail"**
4. OR visit: https://lightsail.aws.amazon.com/

### 1.2 Create Instance

1. Click **"Create instance"** button

2. **Select Instance Location:**
   ```
   Region: Asia Pacific (Mumbai) - ap-south-1
   Availability Zone: ap-south-1a
   ```

3. **Select Platform:**
   ```
   Platform: Linux/Unix
   Blueprint: OS Only → Ubuntu 22.04 LTS
   ```

4. **Optional: Add Launch Script** (Skip for now, we'll do manual setup)

5. **Choose Instance Plan:**
   ```
   Plan: $12 USD/month
   - 2 GB Memory
   - 1 Core processor
   - 60 GB SSD Disk
   - 3 TB Transfer
   ```

6. **Name Your Instance:**
   ```
   Instance name: certificate-app-production
   ```

7. Click **"Create instance"**

8. **Wait 2-3 minutes** for instance to be in "Running" state

---

## 🗄️ Step 2: Create Lightsail Database

### 2.1 Create Managed Database

1. In Lightsail console, click **"Databases"** tab
2. Click **"Create database"** button

3. **Select Database Location:**
   ```
   Region: Asia Pacific (Mumbai) - ap-south-1
   Availability Zone: ap-south-1a (same as instance)
   ```

4. **Choose Database Engine:**
   ```
   Database engine: PostgreSQL
   Version: PostgreSQL 14 or later
   ```

5. **Choose Database Plan:**
   ```
   Plan: $15 USD/month
   - Standard
   - 1 GB RAM
   - 1 vCPU
   - 40 GB SSD Storage
   ```

6. **Database Name & Credentials:**
   ```
   Master database name: certificate
   Master username: postgres
   Master password: [Auto-generate or set your own]

   ⚠️ IMPORTANT: Save the password securely!
   ```

7. **Name Your Database:**
   ```
   Database name: certificate-db-production
   ```

8. Click **"Create database"**

9. **Wait 10-15 minutes** for database to be ready

### 2.2 Get Database Connection String

Once database is "Available":

1. Click on your database: **certificate-db-production**
2. Go to **"Connect"** tab
3. Copy the **"Endpoint"** (hostname)
4. Note the **"Port"** (usually 5432)

**Your DATABASE_URL will be:**
```
postgresql://postgres:YOUR_PASSWORD@your-db-endpoint.region.rds.amazonaws.com:5432/certificate
```

---

## 🚀 Step 3: Setup Application on Lightsail

### 3.1 Connect to Your Instance

**Option A: Use Browser-based SSH (Easiest)**

1. In Lightsail console, click your instance
2. Click **"Connect using SSH"** button
3. A terminal will open in your browser

**Option B: Use SSH Client**

1. Download SSH key from Lightsail
2. Connect with:
   ```bash
   ssh -i /path/to/key.pem ubuntu@YOUR_INSTANCE_IP
   ```

### 3.2 Initial Server Setup

Once connected via SSH, run these commands:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x
npm --version

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Redis
sudo apt install -y redis-server

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping  # Should return "PONG"

# Install Nginx (Web Server)
sudo apt install -y nginx

# Install certbot for SSL (if using domain)
sudo apt install -y certbot python3-certbot-nginx

# Install Git
sudo apt install -y git
```

### 3.3 Clone Your Application

```bash
# Create app directory
sudo mkdir -p /var/www/certificate-app
sudo chown -R ubuntu:ubuntu /var/www/certificate-app

# Navigate to directory
cd /var/www/certificate-app

# Clone your repository (or upload files)
# Option 1: If using Git
git clone YOUR_REPOSITORY_URL .

# Option 2: Upload files manually
# Use SFTP or SCP to upload your application files
```

### 3.4 Upload Application Files (If Not Using Git)

**From your local machine:**

```bash
# Navigate to your app directory on Windows
cd c:\Users\Mahesh\Downloads\certificate-app-master\certificate-app-master

# Create a zip file (exclude node_modules and .next)
# You can use 7-Zip or Windows built-in compression

# Upload to Lightsail (replace with your instance IP)
scp -i /path/to/key.pem app.zip ubuntu@YOUR_INSTANCE_IP:/var/www/certificate-app/

# Then on Lightsail instance:
cd /var/www/certificate-app
unzip app.zip
rm app.zip
```

### 3.5 Install Dependencies

```bash
cd /var/www/certificate-app

# Install Node.js dependencies
npm install

# Install canvas dependencies (required for certificate generation)
sudo apt install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

### 3.6 Create Production Environment File

```bash
# Create .env.production file
nano .env.production
```

Paste this content (update with your actual values):

```env
# Database Configuration (from Lightsail Database)
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@your-db-endpoint.region.rds.amazonaws.com:5432/certificate

# JWT Secret (use the one you generated)
JWT_SECRET=08b28e1943b3e8ac4be09f3d2e2785fc0613e3ed527dc67125593bb5b6f46760

# Admin Email
ADMIN_EMAIL=admin@yourdomain.com

# AWS Credentials (already configured)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET_NAME=generate-certificates
NEXT_PUBLIC_AWS_REGION=ap-south-1

# Application URL (update with your domain or Lightsail IP)
NEXT_PUBLIC_BASE_URL=https://app.sendcertificate.com

# Redis Configuration (local on same instance)
REDIS_URL=redis://localhost:6379

# SMTP Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=smuthuviknesh2@gmail.com
SMTP_PASS=wlqt hcgd gqex zpxx
SMTP_SECURE=false
EMAIL_FROM=smuthuviknesh2@gmail.com
EMAIL_LIMIT=10

# Environment
NODE_ENV=production
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

### 3.7 Run Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Verify database connection
npx prisma db execute --stdin <<EOF
SELECT COUNT(*) FROM "User";
EOF
```

### 3.8 Build Application

```bash
# Build Next.js application
npm run build

# This will:
# - Generate Prisma client
# - Build Next.js for production
# - Optimize assets
```

### 3.9 Start Application with PM2

```bash
# Start app with PM2
pm2 start npm --name "certificate-app" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Copy and run the command it outputs

# Check app status
pm2 status

# View logs
pm2 logs certificate-app

# Monitor resources
pm2 monit
```

---

## 🌐 Step 4: Configure Nginx Reverse Proxy

### 4.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/certificate-app
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS (will be configured with SSL)
    # For now, proxy to Next.js

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeout for long certificate generation
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Increase max body size for file uploads
    client_max_body_size 50M;
}
```

Save and exit.

### 4.2 Enable Nginx Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/certificate-app /etc/nginx/sites-enabled/

# Remove default Nginx site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 4.3 Configure Lightsail Firewall

1. In Lightsail console, go to your instance
2. Click **"Networking"** tab
3. Under **"Firewall"**, add these rules:

```
Application: Custom
Protocol: TCP
Port: 80 (HTTP)

Application: Custom
Protocol: TCP
Port: 443 (HTTPS)
```

4. Click **"Create"** for each rule

### 4.4 Access Your Application

Your app should now be accessible at:
```
http://YOUR_LIGHTSAIL_INSTANCE_IP
```

Get your instance IP from Lightsail console → Your Instance → Public IP

---

## 🔒 Step 5: Configure Domain & SSL (Optional but Recommended)

### 5.1 Point Domain to Lightsail

1. Get your Lightsail instance **Static IP**:
   - In Lightsail console, click your instance
   - Go to **"Networking"** tab
   - Click **"Create static IP"**
   - Attach to your instance

2. Configure DNS:
   - Go to your domain registrar (GoDaddy, Namecheap, etc.)
   - Add an **A Record**:
     ```
     Type: A
     Name: @ (or leave blank for root domain)
     Value: YOUR_LIGHTSAIL_STATIC_IP
     TTL: 3600
     ```
   - Add **CNAME** for www:
     ```
     Type: CNAME
     Name: www
     Value: yourdomain.com
     TTL: 3600
     ```

3. Wait 5-30 minutes for DNS propagation

### 5.2 Install SSL Certificate (Free with Let's Encrypt)

```bash
# Update Nginx config with your domain
sudo nano /etc/nginx/sites-available/certificate-app

# Update server_name line:
server_name yourdomain.com www.yourdomain.com;

# Save and exit

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Install SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts:
# - Enter email address
# - Agree to Terms of Service
# - Choose option 2: Redirect HTTP to HTTPS

# Verify SSL auto-renewal
sudo certbot renew --dry-run
```

### 5.3 Update Environment Variable

```bash
nano /var/www/certificate-app/.env.production

# Update this line:
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Save and exit

# Rebuild and restart
cd /var/www/certificate-app
npm run build
pm2 restart certificate-app
```

Your app is now live at: **https://yourdomain.com** 🎉

---

## ⚡ Step 6: Production Optimizations

### 6.1 Configure Redis for Production

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Find and update these settings:
maxmemory 256mb
maxmemory-policy allkeys-lru

# Save and exit

# Restart Redis
sudo systemctl restart redis-server
```

### 6.2 Setup Log Rotation for PM2

```bash
# Install PM2 log rotate module
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 6.3 Setup Automated Backups

**Database Backups:**

1. In Lightsail console, go to your database
2. Click **"Snapshots"** tab
3. Enable **"Automatic snapshots"**
4. Set schedule (e.g., daily at 2 AM)

**Application Backups:**

```bash
# Create backup script
nano ~/backup-app.sh
```

Paste:

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
APP_DIR="/var/www/certificate-app"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='.next' \
    $APP_DIR

# Keep only last 7 backups
ls -t $BACKUP_DIR/app_*.tar.gz | tail -n +8 | xargs rm -f

echo "Backup completed: app_$DATE.tar.gz"
```

Make executable:

```bash
chmod +x ~/backup-app.sh

# Add to crontab (run daily at 3 AM)
crontab -e

# Add this line:
0 3 * * * /home/ubuntu/backup-app.sh
```

### 6.4 Setup Monitoring

```bash
# Install htop for resource monitoring
sudo apt install -y htop

# Monitor resources
htop

# Monitor PM2 apps
pm2 monit

# Check logs
pm2 logs certificate-app --lines 100

# Check Redis
redis-cli info memory
redis-cli info stats
```

---

## 📊 Step 7: Monitoring & Maintenance

### 7.1 Useful Commands

**PM2 Management:**
```bash
# View app status
pm2 status

# Restart app
pm2 restart certificate-app

# Stop app
pm2 stop certificate-app

# View logs
pm2 logs certificate-app

# Clear logs
pm2 flush

# Monitor resources
pm2 monit
```

**Nginx Management:**
```bash
# Check status
sudo systemctl status nginx

# Restart
sudo systemctl restart nginx

# Check configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log
```

**Redis Management:**
```bash
# Check status
sudo systemctl status redis-server

# Connect to Redis CLI
redis-cli

# Inside Redis CLI:
ping                    # Test connection
info memory             # Memory usage
dbsize                  # Number of keys
flushall                # Clear all data (be careful!)
keys *                  # List all keys
```

**Database Management:**
```bash
# Run migrations
cd /var/www/certificate-app
npx prisma migrate deploy

# Open Prisma Studio (from local machine)
npx prisma studio

# Backup database manually
pg_dump -h your-db-endpoint -U postgres -d certificate > backup.sql
```

### 7.2 Update Application

When you need to deploy updates:

```bash
# Navigate to app directory
cd /var/www/certificate-app

# Pull latest code (if using Git)
git pull origin main

# Or upload new files via SCP

# Install new dependencies
npm install

# Run new migrations
npx prisma generate
npx prisma migrate deploy

# Rebuild application
npm run build

# Restart PM2
pm2 restart certificate-app

# Check logs
pm2 logs certificate-app
```

### 7.3 Scaling Considerations

**When to upgrade:**

- **Instance size** - Upgrade to $24/month (4GB RAM) if:
  - Generating 500+ certificates daily
  - High concurrent users (50+)
  - Memory usage consistently >80%

- **Database size** - Upgrade to $30/month (2GB RAM) if:
  - Database size >30GB
  - Slow query performance
  - High connection count

**Horizontal scaling:**
- Use AWS Load Balancer with multiple Lightsail instances
- Or migrate to EC2 Auto Scaling Groups

---

## 🔐 Security Best Practices

### 7.1 Secure SSH Access

```bash
# Disable root login
sudo nano /etc/ssh/sshd_config

# Set: PermitRootLogin no
# Save and restart SSH
sudo systemctl restart sshd
```

### 7.2 Setup Fail2Ban

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Create local config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit config
sudo nano /etc/fail2ban/jail.local

# Find [sshd] section and ensure enabled = true

# Start Fail2Ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status sshd
```

### 7.3 Regular Updates

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
echo "System updated successfully!"
```

Make executable and schedule:

```bash
chmod +x ~/update-system.sh

# Add to crontab (run weekly on Sunday at 4 AM)
crontab -e

# Add this line:
0 4 * * 0 /home/ubuntu/update-system.sh
```

---

## 💰 Cost Breakdown

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| **Lightsail Instance** | 2GB RAM, 1 vCPU | $12.00 |
| **Lightsail Database** | 1GB RAM PostgreSQL | $15.00 |
| **S3 Storage** | ~5GB + requests | ~$1.00 |
| **Data Transfer** | Included in Lightsail | $0.00 |
| **SSL Certificate** | Let's Encrypt (Free) | $0.00 |
| **Total** | | **~$28/month** |

**Free tier benefits:**
- First 3 months: 750 hours of instances free
- Data transfer: 3TB included
- Backups: First 7 days free

---

## 🎯 Quick Deployment Checklist

- [ ] Create Lightsail instance (2GB RAM)
- [ ] Create Lightsail database (PostgreSQL)
- [ ] Install Node.js, PM2, Redis, Nginx
- [ ] Upload application files
- [ ] Create .env.production with database URL
- [ ] Run npm install
- [ ] Run database migrations
- [ ] Build application (npm run build)
- [ ] Start with PM2
- [ ] Configure Nginx reverse proxy
- [ ] Open firewall ports (80, 443)
- [ ] Point domain to instance
- [ ] Install SSL certificate
- [ ] Setup automated backups
- [ ] Configure monitoring

---

## 🆘 Troubleshooting

### Issue: App won't start

```bash
# Check PM2 logs
pm2 logs certificate-app

# Check if port 3000 is in use
sudo lsof -i :3000

# Restart app
pm2 restart certificate-app
```

### Issue: Database connection failed

```bash
# Test database connection
psql -h your-db-endpoint -U postgres -d certificate

# Check DATABASE_URL in .env.production
cat /var/www/certificate-app/.env.production | grep DATABASE_URL

# Verify database is running in Lightsail console
```

### Issue: Redis connection failed

```bash
# Check Redis status
sudo systemctl status redis-server

# Test Redis connection
redis-cli ping

# Restart Redis
sudo systemctl restart redis-server
```

### Issue: Nginx errors

```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Issue: SSL certificate errors

```bash
# Renew certificate manually
sudo certbot renew

# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

---

## 📚 Additional Resources

- **Lightsail Documentation:** https://docs.aws.amazon.com/lightsail/
- **PM2 Documentation:** https://pm2.keymetrics.io/docs/
- **Nginx Documentation:** https://nginx.org/en/docs/
- **Let's Encrypt:** https://letsencrypt.org/
- **Prisma Documentation:** https://www.prisma.io/docs/

---

## 🎉 Congratulations!

Your certificate application is now running in production on AWS Lightsail!

**Next Steps:**
1. Test certificate generation
2. Monitor performance and logs
3. Setup automated backups
4. Configure domain email (optional)
5. Add monitoring alerts (CloudWatch, Sentry)

**Need help?** Check the troubleshooting section or review application logs with `pm2 logs`.