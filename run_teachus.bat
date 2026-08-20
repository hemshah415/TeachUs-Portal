@echo off
TITLE TeachUs - Academic Data Management System Launcher
COLOR 0A
CLS

SET PROJECT_DIR=C:\Users\Admin\Desktop\Collegedatamanagementsystem

echo =========================================================================
echo               TEACHUS ACADEMIC DATA MANAGEMENT SYSTEM
echo =========================================================================
echo.
echo [1/6] Stopping stale background processes...
taskkill /F /IM node.exe /T >NUL 2>&1
timeout /t 2 /nobreak >NUL

echo [2/6] Clearing frontend build cache for fresh UI display...
if exist "%PROJECT_DIR%\frontend\node_modules\.vite" (
  rmdir /s /q "%PROJECT_DIR%\frontend\node_modules\.vite" >NUL 2>&1
)

echo [3/6] Ensuring MySQL Server service (MySQL80) is running...
net start MySQL80 >NUL 2>&1

echo [4/6] Syncing database schema, aliases & history records to MySQL Workbench...
cd /d "%PROJECT_DIR%\backend"
node utils/fix_mysql_aliases.js >NUL 2>&1
node utils/sync_to_mysql.js >NUL 2>&1

echo [5/6] Setting up Windows Auto-Start on PC Boot...
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
(
  echo @echo off
  echo cd /d "%PROJECT_DIR%\backend"
  echo start /min cmd /c "node server.js"
  echo cd /d "%PROJECT_DIR%\frontend"
  echo start /min cmd /c "npm run dev"
) > "%STARTUP_FOLDER%\TeachUs_AutoStart.bat" 2>NUL

echo [6/6] Starting Backend API Server (Port 5000) & Frontend Portal (Port 3000)...
start /min "TeachUs Backend Server" cmd /c "cd /d %PROJECT_DIR%\backend && node server.js"
start /min "TeachUs Frontend Portal" cmd /c "cd /d %PROJECT_DIR%\frontend && npm run dev -- --force"

echo Waiting for TeachUs services to initialize...
timeout /t 4 /nobreak >NUL

echo Opening TeachUs Web Portal in your default browser...
start http://localhost:3000

echo.
echo =========================================================================
echo  TeachUs Portal launched successfully!
echo  Web Portal:   http://localhost:3000
echo  Admin Login:   admin / admin123
echo  College Login: nkc_user / college123
echo  Note: Auto-start enabled in Startup folder. Site stays online.
echo =========================================================================
echo.
pause
