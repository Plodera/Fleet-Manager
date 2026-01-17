import { z } from 'zod';
import { 
  insertUserSchema, 
  insertVehicleSchema, 
  insertBookingSchema, 
  insertMaintenanceSchema, 
  insertFuelSchema,
  insertDepartmentSchema,
  insertSharedTripSchema,
  users,
  vehicles,
  bookings,
  maintenanceRecords,
  fuelRecords,
  departments,
  sharedTrips
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
        status: z.enum(['pending', 'approved', 'rejected', 'completed', 'cancelled']),
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
      input: z.object({ status: z.enum(['open', 'full', 'completed', 'cancelled']) }),
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
  }
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
