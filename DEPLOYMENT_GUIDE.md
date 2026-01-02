# FleetCmD Deployment Guide - Windows Server 2022

This guide walks you through deploying the FleetCmD application to a Windows Server 2022 with your own domain.

---

## Prerequisites

Before starting, ensure you have:
- Windows Server 2022 with Administrator access
- A registered domain name with DNS access
- Your server's public IP address

---

## Step 1: Install Required Software

### 1.1 Install Node.js
1. Download Node.js LTS from https://nodejs.org/ (choose Windows Installer .msi)
2. Run the installer with default options
3. Verify installation by opening PowerShell:
   ```powershell
   node -v
   npm -v
   ```

### 1.2 Install PostgreSQL
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer:
   - Choose installation directory (default is fine)
   - Set a password for the `postgres` user (save this!)
   - Keep default port `5432`
   - Complete installation
3. Open pgAdmin (installed with PostgreSQL) and create a new database called `fleetcmd`

### 1.3 Install IIS (for domain/SSL support)
1. Open **Server Manager**
2. Click **Add roles and features**
3. Select **Role-based installation**
4. Check **Web Server (IIS)**
5. In Role Services, also enable:
   - Application Request Routing (ARR)
   - URL Rewrite (or install separately from https://www.iis.net/downloads/microsoft/url-rewrite)
6. Complete installation

---

## Step 2: Download and Configure Application

### 2.1 Get the Application Code
1. From Replit, click the three-dot menu and select **Download as zip**
2. Extract to `C:\FleetCmD` on your server

### 2.2 Install Dependencies
Open PowerShell as Administrator:
```powershell
cd C:\FleetCmD
npm install
npm run build
```

### 2.3 Configure Environment Variables
Create a file named `.env` in `C:\FleetCmD` with:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/fleetcmd
SESSION_SECRET=generate-a-long-random-string-here
NODE_ENV=production
PORT=5000
```

Replace:
- `YOUR_PASSWORD` with your PostgreSQL password
- `SESSION_SECRET` with a long random string (use a password generator)

### 2.4 Initialize the Database
```powershell
cd C:\FleetCmD
npm run db:push
```

---

## Step 3: Run Application as Windows Service

### 3.1 Install NSSM (Non-Sucking Service Manager)
1. Download NSSM from https://nssm.cc/download
2. Extract to `C:\nssm`
3. Add to PATH or use full path

### 3.2 Create the Service
Open PowerShell as Administrator:
```powershell
C:\nssm\win64\nssm.exe install FleetCmD
```

In the GUI that appears:
- **Path**: `C:\Program Files\nodejs\node.exe`
- **Startup directory**: `C:\FleetCmD`
- **Arguments**: `dist/index.js`

Click the **Details** tab:
- **Display name**: FleetCmD Fleet Management
- **Startup type**: Automatic

Click the **Environment** tab:
- Add your environment variables (or they'll be read from .env file)

Click **Install service**

### 3.3 Start the Service
```powershell
nssm start FleetCmD
```

Verify it's running:
```powershell
nssm status FleetCmD
```

Test locally by opening http://localhost:5000 in a browser on the server.

---

## Step 4: Configure Your Domain (Bluehost)

### 4.1 DNS Settings in Bluehost

1. **Log in** to your Bluehost account at https://my.bluehost.com
2. Click **Domains** in the left menu
3. Select your domain name
4. Click the **DNS** tab

### 4.2 Add A Records

**For the root domain (yourdomain.com):**
1. Find existing A record for `@` or click **Add Record**
2. Configure:
   - **Host Record**: `@`
   - **Type**: A
   - **Points To**: Your Windows Server's public IP address
   - **TTL**: 14400 (default)
3. Click **Save**

**For www subdomain:**
1. Click **Add Record**
2. Configure:
   - **Host Record**: `www`
   - **Type**: A
   - **Points To**: Your Windows Server's public IP address (same as above)
   - **TTL**: 14400
3. Click **Save**

### 4.3 Verify DNS Propagation
- Changes take 1-48 hours to propagate globally
- Check status at https://www.whatsmydns.net
- Enter your domain and select "A" record type

**Note**: If you're using Bluehost email, keep the MX records unchanged.

### 4.4 Configure Windows Firewall
Open PowerShell as Administrator:
```powershell
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

---

## Step 5: Configure IIS Reverse Proxy

### 5.1 Enable Reverse Proxy in IIS
1. Open **IIS Manager**
2. Select your server in the left panel
3. Double-click **Application Request Routing**
4. Click **Server Proxy Settings** in the right panel
5. Check **Enable proxy** and click **Apply**

### 5.2 Create Website in IIS
1. In IIS Manager, right-click **Sites** → **Add Website**
2. Configure:
   - **Site name**: FleetCmD
   - **Physical path**: `C:\FleetCmD`
   - **Binding**: 
     - Type: http
     - Port: 80
     - Host name: yourdomain.com
3. Click **OK**

### 5.3 Add URL Rewrite Rule
1. Select your new site in IIS Manager
2. Double-click **URL Rewrite**
3. Click **Add Rule(s)** → **Reverse Proxy**
4. Enter: `localhost:5000`
5. Check **Enable SSL Offloading**
6. Click **OK**

Alternatively, create `web.config` in `C:\FleetCmD`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyToNode" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:5000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
    <security>
      <requestFiltering>
        <hiddenSegments>
          <add segment="node_modules" />
          <add segment=".env" />
        </hiddenSegments>
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
```

---

## Step 6: Add SSL Certificate (HTTPS)

### Option A: Using Windows Certificate Services (Domain Environment)
1. Request a certificate from your domain's Certificate Authority
2. In IIS Manager, select your site
3. Click **Bindings** → **Add**
4. Type: https, Port: 443
5. Select your SSL certificate
6. Click **OK**

### Option B: Using a Commercial Certificate
1. Purchase an SSL certificate from a provider
2. Generate a CSR in IIS Manager (Server Certificates → Create Certificate Request)
3. Submit CSR to your provider
4. Import the issued certificate in IIS
5. Add HTTPS binding as above

### Option C: Using Let's Encrypt (Free)
1. Download win-acme from https://www.win-acme.com/
2. Run as Administrator and follow prompts
3. Select your IIS site
4. Certificate will auto-renew

---

## Step 7: Test Your Deployment

1. Open a browser and go to `https://yourdomain.com`
2. Log in with default credentials:
   - **Username**: admin
   - **Password**: admin123
3. **Important**: Change the admin password immediately after first login!

---

## Maintenance

### View Logs
```powershell
nssm status FleetCmD
Get-EventLog -LogName Application -Source FleetCmD
```

### Restart Service
```powershell
nssm restart FleetCmD
```

### Update Application
1. Stop the service: `nssm stop FleetCmD`
2. Replace files in `C:\FleetCmD`
3. Run `npm install` and `npm run build`
4. Start the service: `nssm start FleetCmD`

### Backup Database
```powershell
& "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres -d fleetcmd -F c -f C:\Backups\fleetcmd_backup.dump
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Service won't start | Check Event Viewer → Windows Logs → Application |
| Database connection error | Verify DATABASE_URL in .env file |
| 502 Bad Gateway | Ensure Node app is running on port 5000 |
| SSL certificate errors | Check certificate binding in IIS |
| Domain not resolving | Wait for DNS propagation (up to 48 hours) |

---

## Security Checklist

- [ ] Changed default admin password
- [ ] SSL certificate installed and working
- [ ] Windows Firewall configured (only ports 80, 443 open)
- [ ] PostgreSQL only accessible from localhost
- [ ] Regular database backups scheduled
- [ ] Windows Updates enabled

---

For additional support, refer to:
- Node.js Documentation: https://nodejs.org/docs/
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- IIS Documentation: https://docs.microsoft.com/en-us/iis/
