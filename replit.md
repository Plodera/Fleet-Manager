# VMS - Aisco Vehicle Management System

## Overview
A fleet management and booking system for organizational vehicles with user authentication, booking approval workflow, and role-based access control.

## Features
- Vehicle Management: CRUD operations for fleet vehicles
- Booking System: Reservation and scheduling with approval workflow
- Maintenance Tracking & Fuel Monitoring
- User Authentication with role-based access (admin, staff, customer)
- User Permissions System: Granular access control
- Analytics Dashboard
- Booking Approval Workflow: Designate approvers, bookings require approval before use
- Driver Dashboard: Dedicated view for drivers showing only their assigned trips with Start/End Trip actions
- Bilingual Support: English/Portuguese for navigation, buttons, and status labels

## Driver Dashboard
Drivers have a dedicated dashboard (`/driver-dashboard`) that shows only their assigned trips:
- **Restricted Access**: Only users marked as drivers can access this page
- **Simplified Navigation**: Drivers only see Dashboard and My Trips in the sidebar (Vehicles, Bookings, and other pages are hidden)
- **Assigned Trips View**: Shows only trips where the driver is assigned with approved or in-progress status
- **Trip Actions**: Start Trip (with odometer input) and End Trip (with odometer input)
- **Bilingual Support**: Full English/Portuguese translations

## Bilingual Support
The system supports comprehensive English and Portuguese translations across all major pages:

### Translation Coverage:
- **Navigation**: All sidebar menu items (Dashboard, Vehicles, Bookings, Shared Rides, etc.)
- **Buttons**: Save, Cancel, Delete, Edit, Approve, Reject, Start Trip, End Trip, Export, etc.
- **Status Badges**: Pending, Approved, In Progress, Completed, Available, In Use, etc.
- **Dashboard**: All cards, charts, and overview sections
- **Vehicles Page**: Page title/subtitle, form labels (make, model, year, mileage, license plate, VIN, category, capacity), dialog titles, category options (Car, Van, Bus, Truck), search placeholder, empty states
- **Bookings Page**: Page title/subtitle, all form fields (vehicle, odometer, times, destination, purpose, passengers, drive type, approver), cancel/approve dialogs, driver assignment interface
- **Shared Rides Page**: Page title/subtitle, create/join trip forms, seat visualization, trip cards, passenger information fields, status messages

### Translation Keys Structure:
- `t.nav.*` - Navigation items
- `t.buttons.*` - Common button labels
- `t.status.*` - Status badge labels
- `t.labels.*` - Common labels
- `t.dashboard.*` - Dashboard page
- `t.vehicles.*` - Vehicles page (80+ keys)
- `t.bookings.*` - Bookings page (40+ keys)
- `t.sharedRides.*` - Shared Rides page (30+ keys)
- `t.driverDashboard.*` - Driver Dashboard page (20+ keys)

Language selection is available in the sidebar footer and preference is saved to localStorage.

## Email Notifications
The system supports SMTP email notifications configured through the Settings page (admin only):
- New booking notifications are sent to the assigned approver
- Status change notifications are sent to the requester when approved/rejected

To enable email notifications:
1. Log in as admin and navigate to Settings
2. Configure SMTP settings (host, port, username, password)
3. Set the "From" name and email address
4. Enable email notifications with the toggle
5. Use "Send Test Email" to verify configuration

When disabled, emails are logged to the console instead.

## Architecture
- **Frontend**: React with TypeScript, Wouter routing, shadcn UI
- **Backend**: Express.js with Passport.js authentication
- **Database**: PostgreSQL with Drizzle ORM

## Running the Project
- Workflow `Start application` runs `npm run dev` which starts Express + Vite

## Default Test Credentials
- Username: admin
- Password: admin123

## Deployment
- **Ubuntu (Recommended)**: See `UBUNTU_DEPLOYMENT.md` for Ubuntu Server deployment with PM2 and Nginx
- **Windows**: See `DEPLOYMENT_GUIDE.md` for Windows Server 2022 with IIS (more complex)
- **Replit**: Click "Deploy" button for instant cloud deployment

## Database Driver
The app auto-detects local PostgreSQL (localhost/127.0.0.1 in DATABASE_URL) and uses the appropriate driver:
- Local PostgreSQL: Uses `pg` driver
- Cloud/Neon: Uses `@neondatabase/serverless` driver
