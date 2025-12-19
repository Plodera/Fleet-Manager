# Organization Transport Web App

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
The system logs email notifications to the console. When an email integration is connected:
- New booking notifications are sent to the assigned approver
- Status change notifications are sent to the requester when approved/rejected

Currently using console logging. To enable real email sending:
1. Set up an email integration (Resend, SendGrid, etc.)
2. Update `server/email.ts` to use the email service API

## Architecture
- **Frontend**: React with TypeScript, Wouter routing, shadcn UI
- **Backend**: Express.js with Passport.js authentication
- **Database**: PostgreSQL with Drizzle ORM

## Running the Project
- Workflow `Start application` runs `npm run dev` which starts Express + Vite

## Default Test Credentials
- Username: admin
- Password: admin123
