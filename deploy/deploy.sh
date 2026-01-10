#!/bin/bash

# ====================================================
# Certificate App - Deployment Script
# ====================================================
# Run this script on your Lightsail instance after
# uploading your application files
# ====================================================

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "======================================================"
echo "Certificate App - Deployment"
echo "======================================================"
echo ""

# Check if running in correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found!${NC}"
    echo "Please run this script from the application root directory:"
    echo "  cd /var/www/certificate-app"
    echo "  bash deploy/deploy.sh"
    exit 1
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}Error: .env.production not found!${NC}"
    echo "Please create .env.production file with your configuration."
    echo "You can use deploy/.env.production.template as a starting point."
    exit 1
fi

echo -e "${YELLOW}Starting deployment...${NC}"
echo ""

# ====================================================
# Step 1: Install Dependencies
# ====================================================
echo -e "${YELLOW}Step 1/7: Installing dependencies...${NC}"
npm install --production=false
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# ====================================================
# Step 2: Generate Prisma Client
# ====================================================
echo -e "${YELLOW}Step 2/7: Generating Prisma client...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Prisma client generated${NC}"
echo ""

# ====================================================
# Step 3: Run Database Migrations
# ====================================================
echo -e "${YELLOW}Step 3/7: Running database migrations...${NC}"
npx prisma migrate deploy
echo -e "${GREEN}✓ Database migrations completed${NC}"
echo ""

# ====================================================
# Step 4: Build Application
# ====================================================
echo -e "${YELLOW}Step 4/7: Building Next.js application...${NC}"
npm run build
echo -e "${GREEN}✓ Application built successfully${NC}"
echo ""

# ====================================================
# Step 5: Setup PM2
# ====================================================
echo -e "${YELLOW}Step 5/7: Configuring PM2...${NC}"

# Check if app is already running
if pm2 list | grep -q "certificate-app"; then
    echo "Restarting existing PM2 process..."
    pm2 restart certificate-app
else
    echo "Starting new PM2 process..."
    pm2 start npm --name "certificate-app" -- start
fi

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup > /dev/null 2>&1 || true

echo -e "${GREEN}✓ PM2 configured${NC}"
echo ""

# ====================================================
# Step 6: Configure Nginx
# ====================================================
echo -e "${YELLOW}Step 6/7: Configuring Nginx...${NC}"

# Copy Nginx config if it doesn't exist
if [ ! -f "/etc/nginx/sites-available/certificate-app" ]; then
    sudo cp deploy/nginx-config.conf /etc/nginx/sites-available/certificate-app
    sudo ln -sf /etc/nginx/sites-available/certificate-app /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    echo "Nginx configuration created"
else
    echo "Nginx configuration already exists"
fi

# Test Nginx configuration
if sudo nginx -t > /dev/null 2>&1; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✓ Nginx configured and reloaded${NC}"
else
    echo -e "${RED}✗ Nginx configuration error!${NC}"
    echo "Please check: sudo nginx -t"
fi
echo ""

# ====================================================
# Step 7: Verify Services
# ====================================================
echo -e "${YELLOW}Step 7/7: Verifying services...${NC}"

# Check Redis
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis: Running${NC}"
else
    echo -e "${RED}✗ Redis: Not running${NC}"
    echo "  Start with: sudo systemctl start redis-server"
fi

# Check PostgreSQL connection
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database: Connected${NC}"
else
    echo -e "${RED}✗ Database: Connection failed${NC}"
    echo "  Check DATABASE_URL in .env.production"
fi

# Check PM2
if pm2 list | grep -q "online"; then
    echo -e "${GREEN}✓ Application: Running${NC}"
else
    echo -e "${RED}✗ Application: Not running${NC}"
    echo "  Check logs: pm2 logs certificate-app"
fi

# Check Nginx
if sudo systemctl is-active nginx > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Nginx: Running${NC}"
else
    echo -e "${RED}✗ Nginx: Not running${NC}"
    echo "  Start with: sudo systemctl start nginx"
fi

echo ""
echo "======================================================"
echo "Deployment Complete!"
echo "======================================================"
echo ""
echo "Application Status:"
pm2 status
echo ""
echo "Useful commands:"
echo "  • View logs:       pm2 logs certificate-app"
echo "  • Monitor:         pm2 monit"
echo "  • Restart:         pm2 restart certificate-app"
echo "  • Stop:            pm2 stop certificate-app"
echo ""
echo "Next steps:"
echo "  1. Test your application at: http://YOUR_SERVER_IP"
echo "  2. Configure domain DNS to point to your Lightsail IP"
echo "  3. Setup SSL: sudo certbot --nginx -d yourdomain.com"
echo "  4. Update NEXT_PUBLIC_BASE_URL in .env.production"
echo "  5. Rebuild and restart: npm run build && pm2 restart certificate-app"
echo ""
echo "======================================================"
