# AAMS - Aisco Automobile Management System

## Overview
AAMS is a comprehensive vehicle management and booking system designed for organizational use. It provides robust features for managing a fleet of vehicles, streamlining booking processes with an approval workflow, and ensuring secure access through role-based authentication. The system aims to optimize organizational vehicle utilization, track maintenance, monitor fuel, and facilitate efficient operations.

## User Preferences
I prefer clear, concise summaries for all information. When making changes, please prioritize modular and reusable components. I value an iterative development approach and would like to be consulted before any major architectural decisions or significant code refactoring. Do not make changes to files within the `server/services` directory without explicit instruction.

## System Architecture
The system is built with a modern web stack:
- **Frontend**: React with TypeScript, utilizing Wouter for routing and shadcn UI for a consistent design system. UI components are designed for reusability, such as the `PageHeader` and a consistent dialog pattern.
- **Backend**: Express.js handles API requests and server-side logic, secured with Passport.js for authentication.
- **Database**: PostgreSQL serves as the primary data store, managed through Drizzle ORM for type-safe database interactions.
- **UI/UX Decisions**:
    - **Sidebar Navigation**: Role-based access dictates sidebar visibility, ensuring a tailored user experience (e.g., simplified view for drivers).
    - **Consistent Design**: Reusable `PageHeader` component and a standardized dialog pattern are used across the application for a cohesive user interface.
    - **Bilingual Support**: Comprehensive English and Portuguese translations are integrated throughout the system, covering navigation, forms, statuses, and dynamic content.
- **Core Features**:
    - **Vehicle Management**: CRUD operations, filtering, and search functionalities for the vehicle fleet.
    - **Booking System**: Reservations with an approval workflow and driver assignment.
    - **Maintenance & Fuel Tracking**: Work order management, maintenance type configuration, and detailed reporting.
    - **Vehicle Inspections**: Equipment-specific checklists, with support for both hardcoded and dynamic, admin-configurable equipment types and checklist items.
    - **User Authentication & Permissions**: Role-based access control (admin, staff, customer) with granular permissions.
    - **Driver Dashboard**: Dedicated interface for drivers to manage their assigned trips.
    - **Purchase Requests (PR)**: Workflow for requisitions with approval, dynamic line items, and department-based approval.
    - **TV Dashboard System**: Configurable multi-department displays for KPIs and video content, with various layout and animation options.
    - **Status Tracker & Notifications**: System for tracking items with expiry dates, generating email alerts, and managing notification rules.
    - **IT Operations Dashboard & Network Monitor**: Real-time monitoring of IT infrastructure, including ICMP ping, device status, and integrated GLPI and FortiGate data.
- **Deployment**: Optimized for Ubuntu with PM2 and Nginx, with guides for Windows Server 2022 (IIS) and Replit cloud deployment.
- **Database Driver Auto-detection**: The application intelligently selects the appropriate PostgreSQL driver based on the `DATABASE_URL` (local `pg` driver vs. cloud `@neondatabase/serverless`).

## External Dependencies
- **PostgreSQL**: Primary database for all application data.
- **GLPI Helpdesk**: Integration for pulling ticket counts into the IT Operations Dashboard. Requires GLPI base URL, Application Token, and User API Token.
- **FortiGate Firewall**: Integration for polling bandwidth data (TX/RX byte counters) from FortiGate firewall REST API into the IT Operations Dashboard. Requires host URL, port, and Bearer API token.
- **SMTP Service**: For sending email notifications (e.g., booking approvals, status changes). Configurable via admin settings.