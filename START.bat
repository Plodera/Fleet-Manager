@echo off
echo ============================================
echo   FleetCmD - Starting Application
echo ============================================
echo.

if not exist .env (
    echo ERROR: .env file not found!
    echo.
    echo Please copy .env.example to .env and update your database password.
    echo   copy .env.example .env
    echo   notepad .env
    echo.
    pause
    exit /b 1
)

echo Loading configuration from .env file...
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    set "line=%%a"
    if not "!line:~0,1!"=="#" (
        if not "%%a"=="" set "%%a=%%b"
    )
)

echo Starting server on http://localhost:%PORT%
echo Press Ctrl+C to stop
echo.

setlocal enabledelayedexpansion
npx tsx server/index.ts
