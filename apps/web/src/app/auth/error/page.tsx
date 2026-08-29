'use client'

import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { Suspense } from 'react'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get('error')

  const getErrorDetails = () => {
    switch (error) {
      case 'Configuration':
        return {
          title: 'Server Error',
          description: 'There is a problem with the server configuration. Please try again later.',
          action: 'Try again'
        }
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          description: 'You do not have permission to sign in.',
          action: 'Contact support'
        }
      case 'Verification':
        return {
          title: 'Verification Failed',
          description: 'The verification link has expired or is invalid.',
          action: 'Request new link'
        }
      case 'OAuthSignin':
        return {
          title: 'OAuth Sign In Error',
          description: 'There was an error during the OAuth sign in process.',
          action: 'Try again'
        }
      case 'OAuthCallback':
        return {
          title: 'OAuth Callback Error',
          description: 'There was an error during the OAuth callback process.',
          action: 'Try again'
        }
      case 'OAuthCreateAccount':
        return {
          title: 'Account Creation Error',
          description: 'There was an error creating your account.',
          action: 'Try again'
        }
      case 'EmailCreateAccount':
        return {
          title: 'Account Creation Error',
          description: 'There was an error creating your account with email.',
          action: 'Try again'
        }
      case 'Callback':
        return {
          title: 'Callback Error',
          description: 'There was an error during the callback process.',
          action: 'Try again'
        }
      case 'OAuthAccountNotLinked':
        return {
          title: 'Account Not Linked',
          description: 'This email is already associated with another account.',
          action: 'Sign in with different method'
        }
      case 'EmailSignin':
        return {
          title: 'Email Sign In Error',
          description: 'There was an error sending the sign in email.',
          action: 'Try again'
        }
      case 'CredentialsSignin':
        return {
          title: 'Invalid Credentials',
          description: 'The email or password you entered is incorrect.',
          action: 'Try again'
        }
      case 'SessionRequired':
        return {
          title: 'Session Required',
          description: 'You need to be signed in to access this page.',
          action: 'Sign in'
        }
      case 'InviteRequired':
        return {
          title: 'Invite required',
          description: 'Google sign-in cannot create a company or drop you into a shared employee pool. Ask your admin for an invite, or create a company with email.',
          action: 'Create a company'
        }
      case 'AccountExists':
        return {
          title: 'An account with this email already exists.',
          description: 'Sign in, or ask your admin for an invite.',
          action: 'Sign in'
        }
      default:
        return {
          title: 'Authentication Error',
          description: 'An unexpected error occurred during authentication.',
          action: 'Try again'
        }
    }
  }

  const errorDetails = getErrorDetails()

  const handleAction = () => {
    switch (error) {
      case 'OAuthAccountNotLinked':
        router.push('/auth/signin')
        break
      case 'SessionRequired':
        router.push('/auth/signin')
        break
      case 'Verification':
        router.push('/auth/forgot-password')
        break
      case 'InviteRequired':
        router.push('/auth/signup')
        break
      case 'AccountExists':
        router.push('/auth/signin')
        break
      default:
        router.push('/auth/signin')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="backdrop-blur-lg bg-white/80 border-white/20 shadow-2xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center text-gray-900">
              {errorDetails.title}
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              {errorDetails.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Button
                onClick={handleAction}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {errorDetails.action}
              </Button>

              <Button
                onClick={() => router.push('/auth/signin')}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to sign in
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Need help?{' '}
                <Button
                  variant="link"
                  className="text-blue-600 hover:text-blue-700 p-0 h-auto font-medium"
                  onClick={() => router.push('/support')}
                >
                  Contact support
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="backdrop-blur-lg bg-white/80 border-white/20 shadow-2xl">
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
} 