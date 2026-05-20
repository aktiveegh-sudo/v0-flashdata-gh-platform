'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, LayoutDashboard, Users, Package, ClipboardList, PlusSquare, Landmark, Settings, KeyRound, BellRing, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GhanaFlagIcon } from '@/components/loader'

const links = [
  { href: '/admin/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/packages', label: 'Packages', icon: Package },
  { href: '/admin/afa', label: 'AFA Control', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/admin/add-service', label: 'Add Service', icon: PlusSquare },
  { href: '/admin/withdrawals', label: 'Withdrawals', icon: Landmark },
  { href: '/admin/site-settings', label: 'Site Settings', icon: Settings },
  { href: '/admin/api-users', label: 'API Users', icon: KeyRound },
  { href: '/admin/send-notification', label: 'Send Notification', icon: BellRing },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const nav = (
    <div className="flex h-full flex-col bg-gradient-to-b from-card via-card to-muted/20">
      <div className="flex h-16 items-center gap-3 border-b border-border/70 px-4">
        <GhanaFlagIcon className="h-9 w-9" />
        <div>
          <p className="text-sm font-semibold text-foreground">FlashData GH</p>
          <p className="text-xs text-muted-foreground">Admin Center</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                  : 'text-muted-foreground hover:bg-muted/75 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-72 lg:border-r lg:border-border/70 lg:bg-card">
        {nav}
      </aside>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="fixed left-4 top-4 z-40 lg:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />
          <div className="absolute inset-y-0 left-0 w-[88%] max-w-xs border-r border-border/70 bg-card">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            {nav}
          </div>
        </div>
      )}
    </>
  )
}
