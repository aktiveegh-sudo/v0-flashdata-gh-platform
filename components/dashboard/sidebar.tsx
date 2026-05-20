'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Wallet,
  Wifi,
  Receipt,
  Store,
  Package,
  Globe,
  ShoppingCart,
  ArrowDownToLine,
  Settings,
  Code2,
  HeadphonesIcon,
  LogOut,
  ChevronDown,
  X,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore, useLoadingStore } from '@/lib/store'
import { GhanaFlagIcon } from '@/components/loader'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import toast from 'react-hot-toast'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: { label: string; href: string }[]
}

const mainNavItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard/overview', icon: Home },
  { label: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
  { label: 'AFA Registration', href: '/dashboard/afa', icon: Wifi },
  {
    label: 'Buy Data',
    href: '/dashboard/buy-data',
    icon: Wifi,
    children: [
      { label: 'MTN', href: '/dashboard/buy-data?network=mtn' },
      { label: 'Airtel-Tigo', href: '/dashboard/buy-data?network=airtel-tigo' },
      { label: 'Telecel', href: '/dashboard/buy-data?network=telecel' },
    ],
  },
  { label: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
]

const storeNavItems: NavItem[] = [
  { label: 'My Store', href: '/dashboard/my-store', icon: Store },
  { label: 'My Store Data Packages', href: '/dashboard/store-packages', icon: Package },
  { label: 'Other Online Services', href: '/dashboard/other-services', icon: Globe },
  { label: 'Store Orders', href: '/dashboard/store-orders', icon: ShoppingCart },
  { label: 'Store Transactions', href: '/dashboard/store-transactions', icon: Receipt },
  { label: 'Withdrawal', href: '/dashboard/withdrawal', icon: ArrowDownToLine },
  { label: 'Store Settings', href: '/dashboard/store-settings', icon: Settings },
]

const bottomNavItems: NavItem[] = [
  { label: 'Developer API', href: '/dashboard/developer-api', icon: Code2 },
  { label: 'Contact Support', href: '/dashboard/contact-support', icon: HeadphonesIcon },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user } = useAuthStore()
  const { setLoading } = useLoadingStore()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    )
  }

  const handleLogout = async () => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    logout()
    setLoading(false)
    toast.success('Logged out successfully')
    router.push('/')
  }

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '?')
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.label)

    if (hasChildren) {
      return (
        <div>
          <button
            onClick={() => toggleExpanded(item.label)}
            className={cn(
              'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
              isActive || isExpanded
                ? 'bg-primary/12 text-primary shadow-sm'
                : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
                isActive || isExpanded
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                  : 'bg-sidebar-accent/60'
              )}>
                <item.icon className="h-4 w-4" />
              </div>
              <span>{item.label}</span>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </button>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-8 mt-1 space-y-1 border-l-2 border-primary/20 pl-3">
                  {item.children?.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onClose}
                      className={cn(
                        'block rounded-lg px-3 py-2 text-sm transition-all',
                        pathname === child.href || pathname.includes(child.href)
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    }

    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={cn(
          'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary/12 text-primary shadow-sm'
            : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
        )}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active-indicator"
            className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary"
          />
        )}
        <div className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
            : 'bg-sidebar-accent/60'
        )}>
          <item.icon className="h-4 w-4" />
        </div>
        <span>{item.label}</span>
      </Link>
    )
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-gradient-to-b from-sidebar via-sidebar to-sidebar-accent/20">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border/70 px-4">
        <Link href="/dashboard/overview" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <GhanaFlagIcon className="h-6 w-6" />
          </div>
          <span className="text-lg font-bold text-sidebar-foreground">
            Flash<span className="text-primary">Data</span>
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-1">
          {/* Main Section */}
          <div className="mb-2">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Main
            </p>
            {mainNavItems.map((item) => (
              <NavLink key={item.label} item={item} />
            ))}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-sidebar-border" />

          {/* Store Section */}
          <div className="mb-2">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              My Store
            </p>
            {storeNavItems.map((item) => (
              <NavLink key={item.label} item={item} />
            ))}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-sidebar-border" />

          {/* Bottom Section */}
          <div>
            {bottomNavItems.map((item) => (
              <NavLink key={item.label} item={item} />
            ))}
          </div>
        </nav>
      </div>

      {/* User Profile Footer */}
      <div className="border-t border-sidebar-border/70 p-3">
        <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/45 px-3 py-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {user?.name ? getInitials(user.name) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user?.name || 'User'}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/50">
              {user?.email || ''}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:border-r lg:border-sidebar-border/70 lg:bg-sidebar">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-sidebar-border/70 bg-sidebar lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
