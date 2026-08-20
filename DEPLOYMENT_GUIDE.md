# 🚀 Live Server Deployment Guide

This guide provides step-by-step instructions for hosting the **College Academic Data Management & Automated Validation Portal** on a live server.

---

## 🏗️ System Components Overview

1. **Frontend**: React + Vite SPA (Port 3000 locally / Port 80/443 in Production)
2. **Backend**: Express API Node.js server (Port 5000)
3. **Database**: MySQL 8.0 Database (`college_data_management`)
4. **Python Engine**: Python 3.x + `pandas` + `openpyxl` for Excel validation

---

## ⚡ Option 1: VPS / Cloud Server Deployment (Recommended)
*Ideal for: Hostinger VPS, DigitalOcean Droplet, AWS EC2, Linode, Vultr (Ubuntu 22.04 LTS)*

### Step 1: Connect to Server & Install Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm mysql-server python3 python3-pip python3-pandas python3-openpyxl nginx git
sudo npm install -g pm2
```

### Step 2: Configure MySQL Database
```bash
sudo mysql
```
In MySQL console:
```sql
CREATE DATABASE college_data_management;
CREATE USER 'college_user'@'localhost' IDENTIFIED BY 'YourStrongPassword123';
GRANT ALL PRIVILEGES ON college_data_management.* TO 'college_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Clone Codebase & Configure Environment
```bash
cd /var/www
sudo git clone <YOUR_GIT_REPOSITORY_URL> college_portal
cd college_portal/backend
```
Create `.env` file in `backend/`:
```env
PORT=5000
JWT_SECRET=your_super_secret_production_jwt_key_2026
DB_HOST=localhost
DB_PORT=3306
DB_USER=college_user
DB_PASSWORD=YourStrongPassword123
DB_NAME=college_data_management
```

### Step 4: Install Dependencies & Build Frontend
```bash
# Install backend dependencies
cd /var/www/college_portal/backend
npm install --production

# Install frontend dependencies and build production dist
cd /var/www/college_portal/frontend
npm install
npm run build
```

### Step 5: Start Backend with PM2 Process Manager
```bash
cd /var/www/college_portal/backend
pm2 start server.js --name "college-backend"
pm2 save
pm2 startup
```

### Step 6: Configure Nginx & SSL Certificate
Create `/etc/nginx/sites-available/college_portal`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Serve React Frontend Production Build
    location / {
        root /var/www/college_portal/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API Requests to Express Backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable site and get SSL Certificate:
```bash
sudo ln -s /etc/nginx/sites-available/college_portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install free HTTPS SSL Certificate
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🐳 Option 2: Docker One-Click Deployment
*Ideal for servers with Docker installed (`docker-compose up -d`)*

1. Install Docker & Docker Compose on your server.
2. Clone repository to server.
3. Run:
```bash
docker-compose up -d --build
```
Your application will be live at `http://your-server-ip`.

---

## 🌐 Option 3: Managed Cloud Hosting (Render / Railway / Vercel)

### Frontend (Vercel / Netlify - FREE):
1. Import `frontend` directory to Vercel/Netlify.
2. Set Environment Variable:
   `VITE_API_BASE_URL` = `https://your-backend-api.onrender.com/api`
3. Deploy.

### Backend (Render / Railway):
1. Deploy `backend` directory as Web Service.
2. Connect Aiven / PlanetScale MySQL database.
3. Set Environment Variables: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`.

---

## ✅ Post-Deployment Verification Checklist

1. [ ] Log in to Admin Portal (`https://yourdomain.com/admin`) -> Default: `admin` / `admin123`
2. [ ] Log in to College User Portal (`https://yourdomain.com/college`) -> Default: `nkc_user` / `college123`
3. [ ] Upload test Excel file (`test_deadline.xlsx` or `test_invalid.xlsx`) to verify automatic Python validation engine.
4. [ ] Download official Excel template (`.xlsx`) to verify spreadsheet MIME download.
