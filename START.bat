@echo off
echo Starting FleetCmD...
echo.

set /p PGPASS="Enter your PostgreSQL password: "

set DATABASE_URL=postgresql://postgres:%PGPASS%@localhost:5432/fleetcmd
set SESSION_SECRET=FleetCmD2025SecureSessionKeyAisco
set NODE_ENV=production
set PORT=5000

echo.
echo Starting server on http://localhost:5000
echo Press Ctrl+C to stop
echo.

node dist/index.cjs
