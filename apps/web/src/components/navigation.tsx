'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Home, Palette, LogOut, User, Settings, Calendar, Mail } from 'lucide-react'
import { useState } from 'react'
import { InviteTeammatesDialog } from '@/components/invite-teammates-dialog'

export function Navigation() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  // Don't show navigation on auth pages
  if (pathname.startsWith('/auth')) {
    return null
  }

  const getUserInitials = () => {
    if (!session?.user?.first_name || !session?.user?.last_name) {
      return session?.user?.email?.charAt(0).toUpperCase() || 'U'
    }
    return `${session.user.first_name.charAt(0)}${session.user.last_name.charAt(0)}`
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-xl font-bold text-primary">
              timeoff.hr
            </Link>
            
            {session && (
              <div className="flex items-center space-x-2">
                {/* Check if pathname has dashboard word */}
                <Link href="/dashboard">
                  <Button 
                    variant={pathname.includes('dashboard') ? 'default' : 'ghost'}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>

                <Link href="/calendar">
                  <Button 
                    variant={pathname === '/calendar' ? 'default' : 'ghost'}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Team Calendar
                  </Button>
                </Link>
                
              </div>
            )}
          </div>

          {session && (
            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {session.user?.first_name} {session.user?.last_name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  {session.user.isOwner && (
                    <DropdownMenuItem onSelect={() => setInviteDialogOpen(true)}>
                      <Mail className="mr-2 h-4 w-4" />
                      <span>Invite teammates</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/auth/signin' })}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {session.user.isOwner && (
                <InviteTeammatesDialog
                  open={inviteDialogOpen}
                  onOpenChange={setInviteDialogOpen}
                />
              )}
            </div>
          )}

          {!session && status !== 'loading' && (
            <div className="flex items-center space-x-2">
              <Link href="/auth/signin">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
} 