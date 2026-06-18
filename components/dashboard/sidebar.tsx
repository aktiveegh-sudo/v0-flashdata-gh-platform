'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, LogOut, Menu, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dashboardNavSections, type DashboardNavItem } from '@/lib/dashboard/nav'
import { useAuthStore, useLoadingStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import toast from 'react-hot-toast'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user } = useAuthStore()
  const { setLoading } = useLoadingStore()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Buy Data'])

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    )
  }

  const handleLogout = async () => {
    setLoading(true)
    sessionStorage.setItem('flashdata-just-signed-out', '1')
    logout()
    setLoading(false)
    toast.success('Logged out successfully')
    router.push('/')
  }

  const isItemActive = (item: DashboardNavItem) =>
    pathname === item.href || pathname.startsWith(`${item.href}?`) || pathname.startsWith(`${item.href}/`)

  const NavLink = ({ item }: { item: DashboardNavItem }) => {
    const isActive = isItemActive(item)
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.label)

    if (hasChildren) {
      return (
        <div>
          <button
            onClick={() => toggleExpanded(item.label)}
            className={cn(
              'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition',
              isActive || isExpanded
                ? 'bg-amber-400/15 text-amber-700 dark:text-amber-200'
                : 'text-gray-600 hover:bg-gray-100 dark:text-white/70 dark:hover:bg-white/5'
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </div>
            <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {isExpanded ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="ml-8 mt-1 space-y-1 border-l border-gray-200 pl-3 dark:border-white/10">
                  {item.children?.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onClose}
                      className={cn(
                        'block rounded-lg px-3 py-2 text-sm',
                        pathname === child.href
                          ? 'bg-amber-400 font-semibold text-black'
                          : 'text-gray-500 hover:bg-gray-100 dark:text-white/55 dark:hover:bg-white/5'
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )
    }

    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
          isActive
            ? 'bg-amber-400/15 text-amber-700 dark:text-amber-200'
            : 'text-gray-600 hover:bg-gray-100 dark:text-white/70 dark:hover:bg-white/5'
        )}
      >
        <item.icon className="h-4 w-4" />
        <span className="flex-1">{item.label}</span>
        {item.badge ? <Badge className="h-5 rounded-full bg-amber-400 px-1.5 text-[10px] text-black">{item.badge}</Badge> : null}
      </Link>
    )
  }

  const sidebarContent = (
    <div className="flex h-full flex-col border-r border-gray-200 bg-white dark:border-white/8 dark:bg-[#0a110d]">
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-white/8">
        <Link href="/dashboard/overview" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-xs font-black text-black">FD</div>
          <div>
            <p className="text-sm font-black leading-none">
              FlashData <span className="text-amber-500">GH</span>
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Dashboard</p>
          </div>
        </Link>
        <button type="button" className="lg:hidden" onClick={onClose} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <nav className="space-y-5">
          {dashboardNavSections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">{section.title}</p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink key={item.label} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-gray-200 p-3 dark:border-white/8">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/8 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-amber-400 text-black text-xs font-bold">
                {user?.name ? getInitials(user.name) : <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.name || 'Agent'}</p>
              <p className="text-[10px] uppercase tracking-wide text-gray-400">Online</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-72">{sidebarContent}</aside>
      <AnimatePresence>
        {isOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 z-50 w-80 max-w-[88vw] lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  )
}
