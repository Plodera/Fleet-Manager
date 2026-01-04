# FleetCmD Windows Server Installation Script
# Run as Administrator in PowerShell

param(
    [string]$PostgresPassword = "",
    [string]$InstallPath = "C:\FleetCmD"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  FleetCmD Windows Server Installer" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: Please run this script as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Get PostgreSQL password if not provided
if ([string]::IsNullOrEmpty($PostgresPassword)) {
    Write-Host "Enter your PostgreSQL password: " -ForegroundColor Yellow -NoNewline
    $securePassword = Read-Host -AsSecureString
    $PostgresPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
}

if ([string]::IsNullOrEmpty($PostgresPassword)) {
    Write-Host "ERROR: PostgreSQL password is required!" -ForegroundColor Red
    exit 1
}

# Generate random session secret
$SessionSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 48 | ForEach-Object {[char]$_})

Write-Host ""
Write-Host "Step 1: Checking prerequisites..." -ForegroundColor Green

# Check Node.js
$nodeVersion = $null
try {
    $nodeVersion = node -v 2>$null
} catch {}

if ($nodeVersion) {
    Write-Host "  Node.js found: $nodeVersion" -ForegroundColor Gray
} else {
    Write-Host "  ERROR: Node.js not found!" -ForegroundColor Red
    Write-Host "  Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check PostgreSQL
$pgPath = "C:\Program Files\PostgreSQL"
$pgVersions = Get-ChildItem $pgPath -ErrorAction SilentlyContinue | Sort-Object Name -Descending
if ($pgVersions) {
    $pgBin = Join-Path $pgVersions[0].FullName "bin"
    Write-Host "  PostgreSQL found: $($pgVersions[0].Name)" -ForegroundColor Gray
} else {
    Write-Host "  ERROR: PostgreSQL not found!" -ForegroundColor Red
    Write-Host "  Please install PostgreSQL from https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Step 2: Creating database..." -ForegroundColor Green

$env:PGPASSWORD = $PostgresPassword
$psqlPath = Join-Path $pgBin "psql.exe"

# Check if database exists, create if not
$dbCheck = & $psqlPath -U postgres -h localhost -t -c "SELECT 1 FROM pg_database WHERE datname='fleetcmd'" 2>$null
if ($dbCheck -match "1") {
    Write-Host "  Database 'fleetcmd' already exists" -ForegroundColor Gray
} else {
    Write-Host "  Creating database 'fleetcmd'..." -ForegroundColor Gray
    & $psqlPath -U postgres -h localhost -c "CREATE DATABASE fleetcmd" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Database created successfully" -ForegroundColor Gray
    } else {
        Write-Host "  ERROR: Could not create database. Check your PostgreSQL password." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Step 3: Creating .env file..." -ForegroundColor Green

$envContent = @"
DATABASE_URL=postgresql://postgres:$PostgresPassword@localhost:5432/fleetcmd
SESSION_SECRET=$SessionSecret
NODE_ENV=production
PORT=5000
"@

$envPath = Join-Path $InstallPath ".env"
$envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
Write-Host "  Created $envPath" -ForegroundColor Gray

Write-Host ""
Write-Host "Step 4: Installing dependencies..." -ForegroundColor Green
Set-Location $InstallPath
npm install 2>&1 | Out-Null
Write-Host "  Dependencies installed" -ForegroundColor Gray

Write-Host ""
Write-Host "Step 5: Building application..." -ForegroundColor Green
npm run build 2>&1 | Out-Null
Write-Host "  Build complete" -ForegroundColor Gray

Write-Host ""
Write-Host "Step 6: Setting up database tables..." -ForegroundColor Green
npm run db:push 2>&1
Write-Host "  Database tables created" -ForegroundColor Gray

Write-Host ""
Write-Host "Step 7: Configuring Windows Firewall..." -ForegroundColor Green
New-NetFirewallRule -DisplayName "FleetCmD HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "FleetCmD HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "FleetCmD App" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow -ErrorAction SilentlyContinue | Out-Null
Write-Host "  Firewall rules added" -ForegroundColor Gray

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the application manually:" -ForegroundColor Yellow
Write-Host "  cd $InstallPath" -ForegroundColor White
Write-Host "  node dist/index.js" -ForegroundColor White
Write-Host ""
Write-Host "Then open: http://localhost:5000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Default login:" -ForegroundColor Yellow
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: Change the admin password after first login!" -ForegroundColor Red
Write-Host ""
Write-Host "To run as Windows Service, see DEPLOYMENT_GUIDE.md Step 3" -ForegroundColor Cyan
