@echo off
echo ============================================
echo   FleetCmD Quick Installer for Windows
echo ============================================
echo.
echo BEFORE RUNNING THIS:
echo   1. Install Node.js 20+ from https://nodejs.org/
echo   2. Install PostgreSQL 15+ from https://www.postgresql.org/download/windows/
echo   3. Remember your PostgreSQL password!
echo.
echo Press any key to continue or CTRL+C to cancel...
pause >nul

echo.
echo Step 1: Installing dependencies...
call npm install

echo.
echo Step 2: Creating database...
set /p PGPASS="Enter your PostgreSQL password: "
set DATABASE_URL=postgresql://postgres:%PGPASS%@localhost:5432/fleetcmd

echo Creating database 'fleetcmd'...
psql -U postgres -c "CREATE DATABASE fleetcmd" 2>nul

echo.
echo Step 3: Setting up database tables...
call npx drizzle-kit push

echo.
echo ============================================
echo   Installation Complete!
echo ============================================
echo.
echo To start the app, run: START.bat
echo.
pause
