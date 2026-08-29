/**
 * Client-side password checks aligned to PASSWORD_REQUIREMENTS / passwordSchema.
 * UX gating only — the signup API remains the source of truth.
 */
import { PASSWORD_REQUIREMENTS } from './validation.ts'

const LENGTH_MESSAGE = `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`
const UPPERCASE_MESSAGE = 'Password must contain at least one uppercase letter'
const LOWERCASE_MESSAGE = 'Password must contain at least one lowercase letter'
const NUMBER_MESSAGE = 'Password must contain at least one number'
const SPECIAL_MESSAGE = 'Password must contain at least one special character'

export type PasswordRequirementItem = {
  label: string
  met: boolean
}

/**
 * First passwordSchema rule that fails, in schema order.
 * Empty input returns "Password is required".
 */
export function firstPasswordError(password: string): string | undefined {
  if (!password) {
    return 'Password is required'
  }
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    return LENGTH_MESSAGE
  }
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    return UPPERCASE_MESSAGE
  }
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    return LOWERCASE_MESSAGE
  }
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/[0-9]/.test(password)) {
    return NUMBER_MESSAGE
  }
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
    return SPECIAL_MESSAGE
  }
  return undefined
}

export function passwordMeetsApiRules(password: string): boolean {
  return firstPasswordError(password) === undefined
}

export function passwordRequirementItems(password: string): PasswordRequirementItem[] {
  return [
    {
      label: `At least ${PASSWORD_REQUIREMENTS.minLength} characters`,
      met: password.length >= PASSWORD_REQUIREMENTS.minLength,
    },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains number', met: /[0-9]/.test(password) },
    { label: 'Contains special character', met: /[^A-Za-z0-9]/.test(password) },
  ]
}

/**
 * Copy own enumerable keys from a 400 details object onto a field-error map.
 */
export function mergeSignupFieldErrors(
  details: Record<string, string> | undefined
): Record<string, string> {
  if (!details) {
    return {}
  }
  const merged: Record<string, string> = {}
  for (const key of Object.keys(details)) {
    if (Object.prototype.hasOwnProperty.call(details, key)) {
      merged[key] = details[key]
    }
  }
  return merged
}
