# AAMS - Aisco Automobile Management System

## Overview
AAMS is a comprehensive vehicle management and booking system designed for organizational fleets. It provides features for managing vehicles, tracking maintenance, handling bookings with an approval workflow, and includes robust user authentication with role-based access control. The system aims to streamline vehicle operations, improve resource allocation, and provide insights through analytics and custom reports.

## User Preferences
No specific user preferences were provided in the original document.

## System Architecture
The system utilizes a modern web stack:
- **Frontend**: React with TypeScript for a dynamic user interface, Wouter for routing, and shadcn UI for consistent and accessible components.
- **Backend**: Express.js handles API requests and business logic, with Passport.js for secure user authentication.
- **Database**: PostgreSQL serves as the primary data store, managed through the Drizzle ORM for type-safe database interactions.

**Key Architectural Patterns & Design Decisions:**
- **UI/UX**:
    - **Sidebar Navigation**: Role-based navigation with automatic hiding of irrelevant sections, simplifying the interface for different user types (e.g., drivers see a simplified view).
    - **PageHeader Component**: A reusable component (`client/src/components/PageHeader.tsx`) for consistent page titles, descriptions, and actions across the application.
    - **Dialog Pattern**: A consistent approach where dialog triggers are in PageHeader actions and dialog bodies are rendered as siblings.
- **Technical Implementations**:
    - **Role-Based Access Control (RBAC)**: Granular permissions (13 distinct permissions like `manage_vehicles`, `view_indents`) control access to features and data.
    - **Bilingual Support**: Comprehensive English and Portuguese translations across all major UI elements and data labels, with language preference saved to `localStorage`.
    - **Dynamic Configuration**:
        - **Equipment Types**: Admin-configurable equipment types and checklist items for inspections, allowing for flexible and extensible inspection processes. Supports bilingual labels and section grouping.
        - **Vehicle Types**: Admin-configurable vehicle type groups that influence booking availability and filtering in other modules.
        - **Maintenance Types**: Admin-managed maintenance types with bilingual labels and options to disable activity types.
    - **Workflow Management**:
        - **Booking Approval Workflow**: Bookings require approval by designated approvers.
        - **Purchase Request (PR) Workflow**: A requisition system with auto-generated PR numbers, status tracking, dynamic line items, and department-based approval.
    - **Dedicated Dashboards**:
        - **Driver Dashboard**: A simplified view for drivers to manage their assigned trips with "Start Trip" and "End Trip" actions.
        - **TV Dashboard System**: Multi-department display system with configurable KPIs, video playback, animated transitions, and full-screen dark theme.
        - **IT Operations Dashboard & Network Monitor**: Full-screen dark display for IT infrastructure monitoring, including internet link status, device type summaries, KPIs, and real-time data.
    - **Status Tracking**: A system for tracking items with expiry dates (e.g., fire extinguishers) with email alert rules and a dedicated UI for management.
- **Feature Specifications**:
    - **Vehicle Management**: CRUD operations, filtering, and search.
    - **Booking System**: Reservation, scheduling, and approval.
    - **Maintenance Tracking & Fuel Monitoring**: Full CRUD for work orders.
    - **Vehicle Inspections**: Equipment-specific checklists, both hardcoded and dynamically configurable.
    - **User Authentication**: Admin, staff, and customer roles.
    - **Analytics Dashboard**: Overview of key metrics.
    - **Work Order Reports**: Customizable reports with detailed and summary modes, exportable to Excel, PDF, and Print.
    - **Email Notifications**: SMTP-configured notifications for booking status changes and tracker alerts.

## Steel Production KPI Module
- **Webhook Receivers**: Three public POST endpoints (`/api/production/webhook/rolling-mill`, `/api/production/webhook/sms`, `/api/production/webhook/ccm`) accept Power Automate payloads with key:value formatted text. Each validates an optional shared secret via `Authorization: Bearer <token>` or `?token=` query param.
- **Data Parsed**: Rolling Mill (tons, billets taken/rolled, miss roll, coble cut, hot out, breakdown minutes); SMS (heat no, start/taping times, tap-to-tap, temperatures, kWh, F/C C tons, remarks); CCM (incharge, heat no, billets, strands, mould life, ladle, tundish, sequence).
- **Admin Config** (`/production-config`): Manage per-section webhook secrets and enable/disable state. Displays full webhook URL with copy button and Power Automate setup guide.
- **Production Dashboard** (`/production`): KPI cards (today/MTD for tons, heats, kWh, billets), 30-day bar charts for each section, and paginated report tables (tabs for Rolling Mill/SMS/CCM).
- **Database Tables**: `steel_production_settings`, `rolling_mill_reports`, `sms_reports`, `ccm_reports` (created directly via psql since drizzle-kit push is interactive).
- **Routes**: Admin-only for settings CRUD; authenticated for report lists and KPI summary.

## External Dependencies
- **PostgreSQL**: Primary database.
- **GLPI Helpdesk**: Integration to pull ticket counts into the IT Dashboard. Requires GLPI base URL, Application Token, and User API Token.
- **FortiGate Firewall**: Integration to poll firewall REST API for bandwidth data (TX/RX byte counters) and display on the IT Dashboard. Requires FortiGate host, port, Bearer API token, and interface selection.
- **SMTP Server**: For sending email notifications. Configurable via admin settings.