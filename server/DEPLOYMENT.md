# PayLink Pro - VPS Deployment Guide

## Table of Contents
1. [Create Dedicated VPS User](#1-create-dedicated-vps-user)
2. [Deploy the Project](#2-deploy-the-project)
3. [Configure Nginx Reverse Proxy](#3-configure-nginx-reverse-proxy)
4. [SSL Certificate Setup](#4-ssl-certificate-setup)
5. [Change Admin Credentials](#5-change-admin-credentials)
6. [Useful Commands](#6-useful-commands)
7. [Complete Removal Guide](#7-complete-removal-guide)

---

## Port Configuration
This project uses custom ports to avoid conflicts:
- **API Server**: 5050 (internal: 5000)
- **MySQL Database**: 3308 (internal: 3306)

---

## 1. Create Dedicated VPS User

### Login as root
```bash
ssh root@your-vps-ip
```

### Create new user for this project
```bash
# Create user
adduser paylink

# Add to sudo group (optional, for admin tasks)
usermod -aG sudo paylink

# Add to docker group (required for docker commands)
usermod -aG docker paylink

# Switch to new user
su - paylink
```

### Setup SSH key for the new user (optional but recommended)
```bash
# On your local machine
ssh-copy-id paylink@your-vps-ip

# Or manually on VPS as paylink user
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
# Paste your public key, save and exit
chmod 600 ~/.ssh/authorized_keys
```

---

## 2. Deploy the Project

### Login as paylink user
```bash
ssh paylink@your-vps-ip
```

### Create project directory
```bash
mkdir -p ~/apps/paylink-pro
cd ~/apps/paylink-pro
```

### Clone or upload the project
```bash
# Option 1: Clone from Git
git clone https://github.com/your-repo/paylink-pro.git .

# Option 2: Upload via SCP (from local machine)
scp -r ./server paylink@your-vps-ip:~/apps/paylink-pro/
```

### Navigate to server directory
```bash
cd ~/apps/paylink-pro/server
```

### Create production environment file
```bash
cp .env.production .env
nano .env
```

### Edit .env with your actual values:
```env
# Custom ports (avoid conflicts)
API_PORT=5050
DB_PORT=3308

# Database
DB_USER=paylink_user
DB_PASS=YourStrongPassword123!
DB_NAME=paylink_db
DB_ROOT_PASSWORD=YourRootPassword456!

# JWT (generate with: openssl rand -base64 64)
JWT_SECRET=your-generated-secret-here

# Your domain URLs
FRONTEND_URL=https://paylink.yourdomain.com
BACKEND_URL=https://api.paylink.yourdomain.com

# Paytm credentials
PAYTM_MID=your_merchant_id
PAYTM_MERCHANT_KEY=your_merchant_key
PAYTM_ENV=production

# SMTP
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Start the containers
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Check if containers are running
```bash
docker ps
```

### View logs
```bash
# All containers
docker-compose -f docker-compose.prod.yml logs -f

# Only API
docker logs -f paylink-api

# Only MySQL
docker logs -f paylink-mysql
```

---

## 3. Configure Nginx Reverse Proxy

### Create Nginx config for API
```bash
sudo nano /etc/nginx/sites-available/paylink-api
```

### Add this configuration:
```nginx
server {
    listen 80;
    server_name api.paylink.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/paylink-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4. SSL Certificate Setup

### Install Certbot if not installed
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

### Get SSL certificate
```bash
sudo certbot --nginx -d api.paylink.yourdomain.com
```

---

## 5. Change Admin Credentials

### Method 1: Via API (if you know current password)
```bash
# Login first
curl -X POST https://api.paylink.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "current@email.com", "password": "currentpassword"}'

# Use the token to change password
curl -X PUT https://api.paylink.yourdomain.com/api/auth/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"currentPassword": "oldpassword", "newPassword": "newpassword"}'
```

### Method 2: Direct Database Update (if forgot password)
```bash
# Connect to MySQL container
docker exec -it paylink-mysql mysql -u root -p
# Enter DB_ROOT_PASSWORD when prompted

# Select database
USE paylink_db;

# Generate new password hash (use bcrypt online generator or node)
# Then update:
UPDATE users SET 
  email = 'new-admin@email.com',
  password_hash = '$2a$10$YOUR_NEW_BCRYPT_HASH'
WHERE id = 1;

# Exit MySQL
exit;
```

### Generate bcrypt hash using Node.js:
```bash
docker exec -it paylink-api node -e "
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('YourNewPassword123', 10);
console.log(hash);
"
```

### Method 3: Reset via SQL script
```bash
# Create a reset script
cat > /tmp/reset-admin.sql << 'EOF'
USE paylink_db;
-- Delete existing admin
DELETE FROM business_settings WHERE user_id = 1;
DELETE FROM users WHERE id = 1;
-- Reset auto increment
ALTER TABLE users AUTO_INCREMENT = 1;
EOF

# Run it
docker exec -i paylink-mysql mysql -u root -p${DB_ROOT_PASSWORD} < /tmp/reset-admin.sql

# Now register new admin via API
curl -X POST https://api.paylink.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "New Admin", "email": "newadmin@email.com", "password": "newpassword123"}'
```

---

## 6. Useful Commands

### Start/Stop/Restart Services
```bash
cd ~/apps/paylink-pro/server

# Start
docker-compose -f docker-compose.prod.yml up -d

# Stop
docker-compose -f docker-compose.prod.yml down

# Restart
docker-compose -f docker-compose.prod.yml restart

# Restart single service
docker-compose -f docker-compose.prod.yml restart api
```

### View Logs
```bash
# Follow all logs
docker-compose -f docker-compose.prod.yml logs -f

# Last 100 lines of API
docker logs --tail 100 paylink-api

# Last 100 lines of MySQL
docker logs --tail 100 paylink-mysql
```

### Database Backup
```bash
# Backup
docker exec paylink-mysql mysqldump -u root -p${DB_ROOT_PASSWORD} paylink_db > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i paylink-mysql mysql -u root -p${DB_ROOT_PASSWORD} paylink_db < backup_20260301.sql
```

### Update Application
```bash
cd ~/apps/paylink-pro/server

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

### Check Resource Usage
```bash
docker stats paylink-api paylink-mysql
```

---

## 7. Complete Removal Guide

### Step 1: Stop and remove containers
```bash
cd ~/apps/paylink-pro/server

# Stop containers and remove volumes
docker-compose -f docker-compose.prod.yml down -v

# Remove images
docker rmi paylink-pro-server-api
docker rmi mysql:8.0
```

### Step 2: Remove project files
```bash
rm -rf ~/apps/paylink-pro
```

### Step 3: Remove Nginx configuration
```bash
sudo rm /etc/nginx/sites-enabled/paylink-api
sudo rm /etc/nginx/sites-available/paylink-api
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Remove SSL certificates (optional)
```bash
sudo certbot delete --cert-name api.paylink.yourdomain.com
```

### Step 5: Remove Docker volumes and networks
```bash
# Remove named volumes
docker volume rm paylink_mysql_data

# Remove network
docker network rm paylink-network

# Clean up unused Docker resources
docker system prune -a
```

### Step 6: Remove the paylink user from VPS
```bash
# Login as root
ssh root@your-vps-ip

# Kill all processes of the user
pkill -u paylink

# Remove user and home directory
userdel -r paylink

# Verify user is removed
id paylink  # Should say "no such user"
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start services | `docker-compose -f docker-compose.prod.yml up -d` |
| Stop services | `docker-compose -f docker-compose.prod.yml down` |
| View logs | `docker-compose -f docker-compose.prod.yml logs -f` |
| Restart API | `docker-compose -f docker-compose.prod.yml restart api` |
| Enter MySQL | `docker exec -it paylink-mysql mysql -u root -p` |
| Backup DB | `docker exec paylink-mysql mysqldump -u root -p paylink_db > backup.sql` |
| Check status | `docker ps` |

---

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check if ports are in use
sudo netstat -tulpn | grep -E '5050|3308'
```

### Database connection failed
```bash
# Check if MySQL is healthy
docker exec paylink-mysql mysqladmin ping -u root -p

# Check MySQL logs
docker logs paylink-mysql
```

### API returns 502 Bad Gateway
```bash
# Check if API container is running
docker ps | grep paylink-api

# Check API logs
docker logs paylink-api

# Restart API
docker-compose -f docker-compose.prod.yml restart api
```

### Permission denied errors
```bash
# Make sure user is in docker group
groups paylink

# If not, add user to docker group
sudo usermod -aG docker paylink

# Logout and login again for changes to take effect
```
