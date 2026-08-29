'use client'

import { Suspense, useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Eye, EyeOff, Lock, User, AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react'
import { EMAIL_EXISTS_ERROR } from '@/lib/invite-auth'
import { mergeSignupFieldErrors } from '@/lib/password-client'

const INVALID_COPY = 'This invite is invalid or has expired. Ask your admin to send a new invite.'
const MISMATCH_COPY = 'This invite was sent to a different email. Sign in with that address, or ask your admin for a new invite.'

interface FormData {
  firstName: string
  lastName: string
  password: string
  confirmPassword: string
}

interface ValidationErrors {
  firstName?: string
  lastName?: string
  password?: string
  confirmPassword?: string
}

type PageState = 'resolving' | 'invalid' | 'mismatch' | 'exists' | 'ready'

function AuthCardChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="backdrop-blur-lg bg-white/80 border-white/20 shadow-2xl">
          {children}
        </Card>
      </div>
    </div>
  )
}

function ResolveSpinner() {
  return (
    <AuthCardChrome>
      <CardContent className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </CardContent>
    </AuthCardChrome>
  )
}

function InviteStatusCard({ copy }: { copy: string }) {
  const router = useRouter()
  const [title, description] = copy.split(/(?<=\.)\s/, 2)

  return (
    <AuthCardChrome>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">TO</span>
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-center text-gray-900 text-wrap break-words">
          {title}
        </CardTitle>
        {description ? (
          <CardDescription className="text-center text-gray-600">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        <Button
          onClick={() => router.push('/auth/signin')}
          className="w-full h-12 bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary text-white font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to sign in
        </Button>
      </CardContent>
    </AuthCardChrome>
  )
}

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')?.trim() || ''
  const queryError = searchParams.get('error')

  const [pageState, setPageState] = useState<PageState>(
    queryError === 'mismatch'
      ? 'mismatch'
      : queryError === 'exists'
        ? 'exists'
        : token
          ? 'resolving'
          : 'invalid'
  )
  const [companyName, setCompanyName] = useState('')
  const [invitedEmail, setInvitedEmail] = useState('')
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  useEffect(() => {
    if (queryError === 'mismatch') {
      setPageState('mismatch')
      return
    }
    if (queryError === 'exists') {
      setPageState('exists')
      return
    }
    if (!token) {
      setPageState('invalid')
      return
    }

    let cancelled = false

    async function loadPreview() {
      try {
        const response = await fetch(
          `/api/auth/invites/preview?token=${encodeURIComponent(token)}`
        )
        if (cancelled) return
        if (response.status === 404) {
          setPageState('invalid')
          return
        }
        if (response.status === 409) {
          setPageState('exists')
          return
        }
        const data = await response.json()
        if (!response.ok) {
          setPageState('invalid')
          return
        }
        if (data.error === 'mismatch') {
          setPageState('mismatch')
          return
        }
        setCompanyName(data.companyName)
        setInvitedEmail(data.email)
        setPageState('ready')
      } catch {
        if (!cancelled) {
          setPageState('invalid')
        }
      }
    }

    loadPreview()
    return () => {
      cancelled = true
    }
  }, [token, queryError])

  const calculatePasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength += 1
    if (/[a-z]/.test(password)) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/[0-9]/.test(password)) strength += 1
    if (/[^A-Za-z0-9]/.test(password)) strength += 1
    return strength
  }

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 12) {
      newErrors.password = 'Password must be at least 12 characters'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isFormReady =
    formData.firstName.trim().length > 0 &&
    formData.lastName.trim().length > 0 &&
    formData.password.length >= 12 &&
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }

    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value))
    }
  }

  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/invites/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          firstName: formData.firstName,
          lastName: formData.lastName,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      })

      const data = await response.json()

      if (response.status === 404) {
        setPageState('invalid')
        return
      }

      if (data.error === 'mismatch' || response.status === 409 && /different email/i.test(data.error || '')) {
        setPageState('mismatch')
        return
      }

      if (response.status === 409) {
        setPageState('exists')
        return
      }

      if (!response.ok) {
        const fieldErrors = mergeSignupFieldErrors(data.details)
        setErrors(prev => ({ ...prev, ...fieldErrors }))
        if (Object.keys(fieldErrors).length === 0) {
          toast.error(data.error || 'Failed to join company')
        }
        return
      }

      toast.success(`You've joined ${companyName}. Redirecting to dashboard...`)

      const signInResult = await signIn('credentials', {
        email: invitedEmail,
        password: formData.password,
        redirect: false,
      })

      if (signInResult?.ok) {
        router.push('/dashboard')
      } else {
        router.push('/auth/signin')
      }
    } catch (error) {
      console.error('Accept invite error:', error)
      toast.error(error instanceof Error ? error.message : 'An error occurred while joining')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleJoin = async () => {
    setIsGoogleLoading(true)

    try {
      const response = await fetch('/api/auth/pending-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kind: 'invite', token }),
      })

      if (!response.ok) {
        toast.error('Unable to continue with Google. Try again.')
        setIsGoogleLoading(false)
        return
      }

      await signIn('google', { callbackUrl: '/dashboard' })
    } catch {
      toast.error('An error occurred during Google sign in')
      setIsGoogleLoading(false)
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return 'bg-red-500'
    if (passwordStrength <= 3) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return 'Weak'
    if (passwordStrength <= 3) return 'Fair'
    return 'Strong'
  }

  const getPasswordRequirements = () => {
    const password = formData.password
    return [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
      { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'Contains number', met: /[0-9]/.test(password) },
      { label: 'Contains special character', met: /[^A-Za-z0-9]/.test(password) },
    ]
  }

  if (pageState === 'resolving') {
    return <ResolveSpinner />
  }

  if (pageState === 'invalid') {
    return <InviteStatusCard copy={INVALID_COPY} />
  }

  if (pageState === 'mismatch') {
    return <InviteStatusCard copy={MISMATCH_COPY} />
  }

  if (pageState === 'exists') {
    return <InviteStatusCard copy={EMAIL_EXISTS_ERROR} />
  }

  return (
    <AuthCardChrome>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">TO</span>
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-center text-gray-900 text-wrap break-words">
          Join {companyName}
        </CardTitle>
        <CardDescription className="text-center text-gray-600">
          You&apos;re invited to this company only. Create your account or continue with Google to join.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Button
          onClick={handleGoogleJoin}
          disabled={isLoading || isGoogleLoading}
          variant="outline"
          className="w-full h-12 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 font-medium"
        >
          {isGoogleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
          </div>
        </div>

        <form onSubmit={handleJoinCompany} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                First name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="firstName"
                  type="text"
                  autoFocus
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={`pl-10 h-12 ${errors.firstName ? 'border-red-500 focus:border-red-500' : ''}`}
                  disabled={isLoading}
                />
                {errors.firstName && (
                  <div className="flex items-center mt-1 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.firstName}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                Last name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={`pl-10 h-12 ${errors.lastName ? 'border-red-500 focus:border-red-500' : ''}`}
                  disabled={isLoading}
                />
                {errors.lastName && (
                  <div className="flex items-center mt-1 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.lastName}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`pl-10 pr-10 h-12 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {errors.password && (
                <div className="flex items-center mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.password}
                </div>
              )}
            </div>

            {formData.password && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Password strength</span>
                  <Badge variant={passwordStrength >= 4 ? 'default' : 'secondary'} className="text-xs">
                    {getPasswordStrengthText()}
                  </Badge>
                </div>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        level <= passwordStrength ? getPasswordStrengthColor() : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <div className="space-y-1">
                  {getPasswordRequirements().map((req, index) => (
                    <div key={index} className="flex items-center text-xs">
                      {req.met ? (
                        <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-gray-300 mr-2" />
                      )}
                      <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
              Confirm password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={`pl-10 pr-10 h-12 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {errors.confirmPassword && (
                <div className="flex items-center mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.confirmPassword}
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary text-white font-medium"
            disabled={isLoading || !isFormReady}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              'Join company'
            )}
          </Button>
        </form>
      </CardContent>
    </AuthCardChrome>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<ResolveSpinner />}>
      <AcceptInviteContent />
    </Suspense>
  )
}
