/**
 * Input Validation Schemas
 * Centralized validation using Zod for type safety and runtime validation
 */

import { z } from 'zod'

// Password requirements
export const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
} as const

// Common validation patterns
const emailSchema = z.string()
  .email('Please enter a valid email address')
  .max(255, 'Email address is too long')
  .transform(email => email.toLowerCase().trim())

const nameSchema = z.string()
  .min(1, 'This field is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .transform(name => name.trim())

const passwordSchema = z.string()
  .min(PASSWORD_REQUIREMENTS.minLength, `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`)
  .max(128, 'Password is too long')
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => /[0-9]/.test(password),
    'Password must contain at least one number'
  )
  .refine(
    (password) => /[^A-Za-z0-9]/.test(password),
    'Password must contain at least one special character'
  )

// User registration validation
export const userRegistrationSchema = z.object({
  companyName: z.string()
    .min(1, 'Company name is required')
    .max(80, 'Company name is too long')
    .transform(name => name.trim()),
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  }),
  acceptMarketing: z.boolean().optional().default(false)
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }
)

// User sign-in validation
export const userSignInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

/** Owner invite: email only; company_id is never taken from the client. */
export const inviteEmailSchema = z.object({
  email: emailSchema,
})

/** Credentials accept: no email or company id — those come from the invite row. */
export const inviteAcceptSchema = z.object({
  token: z.string().min(1, 'Invite token is required'),
  firstName: nameSchema,
  lastName: nameSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }
)

/** Pending Google OAuth context: company name or invite token (httpOnly cookie payload). */
export const pendingContextSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('company'),
    companyName: z.string()
      .min(1, 'Company name is required')
      .max(80, 'Company name is too long')
      .transform(name => name.trim()),
  }),
  z.object({
    kind: z.literal('invite'),
    token: z.string().min(1, 'Invite token is required'),
  }),
])

// Leave request validation
export const leaveRequestSchema = z.object({
  leave_type: z.enum(['vacation', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'unpaid', 'other']),
  start_date: z.date({
    required_error: 'Please select a start date',
  }).refine(
    (date) => date >= new Date(new Date().setHours(0, 0, 0, 0)),
    'Start date cannot be in the past'
  ),
  end_date: z.date({
    required_error: 'Please select an end date',
  }),
  is_half_day: z.boolean().default(false),
  half_day_type: z.enum(['morning', 'afternoon']).optional(),
  reason: z.string().optional(),
  attachments: z.array(z.string()).optional()
}).refine(
  (data) => data.end_date >= data.start_date,
  {
    message: "End date must be after start date",
    path: ["end_date"]
  }
).refine(
  (data) => {
    // Check if half day type is required when is_half_day is true
    if (data.is_half_day && !data.half_day_type) {
      return false
    }
    return true
  },
  {
    message: "Half day type is required when selecting half day",
    path: ["half_day_type"]
  }
)

/** JSON body for POST /api/leave-requests. Actor ids are never taken from the client. */
export const leaveRequestCreateBodySchema = z.object({
  leave_type: z.enum(['vacation', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'unpaid', 'other']),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  is_half_day: z.boolean().default(false),
  half_day_type: z.enum(['morning', 'afternoon']).optional(),
  reason: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  status: z.enum(['draft', 'pending', 'approved', 'rejected', 'cancelled']).optional(),
}).refine(
  (data) => data.end_date >= data.start_date,
  {
    message: "End date must be after start date",
    path: ["end_date"]
  }
).refine(
  (data) => {
    if (data.is_half_day && !data.half_day_type) {
      return false
    }
    return true
  },
  {
    message: "Half day type is required when selecting half day",
    path: ["half_day_type"]
  }
)

// Password reset validation
export const passwordResetSchema = z.object({
  email: emailSchema
})

export const passwordResetConfirmSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
  token: z.string().min(1, 'Reset token is required')
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }
)

// User profile update validation
export const userProfileUpdateSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  email: emailSchema.optional(),
  department: z.string().max(100).optional(),
  team: z.string().max(100).optional(),
  avatar: z.string().url().optional().or(z.literal(''))
})

// API error response schema
export const apiErrorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
  code: z.string().optional()
})

// Common ID validation
export const uuidSchema = z.string().uuid('Invalid ID format')

// Date range validation
export const dateRangeSchema = z.object({
  start_date: z.date(),
  end_date: z.date()
}).refine(
  (data) => data.end_date >= data.start_date,
  {
    message: "End date must be after start date",
    path: ["end_date"]
  }
)

// Export types from schemas
export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>
export type UserSignInInput = z.infer<typeof userSignInSchema>
export type InviteEmailInput = z.infer<typeof inviteEmailSchema>
export type InviteAcceptInput = z.infer<typeof inviteAcceptSchema>
export type PendingContextInput = z.infer<typeof pendingContextSchema>
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>
export type LeaveRequestCreateBodyInput = z.infer<typeof leaveRequestCreateBodySchema>
export type PasswordResetInput = z.infer<typeof passwordResetSchema>
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>
export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>
export type DateRangeInput = z.infer<typeof dateRangeSchema>

/**
 * Utility function to safely validate data and return proper error responses
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error }
    }
    throw error
  }
}

/**
 * Format Zod errors for user-friendly display
 */
export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {}
  
  error.errors.forEach((err) => {
    const path = err.path.join('.')
    formattedErrors[path] = err.message
  })
  
  return formattedErrors
}
