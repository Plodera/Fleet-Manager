# Hosting Organization Transport Web App on Windows Server 2022

## Prerequisites

1. **Node.js** - Download and install from https://nodejs.org/ (LTS version 20.x or higher)
   - During installation, check "Add to PATH"
   - Verify: Open Command Prompt and run `node --version` and `npm --version`

2. **PostgreSQL** - Download and install from https://www.postgresql.org/download/windows/
   - Version 14+ recommended
   - During installation, set a password for the `postgres` user (remember this!)
   - Install pgAdmin (included) for database management
   - Verify: Open Command Prompt and run `psql --version`

3. **Git** (optional but recommended) - https://git-scm.com/download/win
   - For version control and easier code management

## Step 1: Extract/Download Your Code

Since you're using Replit, you have two options:

### Option A: Download from Replit
1. Go to your Replit project
2. Click the three-dot menu → "Download as zip"
3. Extract the zip file to a location like `C:\Projects\TransportApp`

### Option B: Use Git (if available)
```bash
git clone <your-repo-url>
cd TransportApp
```

## Step 2: Create PostgreSQL Database

1. Open pgAdmin (installed with PostgreSQL)
2. Right-click "Databases" → Create → Database
3. Name: `transport_app`
4. Owner: `postgres`
5. Save

**Or via Command Prompt:**
```cmd
psql -U postgres -c "CREATE DATABASE transport_app;"
```

## Step 3: Set Up Environment Variables

1. Navigate to your project folder
2. Create a `.env` file in the root directory with:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/transport_app
SESSION_SECRET=your-secret-key-change-this-to-something-random
NODE_ENV=production
PORT=5000
```

Replace `YOUR_PASSWORD` with your PostgreSQL password.

## Step 4: Install Dependencies and Build

Open Command Prompt in your project folder:

```cmd
npm install
npm run db:push
npm run build
```

- `npm install` - Downloads all required packages
- `npm run db:push` - Creates database tables and seeds sample data
- `npm run build` - Builds the frontend for production

## Step 5: Run the Application

```cmd
npm start
```

Or for development mode:
```cmd
npm run dev
```

The app will start at `http://localhost:5000`

### Default Login Credentials (from seed data):
- **Username:** admin
- **Password:** admin123

## Step 6: Set Up as Windows Service (Recommended for Production)

To run the app automatically on server startup, use **NSSM** (Non-Sucking Service Manager):

### Install NSSM:
1. Download from https://nssm.cc/download
2. Extract to a folder like `C:\nssm`
3. Open Command Prompt **as Administrator**

### Create the Service:
```cmd
cd C:\nssm\win64
nssm install TransportApp "C:\Program Files\nodejs\node.exe" "C:\Projects\TransportApp\server\index.js"
nssm set TransportApp AppDirectory C:\Projects\TransportApp
nssm set TransportApp AppEnvironmentExtra DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/transport_app SESSION_SECRET=your-secret-key
nssm start TransportApp
```

### Verify Service:
```cmd
nssm status TransportApp
```

## Step 7: Configure Firewall (if needed)

Allow port 5000 through Windows Firewall:

1. Open Windows Defender Firewall with Advanced Security
2. Click "Inbound Rules" → "New Rule"
3. Port → TCP → Specific ports (5000) → Allow
4. Apply to all profiles

## Step 8: Access the Application

- **Local network:** `http://<server-ip>:5000`
- **Remote access:** Configure port forwarding on your router if needed
- **SSL/HTTPS:** Install a reverse proxy like **Nginx** for HTTPS support

## Maintenance

### Start/Stop the Application:
```cmd
nssm start TransportApp
nssm stop TransportApp
nssm restart TransportApp
```

### View Logs:
Logs are stored in `C:\Projects\TransportApp\logs` (if configured)

### Database Backup:
```cmd
pg_dump -U postgres transport_app > backup.sql
```

### Restore Database:
```cmd
psql -U postgres transport_app < backup.sql
```

## Troubleshooting

**Port 5000 already in use:**
```cmd
netstat -ano | findstr :5000
taskkill /PID <process-id> /F
```

**Database connection error:**
- Verify PostgreSQL is running: Check Windows Services
- Verify DATABASE_URL is correct in .env
- Test connection: `psql -U postgres -c "SELECT 1;"`

**Node.js not found:**
- Verify Node.js installation: `node --version`
- Add Node.js to PATH if needed

## Optional: Nginx Reverse Proxy for HTTPS

For production, use Nginx to handle HTTPS and SSL:

1. Download Nginx for Windows from https://nginx.org/en/download.html
2. Configure as reverse proxy to localhost:5000
3. Install SSL certificate (Let's Encrypt free option available)

This provides better security and professional setup for on-premises hosting.

---

**Need help?** Check the logs in your project folder for errors.
