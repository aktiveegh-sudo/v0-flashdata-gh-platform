'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Menu, Search, ShieldCheck } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeSwitcher } from '@/components/theme-switcher'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { resolveAdminPageTitle } from '@/lib/admin/nav'
import { supabase } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/admin/utils'

interface AdminHeaderProps {
  userName: string
  userEmail: string
  onLogout: () => void
  onMenuClick?: () => void
}

type NotificationRow = {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  created_at: string
}

export function AdminHeader({ userName, userEmail, onLogout, onMenuClick }: AdminHeaderProps) {
  const pathname = usePathname()
  const [notifications, setNotifications] = useState<NotificationRow[]>([])

  const pageTitle = resolveAdminPageTitle(pathname)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    const loadNotifications = async () => {
      const { data } = await supabase.client
        .from('notifications')
        .select('id,title,message,type,is_read,created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      setNotifications((data as NotificationRow[]) || [])
    }

    void loadNotifications()

    const channel = supabase.client
      .channel('admin-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        void loadNotifications()
      })
      .subscribe()

    return () => {
      void supabase.client.removeChannel(channel)
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/8 dark:bg-[#0a110d]/90 lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {onMenuClick ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl border border-gray-200 dark:border-white/10 lg:hidden"
              onClick={onMenuClick}
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          ) : null}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">{greeting}</p>
            <h2 className="truncate text-lg font-black lg:text-xl">{pageTitle}</h2>
          </div>
        </div>

        <div className="hidden flex-1 justify-center xl:flex">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Quick Search..."
              className="h-11 rounded-2xl border border-gray-200 bg-gray-50 pl-10 dark:border-white/10 dark:bg-white/5"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-400 dark:border-white/10 dark:bg-white/5">
              ⌘K
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 lg:gap-3">
          <div className="hidden items-center gap-2 lg:flex">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure
            </div>
          </div>

          <ThemeSwitcher showQuickColors />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-black">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Realtime Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <DropdownMenuItem className="text-muted-foreground">No notifications yet.</DropdownMenuItem>
              ) : (
                notifications.slice(0, 6).map((item) => (
                  <DropdownMenuItem key={item.id} className="block py-2">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.message}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(item.created_at)}</p>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-11 gap-2 rounded-2xl border border-gray-200 bg-white px-2.5 shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <Avatar className="h-8 w-8 ring-2 ring-amber-400/40">
                  <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-500 text-xs font-bold text-black">
                    {userName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-right lg:inline-flex lg:flex-col">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                    {greeting}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{userName}</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <p className="font-medium">{userName}</p>
                <p className="text-xs font-normal text-muted-foreground">{userEmail}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
