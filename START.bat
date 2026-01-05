@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   FleetCmD - Starting Application
echo ============================================
echo.

if not exist .env (
    echo ERROR: .env file not found!
    echo.
    echo Please create a .env file with your settings:
    echo   copy .env.example .env
    echo   notepad .env
    echo.
    pause
    exit /b 1
)

echo Loading configuration from .env file...
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    set "firstchar=%%a"
    set "firstchar=!firstchar:~0,1!"
    if not "!firstchar!"=="#" (
        if not "%%a"=="" set "%%a=%%b"
    )
)

set NODE_ENV=development

echo.
echo Starting server on http://localhost:%PORT%
echo Press Ctrl+C to stop
echo.

npx tsx server/index.ts
