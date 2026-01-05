# FleetCmD - Ubuntu Deployment Guide

## Prerequisites
- Ubuntu 22.04 or 24.04 LTS
- Root or sudo access

## Step 1: Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## Step 2: Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## Step 3: Create Database

```bash
sudo -u postgres psql
```

In PostgreSQL prompt:
```sql
CREATE USER fleetcmd WITH PASSWORD 'YourSecurePassword123';
CREATE DATABASE fleetcmd OWNER fleetcmd;
GRANT ALL PRIVILEGES ON DATABASE fleetcmd TO fleetcmd;
\q
```

## Step 4: Upload Application

Upload your FleetCmD files to `/opt/fleetcmd`:

```bash
sudo mkdir -p /opt/fleetcmd
# Upload files via SFTP/SCP to /opt/fleetcmd
cd /opt/fleetcmd
```

## Step 5: Install Dependencies

```bash
cd /opt/fleetcmd
npm install
```

## Step 6: Configure Environment

```bash
sudo nano /opt/fleetcmd/.env
```

Add these lines:
```
DATABASE_URL=postgresql://fleetcmd:YourSecurePassword123@localhost:5432/fleetcmd
SESSION_SECRET=GenerateASecureRandomString123
NODE_ENV=production
PORT=5000
```

## Step 7: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

## Step 8: Create PM2 Startup Script

```bash
cd /opt/fleetcmd
pm2 start npx --name "fleetcmd" -- tsx server/index.ts
pm2 save
pm2 startup
```

## Step 9: Install Nginx (Reverse Proxy)

```bash
sudo apt install -y nginx
```

Create config:
```bash
sudo nano /etc/nginx/sites-available/fleetcmd
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
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

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/fleetcmd /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 10: SSL Certificate (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Step 11: Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## Useful Commands

```bash
# View app logs
pm2 logs fleetcmd

# Restart app
pm2 restart fleetcmd

# Check status
pm2 status

# Update app (after uploading new files)
cd /opt/fleetcmd
npm install
pm2 restart fleetcmd
```

## Default Login
- Username: admin
- Password: admin123

## Troubleshooting

### Database Connection Error
Check PostgreSQL is running:
```bash
sudo systemctl status postgresql
```

### App Not Starting
Check logs:
```bash
pm2 logs fleetcmd --lines 50
```

### Port Already in Use
```bash
sudo lsof -i :5000
sudo kill -9 <PID>
pm2 restart fleetcmd
```
