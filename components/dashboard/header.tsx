'use client'

import { useEffect, useState } from 'react'
import { Menu, Search, Bell, Settings, ShieldCheck, WalletMinimal } from 'lucide-react'
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
import { resolveDashboardPageTitle } from '@/lib/dashboard/nav'
import { useAuthStore, useWalletStore } from '@/lib/store'
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


export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { balance } = useWalletStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [resolvedUserId, setResolvedUserId] = useState('')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const pageTitle = resolveDashboardPageTitle(pathname)

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

    sessionStorage.setItem('flashdata-just-signed-out', '1')
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

  const loadNotifications = async (explicitUserId?: string) => {
    const userId = explicitUserId || resolvedUserId || user?.id
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
      toast.error(error.message)
      setLoadingNotifications(false)
      return
    }

    setNotifications((data as NotificationItem[] | null) || [])
    setLoadingNotifications(false)
  }

  useEffect(() => {
    const syncResolvedUser = async () => {
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user?.id || ''
      setResolvedUserId(userId)
    }

    void syncResolvedUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setResolvedUserId(session?.user?.id || '')
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const userId = resolvedUserId || user?.id
    if (!userId) return

    void loadNotifications(userId)

    const channel = supabase.client
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => void loadNotifications(userId)
      )
      .subscribe()

    const interval = window.setInterval(() => {
      void loadNotifications(userId)
    }, 15000)

    return () => {
      window.clearInterval(interval)
      void supabase.client.removeChannel(channel)
    }
  }, [resolvedUserId, user?.id])

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
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/8 dark:bg-[#0a110d]/90 lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl border border-gray-200 dark:border-white/10 lg:hidden"
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">{greeting}</p>
            <h2 className="truncate text-lg font-black lg:text-xl">{pageTitle}</h2>
          </div>

          <form onSubmit={handleSearch} className="hidden xl:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Quick Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-72 rounded-2xl border border-gray-200 bg-gray-50 pl-10 text-gray-900 shadow-sm placeholder:text-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-400 dark:border-white/10 dark:bg-white/5">
                ⌘K
              </span>
            </div>
          </form>
        </div>

        <div className="flex items-center gap-1.5 lg:gap-3">
        {/* Mobile Search */}
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl border border-gray-200 bg-white text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white xl:hidden" aria-label="Search">
          <Search className="h-5 w-5" />
        </Button>

          <div className="hidden items-center gap-2 lg:flex">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#f4c532]/45 bg-[#f4c532]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#f4c532]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
              <WalletMinimal className="h-3.5 w-3.5" />
              GHc {balance.toFixed(2)}
            </div>
          </div>

          <ThemeSwitcher showQuickColors />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-2xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" aria-label="Notifications">
              <Bell className="h-5 w-5" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#f4c532] text-[10px] font-bold text-black">
                {unreadCount}
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f4c532] opacity-50" />
              </span>
                ) : null}
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
            <DropdownMenuItem className="justify-center text-primary" onClick={() => router.push('/dashboard/notifications')}>
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-11 gap-2 rounded-2xl border border-gray-200 bg-white px-2.5 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
              <Avatar className="h-8 w-8 ring-2 ring-amber-400/40">
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-500 text-black text-xs font-bold">
                  {user ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-right lg:inline-flex lg:flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">{greeting}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name?.split(' ')[0] || 'User'}</span>
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
            <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
              <Settings className="mr-2 h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/wallet')}>
              <span className="mr-2">💳</span>
              Wallet
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
