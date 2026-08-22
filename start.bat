@echo off
REM Start GJ Events WhatsApp Automation System
REM This script launches three independent services:
REM   - Django API (port 8000)
REM   - React Frontend (port 5173)
REM   - WhatsApp Service (port 3001)

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================
echo GJ Events WhatsApp Automation System
echo ============================================
echo.
echo Starting services...
echo   - Django API: http://127.0.0.1:8000
echo   - Frontend: http://127.0.0.1:5173
echo   - WhatsApp Service: http://127.0.0.1:3001
echo.

REM Start Django Backend
echo Starting Django API...
start "Django API" cmd /k cd "%~dp0backend" ^& if not exist .venv python -m venv .venv ^& call .venv\Scripts\activate.bat ^& python -m pip install -q -r requirements.txt ^& python manage.py migrate ^& python manage.py runserver 0.0.0.0:8000

timeout /t 3 /nobreak

REM Start React Frontend
echo Starting React Frontend...
start "React Frontend" cmd /k cd "%~dp0frontend" ^& npm install --silent ^& npm run dev

timeout /t 3 /nobreak

REM Start WhatsApp Service
echo Starting WhatsApp Service...
powershell -NoProfile -Command "$listener = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue; if ($listener) { exit 1 } else { exit 0 }"
if errorlevel 1 (
	echo WhatsApp Service is already running on port 3001. Reusing the existing service.
) else (
	start "WhatsApp Service" cmd /k cd "%~dp0whatsapp-service" ^& npm install --silent ^& npm run dev
)

timeout /t 5 /nobreak

echo.
echo All services launched! Opening dashboard in browser...
echo.

REM Open browser to the dashboard
start "" "http://127.0.0.1:8000"

echo Done! Close any terminal window to stop that service.
pause
