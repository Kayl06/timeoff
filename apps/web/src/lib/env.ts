/**
 * Environment Configuration
 * Centralized environment variable validation and type safety
 */

// Environment variable schema
interface EnvironmentConfig {
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  SUPABASE_JWT_SECRET: string
  
  // NextAuth Configuration
  NEXTAUTH_URL: string
  NEXTAUTH_SECRET: string
  
  // OAuth Configuration (optional in development)
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string

  // Resend (optional even in production — D-13, D-15)
  RESEND_API_KEY?: string
  EMAIL_FROM?: string
  
  // Application Configuration
  NODE_ENV: 'development' | 'production' | 'test'
}

/**
 * Validates that all required environment variables are present
 * Throws an error with clear messaging if any are missing
 */
function validateEnvironment(): EnvironmentConfig {
  // Always required
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'SUPABASE_JWT_SECRET',
    'SUPABASE_SERVICE_ROLE_KEY',
  ] as const

  // Optional in every environment — credentials signup/sign-in work without Google.
  const optionalOauthVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
  ] as const

  // Always optional — names only; never required (D-15)
  const optionalMailVars = ['RESEND_API_KEY', 'EMAIL_FROM'] as const

  const missingVars: string[] = []
  const config: Partial<EnvironmentConfig> = {}

  // Add NODE_ENV with default
  config.NODE_ENV = (process.env.NODE_ENV as EnvironmentConfig['NODE_ENV']) || 'development'

  // Check always required variables
  for (const varName of requiredVars) {
    const value = process.env[varName]
    if (!value || value.trim() === '') {
      missingVars.push(varName)
    } else {
      config[varName] = value
    }
  }

  for (const varName of optionalOauthVars) {
    const value = process.env[varName]
    if (value && value.trim() !== '') {
      config[varName] = value
    }
  }

  for (const varName of optionalMailVars) {
    const value = process.env[varName]
    if (value && value.trim() !== '') {
      config[varName] = value
    }
  }

  // Throw error if any required variables are missing (names only — never values)
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    )
  }

  return config as EnvironmentConfig
}

/**
 * Validated environment configuration
 * Use this instead of directly accessing process.env
 */
let _env: EnvironmentConfig | null = null;

function getEnv(): EnvironmentConfig {
  if (!_env) {
    _env = validateEnvironment();
  }
  return _env;
}

export const env = new Proxy({} as EnvironmentConfig, {
  get(target, prop) {
    const config = getEnv();
    return config[prop as keyof EnvironmentConfig];
  }
});

/**
 * Utility to check if we're in development mode
 */
export const isDevelopment = () => env.NODE_ENV === 'development'

/**
 * Utility to check if we're in production mode
 */
export const isProduction = () => env.NODE_ENV === 'production'

/**
 * Utility to check if we're in test mode
 */
export const isTest = () => env.NODE_ENV === 'test'

/**
 * Safe logger that logs in development and errors in production
 */
export const devLog = {
  info: (...args: any[]) => {
    if (isDevelopment()) {
      console.log('[DEV]', ...args)
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment()) {
      console.warn('[DEV]', ...args)
    }
  },
  error: (...args: any[]) => {
    // Always log errors, even in production, for debugging
    console.error(isProduction() ? '[PROD ERROR]' : '[DEV]', ...args)
  }
}
