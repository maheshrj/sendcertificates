#!/bin/bash

# ====================================================
# Certificate App - Lightsail Setup Script
# ====================================================
# This script automates the setup of your certificate
# application on AWS Lightsail
# ====================================================

set -e  # Exit on error

echo "======================================================"
echo "Certificate App - Lightsail Setup"
echo "======================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# ====================================================
# Step 1: Update System
# ====================================================
echo ""
print_info "Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_success "System updated successfully"

# ====================================================
# Step 2: Install Node.js
# ====================================================
echo ""
print_info "Step 2: Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
NODE_VERSION=$(node --version)
print_success "Node.js installed: $NODE_VERSION"

# ====================================================
# Step 3: Install PM2
# ====================================================
echo ""
print_info "Step 3: Installing PM2..."
sudo npm install -g pm2
PM2_VERSION=$(pm2 --version)
print_success "PM2 installed: v$PM2_VERSION"

# ====================================================
# Step 4: Install Redis
# ====================================================
echo ""
print_info "Step 4: Installing Redis..."
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
REDIS_PING=$(redis-cli ping)
print_success "Redis installed and running: $REDIS_PING"

# ====================================================
# Step 5: Install Nginx
# ====================================================
echo ""
print_info "Step 5: Installing Nginx..."
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
print_success "Nginx installed and running"

# ====================================================
# Step 6: Install Certbot (SSL)
# ====================================================
echo ""
print_info "Step 6: Installing Certbot for SSL..."
sudo apt install -y certbot python3-certbot-nginx
print_success "Certbot installed"

# ====================================================
# Step 7: Install Git
# ====================================================
echo ""
print_info "Step 7: Installing Git..."
sudo apt install -y git
GIT_VERSION=$(git --version)
print_success "Git installed: $GIT_VERSION"

# ====================================================
# Step 8: Install Canvas Dependencies
# ====================================================
echo ""
print_info "Step 8: Installing Canvas dependencies..."
sudo apt install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
print_success "Canvas dependencies installed"

# ====================================================
# Step 9: Create Application Directory
# ====================================================
echo ""
print_info "Step 9: Creating application directory..."
sudo mkdir -p /var/www/certificate-app
sudo chown -R ubuntu:ubuntu /var/www/certificate-app
print_success "Application directory created: /var/www/certificate-app"

# ====================================================
# Step 10: Configure Redis for Production
# ====================================================
echo ""
print_info "Step 10: Configuring Redis..."
sudo bash -c 'cat >> /etc/redis/redis.conf <<EOF

# Production settings
maxmemory 256mb
maxmemory-policy allkeys-lru
EOF'
sudo systemctl restart redis-server
print_success "Redis configured for production"

# ====================================================
# Step 11: Install Monitoring Tools
# ====================================================
echo ""
print_info "Step 11: Installing monitoring tools..."
sudo apt install -y htop
print_success "Monitoring tools installed (htop)"

# ====================================================
# Summary
# ====================================================
echo ""
echo "======================================================"
echo "Setup Complete! ✓"
echo "======================================================"
echo ""
echo "Installed components:"
echo "  • Node.js: $NODE_VERSION"
echo "  • PM2: v$PM2_VERSION"
echo "  • Redis: Running"
echo "  • Nginx: Running"
echo "  • Certbot: Installed"
echo "  • Git: $GIT_VERSION"
echo "  • Canvas Dependencies: Installed"
echo ""
echo "Next steps:"
echo "  1. Upload your application files to: /var/www/certificate-app"
echo "  2. Create .env.production file with your configuration"
echo "  3. Run: cd /var/www/certificate-app && npm install"
echo "  4. Run: npm run build"
echo "  5. Run: pm2 start npm --name certificate-app -- start"
echo "  6. Configure Nginx reverse proxy"
echo "  7. Setup SSL with certbot"
echo ""
echo "======================================================"