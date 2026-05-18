@echo off
title Mashroom Magic
echo ========================================
echo   Mashroom Magic - Starting App...
echo ========================================

echo.
echo [1/4] Installing backend dependencies...
cd /d "%~dp0backend"
call npm install --silent
if errorlevel 1 ( echo ERROR: Backend install failed & pause & exit /b 1 )

echo [2/4] Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install --silent
if errorlevel 1 ( echo ERROR: Frontend install failed & pause & exit /b 1 )

echo [3/4] Starting backend API on port 3001...
cd /d "%~dp0backend"
start "Mashroom Backend" cmd /k "node src/server.js"

timeout /t 2 /nobreak >nul

echo [4/4] Starting frontend on port 5000...
cd /d "%~dp0frontend"
start "Mashroom Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo   App is starting!
echo   Open: http://localhost:5000
echo ========================================
timeout /t 4 /nobreak >nul
start http://localhost:5000
