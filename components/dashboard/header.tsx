'use client'

import { useState } from 'react'
import { Menu, Search, Bell, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      toast.success(`Searching for "${searchQuery}"...`)
      // In a real app, this would navigate to search results
    }
  }

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    router.push('/')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const notifications = [
    { id: 1, title: 'Data purchase successful', message: '2GB MTN data sent to 024XXXXXXX', time: '2 min ago' },
    { id: 2, title: 'Wallet funded', message: 'GH₵100.00 added to your wallet', time: '1 hour ago' },
    { id: 3, title: 'New store order', message: 'Kwame ordered 5GB MTN data', time: '3 hours ago' },
  ]

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur-sm lg:px-6">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search - Desktop */}
        <form onSubmit={handleSearch} className="hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search transactions, packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 bg-muted/50 pl-10 lg:w-80"
            />
          </div>
        </form>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Mobile Search */}
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search">
          <Search className="h-5 w-5" />
        </Button>

        {/* Theme Switcher */}
        <ThemeSwitcher />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                3
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary">
                Mark all as read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3">
                <div className="flex w-full items-start justify-between">
                  <span className="font-medium">{notification.title}</span>
                  <span className="text-xs text-muted-foreground">{notification.time}</span>
                </div>
                <span className="text-sm text-muted-foreground">{notification.message}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-primary">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium lg:inline-block">
                {user?.name || 'User'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.name || 'User'}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.email || 'user@example.com'}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/store-settings')}>
              <User className="mr-2 h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/wallet')}>
              <span className="mr-2">💳</span>
              My Wallet
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
