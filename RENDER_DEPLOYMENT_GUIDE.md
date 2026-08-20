# 🌐 Step-by-Step Render.com Deployment Guide

This guide details how to deploy the **TeachUs College Academic Data Portal** to **Render.com** for free in under 5 minutes.

---

## 🛠️ Step 1: Push Code to GitHub / GitLab

Make sure your project repository is uploaded to GitHub or GitLab.

If initializing Git for the first time:
```bash
git init
git add .
git commit -m "Prepare Render deployment with render.yaml"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.name.git
git push -u origin main
```

---

## 🚀 Step 2: Automatic 1-Click Deployment using Render Blueprint

1. Go to [https://dashboard.render.com](https://dashboard.render.com) and log in.
2. Click **New +** (top right) and select **Blueprint**.
3. Connect your GitHub / GitLab repository containing this code.
4. Render will automatically detect `render.yaml` and provision 2 services:
   * **`teachus-backend-api`** (Docker Web Service for Express API + Python Engine)
   * **`teachus-college-portal`** (Static Web Site for React Frontend SPA)
5. Click **Apply**. Render will build and deploy both services automatically!

---

## 🗄️ Step 3: MySQL Database Setup (Free MySQL on Aiven.io or Railway)

Render provides web services; for a free managed MySQL database:

1. Sign up for a free MySQL database on [Aiven.io](https://aiven.io) or [Railway.app](https://railway.app).
2. Create a database named `college_data_management`.
3. In Render Dashboard -> **`teachus-backend-api`** -> **Environment Variables**, set:
   * `DB_HOST`: `<your-aiven-mysql-host>`
   * `DB_USER`: `avnadmin` (or your db user)
   * `DB_PASSWORD`: `<your-db-password>`
   * `DB_PORT`: `3306`
   * `DB_NAME`: `college_data_management`

*(Note: If MySQL env variables are not set, the system will automatically run smoothly using its built-in SQLite fallback layer `college_fallback.db`).*

---

## 🎉 Live URLs Summary

After deployment finishes on Render:

* 🌐 **College & Admin Web Portal**: `https://teachus-college-portal.onrender.com`
* ⚡ **Express Backend API**: `https://teachus-backend-api.onrender.com/api`

### Default Login Credentials:
* **Admin Login**: `admin` / `admin123`
* **College Login**: `nkc_user` / `college123`
