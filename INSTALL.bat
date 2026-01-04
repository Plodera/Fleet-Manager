@echo off
echo ============================================
echo   FleetCmD Quick Installer for Windows
echo ============================================
echo.
echo This will install FleetCmD on your Windows Server.
echo.
echo BEFORE RUNNING THIS:
echo   1. Install Node.js from https://nodejs.org/
echo   2. Install PostgreSQL from https://www.postgresql.org/download/windows/
echo   3. Remember your PostgreSQL password!
echo.
echo Press any key to continue or CTRL+C to cancel...
pause >nul

echo.
echo Step 1: Installing dependencies...
call npm install

echo.
echo Step 2: Building for Windows Server...
call node build-windows.cjs

echo.
echo ============================================
echo   Build Complete!
echo ============================================
echo.
echo To start the app, run START.bat
echo.
pause
