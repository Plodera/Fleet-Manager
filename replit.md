# FleetCmD - Aisco Transport Mgmt

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
See `DEPLOYMENT_GUIDE.md` for step-by-step instructions to deploy on Windows Server 2022 with IIS and your own domain.
