'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Eye, EyeOff, Mail, Lock, User, Building2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { PASSWORD_REQUIREMENTS } from '@/lib/validation'
import {
  firstPasswordError,
  mergeSignupFieldErrors,
  passwordMeetsApiRules,
  passwordRequirementItems,
} from '@/lib/password-client'

interface FormData {
  companyName: string
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
  acceptMarketing: boolean
}

interface ValidationErrors {
  companyName?: string
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  confirmPassword?: string
  acceptTerms?: string
}

const DUPLICATE_EMAIL_COPY =
  'An account with this email already exists. Sign in, or ask your admin for an invite.'

export default function SignUpPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptMarketing: false,
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // Password strength calculation
  const calculatePasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= PASSWORD_REQUIREMENTS.minLength) strength += 1
    if (/[a-z]/.test(password)) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/[0-9]/.test(password)) strength += 1
    if (/[^A-Za-z0-9]/.test(password)) strength += 1
    return strength
  }

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required'
    } else if (formData.companyName.trim().length > 80) {
      newErrors.companyName = 'Company name is too long'
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    const passwordError = firstPasswordError(formData.password)
    if (passwordError) {
      newErrors.password = passwordError
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isFormReady =
    formData.companyName.trim().length > 0 &&
    formData.companyName.trim().length <= 80 &&
    formData.firstName.trim().length > 0 &&
    formData.lastName.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(formData.email) &&
    passwordMeetsApiRules(formData.password) &&
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword &&
    formData.acceptTerms

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }

    // Update password strength
    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value as string))
    }
  }

  const handleTraditionalSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: formData.companyName,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          acceptTerms: formData.acceptTerms,
          acceptMarketing: formData.acceptMarketing,
        }),
      })

      const data = await response.json()

      if (response.status === 409) {
        setErrors(prev => ({ ...prev, email: DUPLICATE_EMAIL_COPY }))
        return
      }

      if (!response.ok) {
        const fieldErrors = mergeSignupFieldErrors(data.details)
        setErrors(prev => ({ ...prev, ...fieldErrors }))
        if (Object.keys(fieldErrors).length === 0) {
          toast.error(data.error || 'Failed to create account')
        }
        return
      }

      toast.success('Company created. Sign in with your new credentials.')
      router.push('/auth/signin')
    } catch (error) {
      console.error('Signup error:', error)
      toast.error(error instanceof Error ? error.message : 'An error occurred during registration')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    const companyName = formData.companyName.trim()
    if (!companyName) {
      setErrors(prev => ({
        ...prev,
        companyName: 'Enter a company name before continuing with Google.',
      }))
      toast.error('Enter a company name before continuing with Google.')
      return
    }

    setIsGoogleLoading(true)

    try {
      const response = await fetch('/api/auth/pending-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kind: 'company', companyName }),
      })

      if (!response.ok) {
        toast.error('Enter a company name before continuing with Google.')
        setIsGoogleLoading(false)
        return
      }

      await signIn('google', { callbackUrl: '/dashboard' })
    } catch (error) {
      toast.error('An error occurred during Google sign up')
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

  const getPasswordRequirements = () => passwordRequirementItems(formData.password)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Glass-morphism card */}
        <Card className="backdrop-blur-lg bg-white/80 border-white/20 shadow-2xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">TO</span>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center text-gray-900">
              Create your company
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              Enter your company name, then create the owner account. Teammates join by invite only.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">
                Company name
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="companyName"
                  type="text"
                  autoFocus
                  autoComplete="organization"
                  placeholder="Acme Inc."
                  maxLength={80}
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className={`pl-10 h-12 whitespace-normal break-words ${errors.companyName ? 'border-red-500 focus:border-red-500' : ''}`}
                  disabled={isLoading}
                />
                {errors.companyName && (
                  <div className="flex items-center mt-1 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.companyName}
                  </div>
                )}
              </div>
            </div>

            {/* Google Sign Up */}
            <Button
              onClick={handleGoogleSignUp}
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

            {/* Traditional Sign Up Form */}
            <form onSubmit={handleTraditionalSignUp} className="space-y-4">
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
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@company.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`pl-10 h-12 overflow-x-auto whitespace-nowrap ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                  {errors.email && (
                    <div className="flex items-center mt-1 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.email}
                    </div>
                  )}
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

                {/* Password Strength Indicator */}
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
                    
                    {/* Password Requirements */}
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

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="accept-terms"
                    checked={formData.acceptTerms}
                    onCheckedChange={(checked) => handleInputChange('acceptTerms', checked as boolean)}
                    disabled={isLoading}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="accept-terms"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I accept the{' '}
                      <Button variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-700">
                        Terms of Service
                      </Button>{' '}
                      and{' '}
                      <Button variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-700">
                        Privacy Policy
                      </Button>
                    </Label>
                    {errors.acceptTerms && (
                      <div className="flex items-center text-sm text-red-600">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.acceptTerms}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="accept-marketing"
                    checked={formData.acceptMarketing}
                    onCheckedChange={(checked) => handleInputChange('acceptMarketing', checked as boolean)}
                    disabled={isLoading}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="accept-marketing"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I agree to receive marketing communications from Timeoff
                    </Label>
                  </div>
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
                    Creating company...
                  </>
                ) : (
                  'Create company'
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Button
                  variant="link"
                  className="text-blue-600 hover:text-blue-700 p-0 h-auto font-medium"
                  onClick={() => router.push('/auth/signin')}
                >
                  Sign in
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
