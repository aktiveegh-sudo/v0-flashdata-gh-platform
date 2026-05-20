'use client'

import { useEffect, useState } from 'react'
import { Menu, Search, Bell, User, Settings } from 'lucide-react'
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
import { supabase } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

interface HeaderProps {
  onMenuClick: () => void
}

type NotificationItem = {
  id: string
  title: string
  message: string
  created_at: string
  is_read: boolean
}

const pageLabels: Record<string, string> = {
  '/dashboard/overview': 'Overview',
  '/dashboard/wallet': 'Wallet',
  '/dashboard/afa': 'AFA Registration',
  '/dashboard/buy-data': 'Buy Data',
  '/dashboard/transactions': 'Transactions',
  '/dashboard/my-store': 'My Store',
  '/dashboard/store-packages': 'Store Packages',
  '/dashboard/other-services': 'Other Services',
  '/dashboard/store-orders': 'Store Orders',
  '/dashboard/store-transactions': 'Store Transactions',
  '/dashboard/withdrawal': 'Withdrawal',
  '/dashboard/store-settings': 'Store Settings',
  '/dashboard/developer-api': 'Developer API',
  '/dashboard/contact-support': 'Contact Support',
  '/dashboard/settings': 'Settings',
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  const pageTitle = pageLabels[pathname] ?? pageLabels[Object.keys(pageLabels).find((k) => pathname.startsWith(k)) ?? ''] ?? 'Dashboard'

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      toast.success(`Searching for "${searchQuery}"...`)
      // In a real app, this would navigate to search results
    }
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      toast.error(error.message)
      return
    }

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

  const loadNotifications = async () => {
    const userId = user?.id
    if (!userId) {
      setNotifications([])
      return
    }

    setLoadingNotifications(true)
    const { data, error } = await supabase.client
      .from('notifications')
      .select('id,title,message,created_at,is_read')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8)

    if (error) {
      setLoadingNotifications(false)
      return
    }

    setNotifications((data as NotificationItem[] | null) || [])
    setLoadingNotifications(false)
  }

  useEffect(() => {
    void loadNotifications()

    const userId = user?.id
    if (!userId) return

    const channel = supabase.client
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => void loadNotifications()
      )
      .subscribe()

    return () => {
      void supabase.client.removeChannel(channel)
    }
  }, [user?.id])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markAllAsRead = async () => {
    const userId = user?.id
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (!userId || unreadIds.length === 0) return

    const { error } = await supabase.client
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .in('id', unreadIds)

    if (error) {
      toast.error('Could not mark notifications as read')
      return
    }

    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })))
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border/70 bg-background/75 px-4 backdrop-blur-xl lg:px-6">
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
        {/* Page title — desktop */}
        <h2 className="vibe-title-gradient hidden text-base font-semibold lg:block">
          {pageTitle}
        </h2>

        {/* Search - Desktop */}
        <form onSubmit={handleSearch} className="hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search transactions, packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 border-primary/20 bg-white/60 pl-10 shadow-sm lg:w-80 dark:bg-card/70"
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
            <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-primary/10" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {unreadCount}
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => void markAllAsRead()}>
                Mark all as read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {loadingNotifications ? (
              <DropdownMenuItem className="justify-center text-muted-foreground">Loading...</DropdownMenuItem>
            ) : notifications.length === 0 ? (
              <DropdownMenuItem className="justify-center text-muted-foreground">No notifications yet</DropdownMenuItem>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3">
                  <div className="flex w-full items-start justify-between">
                    <span className="font-medium">{notification.title}</span>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{notification.message}</span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-primary">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 rounded-xl border border-border/60 bg-card/60 px-2 shadow-sm hover:bg-card">
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold">
                  {user ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium lg:inline-block">
                {user?.name?.split(' ')[0] || 'User'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-3 rounded-t-md bg-gradient-to-br from-primary/10 to-primary/5 px-3 py-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold">
                  {user ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{user?.name || 'User'}</span>
                <span className="text-xs text-muted-foreground">
                  {user?.email || 'user@example.com'}
                </span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/store-settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/wallet')}>
              <span className="mr-2">💳</span>
              My Wallet
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
