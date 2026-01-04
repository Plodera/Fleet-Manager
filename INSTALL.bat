@echo off
echo ============================================
echo   FleetCmD Quick Installer
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

powershell -ExecutionPolicy Bypass -File "%~dp0install-windows.ps1"

pause
