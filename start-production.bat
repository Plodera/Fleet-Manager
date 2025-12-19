@echo off
REM Start Organization Transport Web App on Windows Server

echo ====================================
echo Transport Web App - Production Start
echo ====================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo ERROR: .env file not found
    echo Please create .env file with DATABASE_URL and SESSION_SECRET
    echo See HOSTING_SETUP.md for instructions
    pause
    exit /b 1
)

echo Checking dependencies...
if not exist "node_modules" (
    echo Installing packages...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install packages
        pause
        exit /b 1
    )
)

echo.
echo Building frontend...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo ====================================
echo Starting application on port 5000
echo ====================================
echo.
echo Access the app at: http://localhost:5000
echo Press Ctrl+C to stop
echo.

node server/index.js
pause
