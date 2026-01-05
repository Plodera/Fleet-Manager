# FleetCmD Windows Startup Script
# Run this script to start the application

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  FleetCmD - Starting Application" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create a .env file:"
    Write-Host "  Copy-Item .env.example .env"
    Write-Host "  notepad .env"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Load .env file
Get-Content ".env" | ForEach-Object {
    if ($_ -match "^\s*([^#][^=]+)\s*=\s*(.+)\s*$") {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

$env:NODE_ENV = "development"

Write-Host "Starting server on http://localhost:$($env:PORT)" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

npx tsx server/index.ts
