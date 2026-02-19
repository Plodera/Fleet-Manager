# VMS - Aisco Vehicle Management System

## Overview
A vehicle management and booking system for organizational vehicles with user authentication, booking approval workflow, and role-based access control.

## Features
- Vehicle Management: CRUD operations for vehicles
- Booking System: Reservation and scheduling with approval workflow
- Maintenance Tracking & Fuel Monitoring
- Vehicle Inspections: Equipment-specific inspections for Factory Vehicles (18 items) and Transfer Trolleys (11 items in 2 sections)
- Equipment Types Management: Admin interface for creating custom equipment types with configurable checklist items
- User Authentication with role-based access (admin, staff, customer)
- User Permissions System: Granular access control
- Analytics Dashboard
- Booking Approval Workflow: Designate approvers, bookings require approval before use
- Driver Dashboard: Dedicated view for drivers showing only their assigned trips with Start/End Trip actions
- Work Order Reports: Custom report generation with selectable fields, date/status/type filters, print and CSV export
- Configurable Maintenance Types: Admin-managed maintenance types with bilingual labels (no code changes needed)
- Bilingual Support: English/Portuguese for navigation, buttons, and status labels

## Vehicle Inspections
The system includes equipment-specific inspection checklists (`/vehicle-inspections`) with support for fully dynamic equipment types configured through admin interface.

### Dynamic Equipment Types (Admin Configurable)
Equipment types and their checklist items are fully configurable through the Equipment Types admin page (`/equipment-types`):
- **Create custom equipment types**: Add any equipment type with English/Portuguese labels
- **Configure checklist items**: Define inspection items with optional section grouping
- **Bilingual support**: Each type and item has both English and Portuguese labels
- **Section grouping**: Items can be organized into sections with headers
- **Sort order**: Control display order of types and items

### Legacy Equipment Types (Hardcoded):
1. **Factory Vehicle** (18 items): Damage check, cabin/seat condition, radiator cleaning, engine oil, coolant level, drive belt tension, air filter, intake/exhaust, tyres/wheel nuts, hydraulic oil, controls, leaks/damages, headlights, horn, mirrors, indicators, hydraulic pins, meters

2. **Transfer Trolley** (11 items in 2 sections):
   - **Generator Section** (6 items): Inspect damage, engine oil, coolant level, drive belt tension, battery voltage, generator leakage
   - **Others Section** (5 items): Hydraulic oil, hydraulic leakage, wheel condition, gearbox coupling, electrical panel

### Architecture:
- **Hybrid approach**: Legacy types use hardcoded columns for backward compatibility; new types use `checklistResults` JSONB column
- **Database tables**: `equipment_types` (id, name, labelEn, labelPt, isActive, sortOrder) and `equipment_checklist_items` (id, equipmentTypeId, key, labelEn, labelPt, section, sectionLabelEn, sectionLabelPt, sortOrder, isActive)
- **API endpoints**: `/api/equipment-types` (CRUD), `/api/equipment-types/:id/items`, `/api/equipment-checklist-items` (CRUD)

### Common Features:
- **Equipment Type Selector**: Dropdown loads from database with fallback to legacy types
- **Dynamic Checklist Loading**: Items load from database based on selected equipment type
- **Operator Selection**: Dropdown filtered to show only drivers/vehicle operators
- **Header Fields**: KM Counter, Date, Start Time, End Time
- **Comments**: Each checklist item has an optional comment field
- **Remarks**: General remarks section at the bottom
- **Bilingual**: Full English/Portuguese support including section headers
- **Access Control**: Requires view_maintenance permission
- **View Details**: Click to see full inspection report with equipment type, all checked items, section headers, and comments

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
