'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Mail, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { inviteEmailSchema } from '@/lib/validation'

const EMPTY_HEADING = 'No teammates yet'
const EMPTY_BODY = 'Invite people by email so they can join this company. Open your profile menu and choose Invite teammates.'
const VALIDATION_COPY = 'Please enter a valid email address'
const DUPLICATE_COPY = 'That email is already in this company.'
const UNAUTHORIZED_COPY = 'Only the company owner can invite teammates.'
const SUCCESS_HELPER = 'Share this link if they don’t get email:'

type PendingInvite = {
  email: string
  createdAt: string
  expiresAt: string
}

type InviteTeammatesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteTeammatesDialog({ open, onOpenChange }: InviteTeammatesDialogProps) {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [companyName, setCompanyName] = useState('')
  const [unauthorized, setUnauthorized] = useState('')
  const [lastAcceptUrl, setLastAcceptUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false
    setUnauthorized('')
    setLastAcceptUrl('')
    setCopied(false)
    setEmailError('')

    async function loadInvites() {
      try {
        const response = await fetch('/api/auth/invites', { credentials: 'include' })
        const payload = await response.json().catch(() => ({}))

        if (cancelled) {
          return
        }

        if (response.status === 401 || response.status === 403) {
          setUnauthorized(payload.error || UNAUTHORIZED_COPY)
          return
        }

        if (!response.ok) {
          toast.error(payload.error || 'Failed to load invites')
          return
        }

        setInvites(payload.invites || [])
        setCompanyName(payload.companyName || '')
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load invites:', error)
          toast.error('Failed to load invites')
        }
      }
    }

    loadInvites()
    return () => {
      cancelled = true
    }
  }, [open])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setEmailError('')
    setCopied(false)

    const validation = inviteEmailSchema.safeParse({ email })
    if (!validation.success) {
      setEmailError(VALIDATION_COPY)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/invites', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: validation.data.email }),
      })
      const payload = await response.json().catch(() => ({}))

      if (response.status === 401 || response.status === 403) {
        setUnauthorized(payload.error || UNAUTHORIZED_COPY)
        return
      }

      if (response.status === 409) {
        setEmailError(payload.error || DUPLICATE_COPY)
        return
      }

      if (!response.ok) {
        toast.error(payload.error || 'Failed to create invite')
        return
      }

      toast.success(`Invite created for ${payload.email}.`)
      setLastAcceptUrl(payload.acceptUrl || '')
      setInvites((current) => [
        {
          email: payload.email,
          createdAt: new Date().toISOString(),
          expiresAt: payload.expiresAt,
        },
        ...current.filter((row) => row.email !== payload.email),
      ])
      setEmail('')
    } catch (error) {
      console.error('Failed to create invite:', error)
      toast.error('Failed to create invite')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = async () => {
    if (!lastAcceptUrl) {
      return
    }
    try {
      await navigator.clipboard.writeText(lastAcceptUrl)
      setCopied(true)
      toast.success('Link copied')
    } catch (error) {
      console.error('Failed to copy invite link:', error)
      toast.error('Failed to copy invite link')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Invite teammates</DialogTitle>
          <DialogDescription className="whitespace-normal break-words text-gray-600">
            {companyName
              ? `They’ll join ${companyName} only. They cannot see any other company.`
              : 'They’ll join this company only. They cannot see any other company.'}
          </DialogDescription>
        </DialogHeader>

        {unauthorized ? (
          <p className="text-sm text-red-600">{unauthorized}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Work email</Label>
              <Input
                id="invite-email"
                type="email"
                autoComplete="off"
                placeholder="teammate@company.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setEmailError('')
                }}
                disabled={isSubmitting}
                className={`h-12 overflow-x-auto whitespace-nowrap ${emailError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {emailError && (
                <p className="text-sm text-red-600">{emailError}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full bg-gradient-to-r from-primary to-primary text-white hover:from-primary hover:to-primary"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending invite...
                </>
              ) : (
                'Send invite'
              )}
            </Button>

            {lastAcceptUrl && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{SUCCESS_HELPER}</p>
                <Input
                  readOnly
                  value={lastAcceptUrl}
                  className="h-12 overflow-x-auto whitespace-nowrap"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full"
                  onClick={handleCopy}
                >
                  {copied ? 'Link copied' : 'Copy invite link'}
                </Button>
              </div>
            )}

            <div className="max-h-48 space-y-2 overflow-y-auto">
              {invites.length === 0 ? (
                <div className="space-y-1">
                  <p className="font-bold">{EMPTY_HEADING}</p>
                  <p className="whitespace-normal break-words text-sm text-gray-600">{EMPTY_BODY}</p>
                </div>
              ) : (
                invites.map((invite) => (
                  <div
                    key={`${invite.email}-${invite.createdAt}`}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-gray-500" />
                    <span className="overflow-x-auto whitespace-nowrap text-sm">{invite.email}</span>
                  </div>
                ))
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
