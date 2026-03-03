# AAMS - Fleet Management System
# User Manual

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Vehicles](#3-vehicles)
4. [Bookings](#4-bookings)
5. [Shared Rides](#5-shared-rides)
6. [Maintenance](#6-maintenance)
7. [Vehicle Inspections](#7-vehicle-inspections)
8. [Work Orders](#8-work-orders)
9. [Work Order Reports](#9-work-order-reports)
10. [Fuel Logs](#10-fuel-logs)
11. [Reports](#11-reports)
12. [Driver Dashboard](#12-driver-dashboard)
13. [User Management](#13-user-management)
14. [Work Order Configuration](#14-work-order-configuration)
15. [Equipment Types](#15-equipment-types)
16. [Settings](#16-settings)
17. [Language Switching](#17-language-switching)
18. [User Roles & Permissions](#18-user-roles--permissions)
19. [Troubleshooting](#19-troubleshooting)

---

## 1. Getting Started

### Logging In

1. Open your browser and go to the application URL (e.g., `http://192.168.11.249:5000`)
2. Enter your **Username** and **Password**
3. Click **Login**

If you don't have an account, contact your system administrator to create one.

### Navigation

The sidebar on the left is your main navigation. It is organized into four sections:

- **Overview**: Dashboard and Driver Dashboard
- **Fleet Management**: Vehicles, Bookings, Shared Rides
- **Operations**: Maintenance, Inspections, Work Orders, Work Order Reports, Fuel Logs, Reports
- **Administration**: Users, Settings, Equipment Types, Work Order Config

> **Note:** You will only see pages you have permission to access. Drivers see a simplified sidebar with only Dashboard and My Trips.

---

## 2. Dashboard

The Dashboard gives you a quick overview of your entire fleet.

### What You'll See

- **Total Vehicles**: The number of vehicles in your fleet
- **Vehicles In Use**: How many vehicles are currently being used
- **Pending Maintenance**: Vehicles that need servicing
- **Pending Approvals**: Booking requests waiting for approval

### Charts & Analytics

- **Fuel Costs by Vehicle**: Bar chart showing fuel spending per vehicle
- **Vehicle Status Distribution**: Pie chart showing how many vehicles are available, in use, or in maintenance
- **Booking Completion Rate**: How many bookings are being completed vs. cancelled
- **Recent Activity**: The latest booking requests and status changes

---

## 3. Vehicles

Manage your entire vehicle fleet from this page.

### Viewing Vehicles

- All vehicles are displayed in a grid with key information: make, model, year, mileage, license plate, and status
- **Status badges** show if a vehicle is Available, In Use, or In Maintenance
- **Overdue alerts** appear on vehicles that haven't been returned on time

### Adding a New Vehicle

1. Click the **Add Vehicle** button (top right)
2. Fill in the form:
   - **Make**: Vehicle manufacturer (e.g., Toyota)
   - **Model**: Vehicle model (e.g., Hilux)
   - **Year**: Manufacturing year
   - **License Plate**: The vehicle's registration number (must be unique)
   - **VIN**: Vehicle Identification Number (must be unique)
   - **Category**: Car, Van, Bus, or Truck
   - **Capacity**: Number of passengers
   - **Mileage**: Current odometer reading (in km)
3. Click **Save**

### Editing a Vehicle

1. Click on a vehicle card to open its details
2. Click **Edit**
3. Update the information
4. Click **Save**

### Deleting a Vehicle

1. Click on the vehicle card
2. Click **Delete**
3. Confirm the deletion

> **Warning:** Deleting a vehicle is permanent and cannot be undone.

---

## 4. Bookings

The Bookings page lets you reserve vehicles and manage the approval process.

### Creating a New Booking

1. Go to **Bookings** in the sidebar
2. Click the **New Booking** button (top right)
3. Fill in the booking form:
   - **Vehicle**: Select which vehicle you want to book
   - **Start Odometer**: Enter the current odometer reading (km)
   - **Start Date/Time**: When you need the vehicle
   - **End Date/Time**: When you will return it
   - **Destination**: Where you are going
   - **Purpose**: The reason for the trip
   - **Number of Passengers**: How many people will travel
   - **Drive Type**: Type of drive (local, long distance, etc.)
   - **Approver**: Select who should approve this booking
4. Click **Save** to submit your request

### Booking Statuses

| Status | Meaning |
|--------|---------|
| **Pending** | Waiting for the approver to review |
| **Approved** | Approved and ready to use |
| **In Use** | Vehicle is currently on a trip |
| **Completed** | Trip is finished, vehicle returned |
| **Rejected** | The booking was declined |
| **Cancelled** | You cancelled the booking |

### For Approvers: Reviewing Bookings

1. You will see pending bookings with an **Approve** and **Reject** option
2. Click **Approve** to approve the booking
   - You can optionally assign a driver at this point
3. Click **Reject** to decline the booking
   - Add a reason for the rejection

### Cancelling a Booking

1. Open your booking
2. Click **Cancel Booking**
3. Confirm the cancellation

> **Note:** You can only cancel bookings that are still in "Pending" status.

### Filtering Bookings

- Use the **status filter** to show only Pending, Approved, Overdue, etc.
- Use the **month filter** to view bookings for a specific month
- Overdue bookings are highlighted for easy identification

### Marking a Vehicle as Available

After a trip is completed, approvers can mark "In Use" vehicles as available again:
1. Find the booking with "In Use" status
2. Click **Mark Available**

---

## 5. Shared Rides

Shared Rides allow multiple staff to share a vehicle for common routes.

### Creating a Shared Trip

1. Go to **Shared Rides** in the sidebar
2. Click **Create Shared Trip**
3. Select a vehicle (only vehicles with capacity > 5 are available)
4. Enter the trip details: destination, date, time
5. Click **Create**

### Joining a Shared Trip

1. Browse available shared trips on the page
2. Click **Join Trip** on a trip that has available seats
3. Enter your passenger information
4. Click **Join**

### Seat Visualization

- Each trip shows a visual seat map
- Occupied seats are shown in color with passenger names
- Empty seats are shown as available

### Printing a Manifest

Click the **Print** button on a shared trip to generate a printable passenger list for the driver.

---

## 6. Maintenance

Track all vehicle maintenance and repairs.

### Logging Maintenance

1. Go to **Maintenance** in the sidebar
2. Click **Add Maintenance Record**
3. Fill in:
   - **Vehicle**: Which vehicle was serviced
   - **Service Type**: Select from configured maintenance types (e.g., Oil Change, Brake Service)
   - **Date**: When the service was performed
   - **Cost**: Total cost in Kwanza (Kz)
   - **Mechanic**: Who performed the service
   - **Notes**: Additional details
4. Click **Save**

### Viewing History

- All maintenance records are displayed in a searchable table
- You can filter by vehicle, type, or date
- Click on a record to see full details

---

## 7. Vehicle Inspections

Perform daily safety and condition checks on vehicles and equipment.

### Creating an Inspection

1. Go to **Inspections** in the sidebar
2. Click **New Inspection**
3. Fill in the header:
   - **Vehicle**: Select the vehicle or equipment
   - **Equipment Type**: Choose the type (Factory Vehicle, Transfer Trolley, or custom type)
   - **Operator**: Select the operator/driver performing the inspection
   - **KM Counter**: Current odometer reading
   - **Date**: Inspection date
   - **Start Time / End Time**: When the inspection was performed
4. Complete the **Checklist**:
   - Check each item that passes inspection
   - Add comments for any issues found
5. Add any general **Remarks** at the bottom
6. Click **Save**

### Equipment Types

The checklist changes depending on the equipment type selected:

- **Factory Vehicle**: 18 checklist items covering damage, engine, brakes, lights, etc.
- **Transfer Trolley**: 11 items in two sections (Generator and Others)
- **Custom Types**: Additional types can be configured by the admin

### Viewing Past Inspections

- Click on any inspection in the list to see the full report
- The report shows which items were checked, any comments, and general remarks

---

## 8. Work Orders

Create and manage detailed maintenance work orders.

### Creating a Work Order

1. Go to **Work Orders** in the sidebar
2. Click **New Work Order**
3. Fill in:
   - **Vehicle/Equipment**: Select the vehicle needing work
   - **Maintenance Type**: Select the type (configured by admin)
   - **Shift**: Select the work shift (if applicable)
   - **Date**: Date of the work order
4. Add **Work Items** (you can add multiple):
   - **Sub Equipment**: Select the specific part/component
   - **Activity Type**: Select what type of activity is being performed
   - **Start Time**: When work begins on this item
   - **End Time**: When work finishes
   - **Descriptions**: Add one or more description lines for this item
5. Click **Save**

### Job Number

- A **Job Number** (e.g., JOB-0001) is automatically assigned by the system
- You do not need to enter it — it is generated when you save
- Job numbers are sequential and unique

### Work Order Statuses

| Status | Meaning |
|--------|---------|
| **Open** | Newly created, work hasn't started |
| **In Progress** | Work is being performed |
| **Completed** | All work is finished |

### Updating a Work Order

1. Click on a work order in the list
2. Click **Edit**
3. Update the status, add/remove work items, or modify details
4. Click **Save**

### Deleting a Work Order

You can only delete work orders that you created.

---

## 9. Work Order Reports

Generate custom reports from your work order data.

### How to Generate a Report

1. Go to **Work Order Reports** in the sidebar
2. On the left panel, **Select Fields** to include:
   - Check/uncheck the fields you want in your report
   - Options: Job No., Date, Equipment, Equipment No., Maintenance Type, Shift, Status, Created By, Work Item Count, Sub Equipment, Activity Type, Description, Start Time, End Time
   - Use **Select All** or **Deselect All** for quick selection
3. Set **Filters** (optional):
   - **Date From / Date To**: Filter by date range
   - **Status**: Show only Open, In Progress, or Completed
   - **Maintenance Type**: Filter by specific type
4. Click **Generate Report**

### Printing the Report

1. Generate the report first
2. Click the **Print** button
3. A print-friendly version opens in a new window
4. Use your browser's print function (Ctrl+P)

### Exporting to CSV

1. Generate the report first
2. Click the **Export CSV** button
3. A CSV file will download automatically
4. Open it in Excel or any spreadsheet application

---

## 10. Fuel Logs

Track fuel consumption and costs for your fleet.

### Adding a Fuel Record

1. Go to **Fuel Logs** in the sidebar
2. Click **Add Fuel Record**
3. Fill in:
   - **Vehicle**: Which vehicle was refueled
   - **Date**: When it was refueled
   - **Litres**: Amount of fuel in litres
   - **Price per Litre**: Cost per litre in Kwanza
   - **Total Cost**: Automatically calculated (or enter manually)
   - **Odometer**: Current odometer reading (km)
   - **Notes**: Additional details (gas station, receipt number, etc.)
4. Click **Save**

### Viewing Fuel History

- All fuel records are listed in a table
- You can filter by vehicle or date range
- See total spending and consumption patterns

---

## 11. Reports

View analytics and insights about your fleet operations.

### Available Reports

- **Monthly Booking Trends**: See how many bookings are made each month
- **Vehicle Utilization**: Which vehicles are used most frequently
- **Cost Analysis**: Breakdown of fuel vs. maintenance spending
- **Most Frequent Destinations**: Popular trip destinations
- **Fleet Overview**: Summary statistics for the entire fleet

---

## 12. Driver Dashboard

A dedicated view for drivers to manage their assigned trips.

### Who Can Access

Only users marked as **Drivers** in the system can access this page.

### What You'll See

- Only trips where you are the **assigned driver**
- Only trips with **Approved** or **In Progress** status

### Starting a Trip

1. Find your assigned trip in the list
2. Click **Start Trip**
3. Enter the **starting odometer reading** (km)
4. Click **Confirm**
5. The trip status changes to "In Progress"

### Ending a Trip

1. Find your active trip (showing "In Progress")
2. Click **End Trip**
3. Enter the **ending odometer reading** (km)
4. Click **Confirm**
5. The trip status changes to "Completed"

> **Important:** Always enter accurate odometer readings. These are used for mileage tracking and fuel efficiency calculations.

---

## 13. User Management

Manage system users and their permissions. (Admin only)

### Adding a New User

1. Go to **Users** in the sidebar
2. Click **Add User**
3. Fill in:
   - **Full Name**: The user's name
   - **Username**: Login username
   - **Password**: Initial password
   - **Email**: User's email address
   - **Role**: Admin, Staff, or Customer
   - **Department**: The user's department
   - **Is Driver**: Check if this user will be assigned as a vehicle driver
   - **Is Approver**: Check if this user can approve bookings
4. Click **Save**

### Setting Permissions

Each user can be given specific permissions:

| Permission | Description |
|-----------|-------------|
| Manage Vehicles | Add, edit, delete vehicles |
| View Reports | Access the Reports page |
| Manage Bookings | Create and manage bookings |
| Manage Maintenance | Add maintenance records |
| View Maintenance | View maintenance and inspections |
| Manage Users | Add and edit users (Admin) |
| Manage Settings | Access system settings |
| Manage Fuel | Add fuel records |
| View Fuel | View fuel log |
| View Dashboard | Access the Dashboard |
| View Bookings | View booking list |
| View Work Orders | View work orders |

### Editing a User

1. Click on a user in the list
2. Click **Edit**
3. Update their information or permissions
4. Click **Save**

---

## 14. Work Order Configuration

Configure the options available in Work Orders. (Admin only)

### Maintenance Types

These are the categories of maintenance work:

1. Go to **Work Order Config** in the sidebar
2. Under **Maintenance Types**, click **Add**
3. Enter:
   - **Name**: Internal identifier
   - **English Label**: Display name in English
   - **Portuguese Label**: Display name in Portuguese
4. Click **Save**

### Shifts

Define work shifts for your maintenance team:

1. Under **Shifts**, click **Add**
2. Enter the shift name, start time, and end time
3. Click **Save**

### Sub Equipment

Define the specific components/parts that can be worked on:

1. Under **Sub Equipment**, click **Add**
2. Enter the component name with English and Portuguese labels
3. Click **Save**

### Activity Types

Define the types of activities that can be performed:

1. Under **Activity Types**, click **Add**
2. Enter the activity name with English and Portuguese labels
3. Click **Save**

---

## 15. Equipment Types

Configure custom equipment types for vehicle inspections. (Admin only)

### Adding an Equipment Type

1. Go to **Equipment Types** in the sidebar
2. Click **Add Equipment Type**
3. Enter:
   - **Name**: Internal identifier
   - **English Label**: Display name in English
   - **Portuguese Label**: Display name in Portuguese
4. Click **Save**

### Adding Checklist Items

1. Select an equipment type
2. Click **Add Checklist Item**
3. Enter:
   - **Key**: Unique identifier for this item
   - **English Label**: Item name in English
   - **Portuguese Label**: Item name in Portuguese
   - **Section** (optional): Group items under section headers
4. Set the **Sort Order** to control display position
5. Click **Save**

---

## 16. Settings

Configure system-wide settings. (Admin only)

### Email Notifications

To enable email notifications for booking approvals:

1. Go to **Settings** in the sidebar
2. Configure SMTP settings:
   - **SMTP Host**: Your email server address
   - **SMTP Port**: Usually 587 (TLS) or 465 (SSL)
   - **Username**: Email account username
   - **Password**: Email account password
   - **From Name**: Name that appears in emails
   - **From Email**: Email address that sends notifications
3. **Enable** the email notifications toggle
4. Click **Send Test Email** to verify the configuration
5. Click **Save**

### When Are Emails Sent?

- **New Booking**: The assigned approver receives a notification
- **Booking Approved**: The person who made the booking is notified
- **Booking Rejected**: The person who made the booking is notified

---

## 17. Language Switching

The system supports **English** and **Portuguese**.

### How to Switch Language

1. Look at the bottom of the sidebar
2. Click **EN** for English or **PT** for Portuguese
3. The entire interface switches immediately
4. Your language preference is saved automatically

---

## 18. User Roles & Permissions

### Roles

| Role | Description |
|------|-------------|
| **Admin** | Full access to all features, user management, and settings |
| **Staff** | Access to operational features based on assigned permissions |
| **Customer** | Limited access, primarily for booking vehicles |

### Special Designations

- **Driver**: Can access the Driver Dashboard and be assigned to trips
- **Approver**: Can approve or reject booking requests

### Permission-Based Access

The sidebar automatically hides pages you don't have permission to access. If you need access to additional features, contact your system administrator.

---

## 19. Troubleshooting

### I can't log in
- Check that your username and password are correct
- Contact your administrator to reset your password

### I can't see certain pages
- Your account may not have the required permissions
- Ask your administrator to grant the necessary permissions

### My booking is stuck on "Pending"
- The approver may not have reviewed it yet
- Contact your approver directly or ask your administrator

### The page shows a loading spinner that never stops
- Try refreshing the page (F5 or Ctrl+R)
- Clear your browser cache (Ctrl+Shift+Delete)
- If the problem persists, contact your system administrator

### I can't create a work order
- Make sure you have the "View Work Orders" permission
- Ensure that Maintenance Types, Shifts, and Sub Equipment are configured in Work Order Config

### Email notifications aren't working
- Check the SMTP settings in the Settings page
- Use "Send Test Email" to verify the configuration
- Make sure email notifications are enabled

---

**AAMS Fleet Management System**
*Version 1.0 | Aisco Automobile Management System*
