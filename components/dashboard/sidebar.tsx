'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, LogOut, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  dashboardMainNavItems,
  dashboardMoreNavItems,
  isDashboardNavActive,
  type DashboardNavItem,
} from '@/lib/dashboard/nav'
import { useAuthStore, useLoadingStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

type ParentStoreBranding = {
  store_name: string | null
  store_logo_url: string | null
}

type ProfileMeta = {
  referral_code?: string | null
}

type SubAgentMeta = {
  parent_agent_id: string
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user } = useAuthStore()
  const { setLoading } = useLoadingStore()
  const [moreOpen, setMoreOpen] = useState(() =>
    dashboardMoreNavItems.some((item) => isDashboardNavActive(pathname, item.href))
  )
  const [now, setNow] = useState(new Date())
  const [profileMeta, setProfileMeta] = useState<ProfileMeta | null>(null)
  const [subAgentMeta, setSubAgentMeta] = useState<SubAgentMeta | null>(null)
  const [parentStore, setParentStore] = useState<ParentStoreBranding | null>(null)

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  useEffect(() => {
    if (dashboardMoreNavItems.some((item) => isDashboardNavActive(pathname, item.href))) {
      setMoreOpen(true)
    }
  }, [pathname])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const loadProfileMeta = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (!userId) return

      const { data: profile } = await supabase.client
        .from('profiles')
        .select('referral_code')
        .eq('id', userId)
        .maybeSingle()

      setProfileMeta((profile as ProfileMeta | null) || null)

      const { data: subAgent } = await supabase.client
        .from('sub_agents')
        .select('parent_agent_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle()

      const subMeta = (subAgent as SubAgentMeta | null) || null
      setSubAgentMeta(subMeta)

      if (subMeta?.parent_agent_id) {
        const { data: store } = await supabase.client
          .from('agent_stores')
          .select('store_name, store_logo_url')
          .eq('user_id', subMeta.parent_agent_id)
          .maybeSingle()

        setParentStore((store as ParentStoreBranding | null) || null)
      }
    }

    void loadProfileMeta()
  }, [user?.id])

  const handleLogout = async () => {
    setLoading(true)
    sessionStorage.setItem('flashdata-just-signed-out', '1')
    logout()
    setLoading(false)
    toast.success('Logged out successfully')
    router.push('/')
  }

  const isSubAgentOnly = Boolean(subAgentMeta?.parent_agent_id)

  const visibleMoreItems = dashboardMoreNavItems.filter(
    (item) => !(isSubAgentOnly && item.subAgentHidden)
  )

  const referenceId = profileMeta?.referral_code
    ? `DH-${profileMeta.referral_code}`
    : user?.id
      ? `DH-${user.id.slice(0, 8).toUpperCase()}`
      : 'DH-USER'

  const NavLink = ({ item }: { item: DashboardNavItem }) => {
    const isActive = isDashboardNavActive(pathname, item.href)

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
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.badge ? (
          <Badge className="h-5 rounded-full bg-amber-400 px-1.5 text-[10px] text-black">{item.badge}</Badge>
        ) : null}
      </Link>
    )
  }

  const sidebarContent = (
    <div
      className={cn(
        'flex h-full flex-col border-r shadow-2xl',
        'border-gray-200 bg-white dark:border-white/5 dark:bg-[#0d140d]/95 dark:backdrop-blur-xl'
      )}
    >
      <div className="flex items-center justify-between p-6">
        <Link href="/" className="group flex min-w-0 items-center gap-3" onClick={onClose}>
          {parentStore?.store_logo_url ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white">
              <img src={parentStore.store_logo_url} alt="Store logo" className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-xs font-black text-black">
              FD
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-tight text-gray-900 transition-colors group-hover:text-amber-600 dark:text-white">
              {parentStore?.store_name || (
                <>
                  FlashData <span className="text-amber-500">GH</span>
                </>
              )}
            </p>
            <p className="truncate text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {parentStore ? 'Reseller Partner' : 'Agent Console'}
            </p>
          </div>
        </Link>
        <button
          type="button"
          className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white lg:hidden"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <nav className="space-y-1">
          {dashboardMainNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setMoreOpen((prev) => !prev)}
            className={cn(
              'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition',
              moreOpen
                ? 'bg-amber-400/10 text-amber-700 dark:text-amber-200'
                : 'text-gray-600 hover:bg-gray-100 dark:text-white/70 dark:hover:bg-white/5'
            )}
          >
            <span>More Options</span>
            <span className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{visibleMoreItems.length}</span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', moreOpen && 'rotate-180')} />
            </span>
          </button>

          <AnimatePresence>
            {moreOpen ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-1 space-y-1 border-l border-gray-200 pl-3 dark:border-white/10">
                  {visibleMoreItems.map((item) => (
                    <NavLink key={item.href} item={item} />
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="border-t border-gray-200 p-4 dark:border-white/8">
        <div className="mb-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <span>{referenceId}</span>
          <span>{format(now, 'hh:mm:ss a')}</span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/8 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-amber-400 text-xs font-bold text-black">
                {user?.name ? getInitials(user.name) : <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.name || 'Agent'}</p>
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Online
              </p>
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
