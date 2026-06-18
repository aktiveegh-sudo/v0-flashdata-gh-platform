'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, LogOut, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminNavSections, type AdminNavItem } from '@/lib/admin/nav'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

type AdminSidebarProps = {
  userName: string
  onLogout: () => void
}

export function AdminSidebar({ userName, onLogout }: AdminSidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(
    adminNavSections.map((section) => section.title)
  )

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]
    )
  }

  const isItemActive = (item: AdminNavItem) =>
    pathname === item.href || pathname.startsWith(`${item.href}/`)

  const NavLink = ({ item }: { item: AdminNavItem }) => {
    const isActive = isItemActive(item)

    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
          isActive
            ? 'bg-amber-400/15 text-amber-700 dark:text-amber-200'
            : 'text-gray-600 hover:bg-gray-100 dark:text-white/70 dark:hover:bg-white/5'
        )}
      >
        <item.icon className="h-4 w-4" />
        <span className="flex-1">{item.label}</span>
      </Link>
    )
  }

  const sidebarContent = (
    <div className="flex h-full flex-col border-r border-gray-200 bg-white dark:border-white/8 dark:bg-[#0a110d]">
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-white/8">
        <Link href="/admin/overview" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-xs font-black text-black">
            FD
          </div>
          <div>
            <p className="text-sm font-black leading-none">
              FlashData <span className="text-amber-500">GH</span>
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Admin Console</p>
          </div>
        </Link>
        <button type="button" className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <nav className="space-y-4">
          {adminNavSections.map((section) => {
            const isExpanded = expandedSections.includes(section.title)
            const hasActive = section.items.some(isItemActive)

            return (
              <div key={section.title}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className={cn(
                    'mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left',
                    hasActive ? 'text-amber-600 dark:text-amber-300' : 'text-gray-400'
                  )}
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{section.title}</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')} />
                </button>
                <AnimatePresence initial={false}>
                  {isExpanded ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-1 overflow-hidden"
                    >
                      {section.items.map((item) => (
                        <NavLink key={item.href} item={item} />
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-gray-200 p-3 dark:border-white/8">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/8 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-amber-400 text-xs font-bold text-black">
                {userName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{userName}</p>
              <p className="text-[10px] uppercase tracking-wide text-gray-400">Super Admin</p>
            </div>
          </div>
          <button
            onClick={onLogout}
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
      <button
        type="button"
        className="fixed left-4 top-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm lg:hidden dark:border-white/10 dark:bg-white/5 dark:text-white"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-72">{sidebarContent}</aside>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
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
