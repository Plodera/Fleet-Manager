import { z } from 'zod';
import { 
  insertUserSchema, 
  insertVehicleSchema, 
  insertBookingSchema, 
  insertMaintenanceSchema, 
  insertFuelSchema,
  insertDepartmentSchema,
  insertSharedTripSchema,
  insertVehicleInspectionSchema,
  insertEquipmentTypeSchema,
  insertEquipmentChecklistItemSchema,
  insertMaintenanceTypeConfigSchema,
  insertShiftSchema,
  insertActivityTypeSchema,
  insertSubEquipmentSchema,
  insertWorkOrderSchema,
  insertWorkOrderItemSchema,
  users,
  vehicles,
  bookings,
  maintenanceRecords,
  fuelRecords,
  departments,
  sharedTrips,
  vehicleInspections,
  equipmentTypes,
  equipmentChecklistItems,
  maintenanceTypeConfig,
  shifts,
  activityTypes,
  subEquipment,
  workOrders,
  workOrderItems,
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  })
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.void(),
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  vehicles: {
    list: {
      method: 'GET' as const,
      path: '/api/vehicles',
      responses: {
        200: z.array(z.custom<typeof vehicles.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/vehicles/:id',
      responses: {
        200: z.custom<typeof vehicles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/vehicles',
      input: insertVehicleSchema,
      responses: {
        201: z.custom<typeof vehicles.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/vehicles/:id',
      input: insertVehicleSchema.partial(),
      responses: {
        200: z.custom<typeof vehicles.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/vehicles/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  bookings: {
    list: {
      method: 'GET' as const,
      path: '/api/bookings',
      responses: {
        200: z.array(z.custom<typeof bookings.$inferSelect & { vehicle: typeof vehicles.$inferSelect; user: typeof users.$inferSelect; approver?: typeof users.$inferSelect }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/bookings',
      input: insertBookingSchema,
      responses: {
        201: z.custom<typeof bookings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/bookings/:id',
      input: insertBookingSchema.partial(),
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    updateStatus: {
      method: 'PUT' as const,
      path: '/api/bookings/:id/status',
      input: z.object({ 
        status: z.enum(['pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled']),
        cancellationReason: z.string().optional(),
        driverId: z.number().optional().nullable()
      }),
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    endTrip: {
      method: 'PUT' as const,
      path: '/api/bookings/:id/end-trip',
      input: z.object({}),
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  approvers: {
    list: {
      method: 'GET' as const,
      path: '/api/approvers',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
  },
  drivers: {
    list: {
      method: 'GET' as const,
      path: '/api/drivers',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
  },
  maintenance: {
    list: {
      method: 'GET' as const,
      path: '/api/maintenance',
      responses: {
        200: z.array(z.custom<typeof maintenanceRecords.$inferSelect & { vehicle: typeof vehicles.$inferSelect }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/maintenance',
      input: insertMaintenanceSchema,
      responses: {
        201: z.custom<typeof maintenanceRecords.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  fuel: {
    list: {
      method: 'GET' as const,
      path: '/api/fuel',
      responses: {
        200: z.array(z.custom<typeof fuelRecords.$inferSelect & { vehicle: typeof vehicles.$inferSelect }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/fuel',
      input: insertFuelSchema,
      responses: {
        201: z.custom<typeof fuelRecords.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/users',
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    updateRole: {
      method: 'PUT' as const,
      path: '/api/users/:id/role',
      input: z.object({ role: z.enum(['admin', 'staff', 'customer']) }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    updatePermissions: {
      method: 'PUT' as const,
      path: '/api/users/:id/permissions',
      input: z.object({ permissions: z.array(z.string()) }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    updateApprover: {
      method: 'PUT' as const,
      path: '/api/users/:id/approver',
      input: z.object({ isApprover: z.boolean() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    updateDriver: {
      method: 'PUT' as const,
      path: '/api/users/:id/driver',
      input: z.object({ isDriver: z.boolean() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    updatePassword: {
      method: 'PUT' as const,
      path: '/api/users/:id/password',
      input: z.object({ password: z.string().min(6, "Password must be at least 6 characters") }),
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    updateEmail: {
      method: 'PUT' as const,
      path: '/api/users/:id/email',
      input: z.object({ email: z.string().email("Invalid email address") }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    updateProfile: {
      method: 'PUT' as const,
      path: '/api/users/:id/profile',
      input: z.object({ 
        username: z.string().min(3, "Username must be at least 3 characters").optional(),
        fullName: z.string().min(2, "Full name must be at least 2 characters").optional()
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/users/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  departments: {
    list: {
      method: 'GET' as const,
      path: '/api/departments',
      responses: {
        200: z.array(z.custom<typeof departments.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/departments',
      input: insertDepartmentSchema,
      responses: {
        201: z.custom<typeof departments.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/departments/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  sharedTrips: {
    list: {
      method: 'GET' as const,
      path: '/api/shared-trips',
      responses: {
        200: z.array(z.custom<typeof sharedTrips.$inferSelect & { vehicle: typeof vehicles.$inferSelect; approver: typeof users.$inferSelect; passengers: Array<{ booking: typeof bookings.$inferSelect; user: typeof users.$inferSelect }> }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/shared-trips/:id',
      responses: {
        200: z.custom<typeof sharedTrips.$inferSelect & { vehicle: typeof vehicles.$inferSelect; approver: typeof users.$inferSelect; passengers: Array<{ booking: typeof bookings.$inferSelect; user: typeof users.$inferSelect }> }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/shared-trips',
      input: z.object({
        vehicleId: z.coerce.number().positive("Vehicle is required"),
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
        destination: z.string().min(1, "Destination is required"),
        notes: z.string().nullable().optional(),
      }),
      responses: {
        201: z.custom<typeof sharedTrips.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    join: {
      method: 'POST' as const,
      path: '/api/shared-trips/:id/join',
      input: z.object({ 
        passengerCount: z.coerce.number().min(1),
        purpose: z.string().min(1),
        passengerName: z.string().min(1, "Name is required"),
        passengerPhone: z.string().min(1, "Phone number is required"),
      }),
      responses: {
        201: z.custom<typeof bookings.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    updateStatus: {
      method: 'PUT' as const,
      path: '/api/shared-trips/:id/status',
      input: z.object({ status: z.enum(['open', 'full', 'in_progress', 'completed', 'cancelled']) }),
      responses: {
        200: z.custom<typeof sharedTrips.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/shared-trips/:id',
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    report: {
      method: 'GET' as const,
      path: '/api/shared-trips/report',
      responses: {
        200: z.array(z.any()),
      },
    },
  },
  vehicleInspections: {
    list: {
      method: 'GET' as const,
      path: '/api/vehicle-inspections',
      responses: {
        200: z.array(z.custom<typeof vehicleInspections.$inferSelect & { vehicle: typeof vehicles.$inferSelect; operator: typeof users.$inferSelect }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/vehicle-inspections/:id',
      responses: {
        200: z.custom<typeof vehicleInspections.$inferSelect & { vehicle: typeof vehicles.$inferSelect; operator: typeof users.$inferSelect }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/vehicle-inspections',
      input: insertVehicleInspectionSchema,
      responses: {
        201: z.custom<typeof vehicleInspections.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/vehicle-inspections/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  equipmentTypes: {
    list: {
      method: 'GET' as const,
      path: '/api/equipment-types',
      responses: {
        200: z.array(z.custom<typeof equipmentTypes.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/equipment-types/:id',
      responses: {
        200: z.custom<typeof equipmentTypes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/equipment-types',
      input: insertEquipmentTypeSchema,
      responses: {
        201: z.custom<typeof equipmentTypes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/equipment-types/:id',
      input: insertEquipmentTypeSchema.partial(),
      responses: {
        200: z.custom<typeof equipmentTypes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/equipment-types/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    listItems: {
      method: 'GET' as const,
      path: '/api/equipment-types/:id/items',
      responses: {
        200: z.array(z.custom<typeof equipmentChecklistItems.$inferSelect>()),
      },
    },
  },
  equipmentChecklistItems: {
    create: {
      method: 'POST' as const,
      path: '/api/equipment-checklist-items',
      input: insertEquipmentChecklistItemSchema,
      responses: {
        201: z.custom<typeof equipmentChecklistItems.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/equipment-checklist-items/:id',
      input: insertEquipmentChecklistItemSchema.partial(),
      responses: {
        200: z.custom<typeof equipmentChecklistItems.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/equipment-checklist-items/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  maintenanceTypeConfigs: {
    list: { method: 'GET' as const, path: '/api/maintenance-type-configs', responses: { 200: z.array(z.custom<typeof maintenanceTypeConfig.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/maintenance-type-configs', input: insertMaintenanceTypeConfigSchema, responses: { 201: z.custom<typeof maintenanceTypeConfig.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: 'PATCH' as const, path: '/api/maintenance-type-configs/:id', input: insertMaintenanceTypeConfigSchema.partial(), responses: { 200: z.custom<typeof maintenanceTypeConfig.$inferSelect>(), 404: errorSchemas.notFound } },
    delete: { method: 'DELETE' as const, path: '/api/maintenance-type-configs/:id', responses: { 204: z.void(), 404: errorSchemas.notFound } },
  },
  shifts: {
    list: { method: 'GET' as const, path: '/api/shifts', responses: { 200: z.array(z.custom<typeof shifts.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/shifts', input: insertShiftSchema, responses: { 201: z.custom<typeof shifts.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: 'PATCH' as const, path: '/api/shifts/:id', input: insertShiftSchema.partial(), responses: { 200: z.custom<typeof shifts.$inferSelect>(), 404: errorSchemas.notFound } },
    delete: { method: 'DELETE' as const, path: '/api/shifts/:id', responses: { 204: z.void(), 404: errorSchemas.notFound } },
  },
  activityTypes: {
    list: { method: 'GET' as const, path: '/api/activity-types', responses: { 200: z.array(z.custom<typeof activityTypes.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/activity-types', input: insertActivityTypeSchema, responses: { 201: z.custom<typeof activityTypes.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: 'PATCH' as const, path: '/api/activity-types/:id', input: insertActivityTypeSchema.partial(), responses: { 200: z.custom<typeof activityTypes.$inferSelect>(), 404: errorSchemas.notFound } },
    delete: { method: 'DELETE' as const, path: '/api/activity-types/:id', responses: { 204: z.void(), 404: errorSchemas.notFound } },
  },
  subEquipment: {
    list: { method: 'GET' as const, path: '/api/sub-equipment', responses: { 200: z.array(z.custom<typeof subEquipment.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/sub-equipment', input: insertSubEquipmentSchema, responses: { 201: z.custom<typeof subEquipment.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: 'PATCH' as const, path: '/api/sub-equipment/:id', input: insertSubEquipmentSchema.partial(), responses: { 200: z.custom<typeof subEquipment.$inferSelect>(), 404: errorSchemas.notFound } },
    delete: { method: 'DELETE' as const, path: '/api/sub-equipment/:id', responses: { 204: z.void(), 404: errorSchemas.notFound } },
  },
  workOrders: {
    list: { method: 'GET' as const, path: '/api/work-orders', responses: { 200: z.array(z.any()) } },
    get: { method: 'GET' as const, path: '/api/work-orders/:id', responses: { 200: z.any(), 404: errorSchemas.notFound } },
    create: {
      method: 'POST' as const,
      path: '/api/work-orders',
      input: z.object({
        vehicleId: z.coerce.number(),
        maintenanceType: z.string(),
        shiftId: z.coerce.number().optional().nullable(),
        date: z.string(),
        status: z.enum(['open', 'in_progress', 'completed']).optional(),
        items: z.array(z.object({
          subEquipmentId: z.coerce.number().optional().nullable(),
          activityTypeId: z.coerce.number().optional().nullable(),
          startTime: z.string(),
          endTime: z.string(),
          descriptions: z.array(z.string()),
        })),
      }),
      responses: { 201: z.any(), 400: errorSchemas.validation },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/work-orders/:id',
      input: z.object({
        vehicleId: z.coerce.number().optional(),
        maintenanceType: z.string().optional(),
        shiftId: z.coerce.number().optional().nullable(),
        date: z.string().optional(),
        status: z.enum(['open', 'in_progress', 'completed']).optional(),
        items: z.array(z.object({
          subEquipmentId: z.coerce.number().optional().nullable(),
          activityTypeId: z.coerce.number().optional().nullable(),
          startTime: z.string(),
          endTime: z.string(),
          descriptions: z.array(z.string()),
        })).optional(),
      }),
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    delete: { method: 'DELETE' as const, path: '/api/work-orders/:id', responses: { 204: z.void(), 404: errorSchemas.notFound } },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
