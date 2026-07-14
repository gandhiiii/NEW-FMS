@echo off
echo ==========================================
echo  Hospital Management System
echo  Starting all services...
echo ==========================================
echo.

start "HMS-Backend" cmd /c "cd /d D:\full app\backend && node server.js"
timeout /t 3 /nobreak >nul
start "HMS-Frontend" cmd /c "cd /d D:\full app\frontend && npx vite --host"
timeout /t 3 /nobreak >nul

echo.
echo ==========================================
echo  Backend:  http://localhost:5000
echo  Frontend: http://localhost:3000
echo  Admin Login:
echo    Email:    admin@hospital.com
echo    Password: admin123
echo ==========================================
echo.
echo Close this window to stop all services.
pause
