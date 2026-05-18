'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageLoader } from '@/components/loader'
import { AccessDenied } from '@/components/admin/access-denied'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'
import { supabase } from '@/lib/supabase/client'
import { ensureProfileAndWalletForUser } from '@/lib/supabase/profile-bootstrap'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { setAuthUser, clearAuth } = useAuthStore()
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [name, setName] = useState('Admin')
  const [email, setEmail] = useState('admin@flashdatagh.com')

  useEffect(() => {
    const checkAccess = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session?.user) {
        clearAuth()
        router.push('/')
        return
      }

      const authUser = data.session.user
      await ensureProfileAndWalletForUser(authUser)
      const metadata = authUser.user_metadata as { full_name?: string; phone?: string; avatar_url?: string }

      setAuthUser({
        id: authUser.id,
        name: metadata?.full_name || authUser.email?.split('@')[0] || 'Admin',
        email: authUser.email || '',
        phone: metadata?.phone || '',
        avatar: metadata?.avatar_url,
      })

      setName(metadata?.full_name || authUser.email?.split('@')[0] || 'Admin')
      setEmail(authUser.email || '')

      const { data: profile } = await supabase.client
        .from('profiles')
        .select('role,status')
        .eq('id', authUser.id)
        .maybeSingle()

      const isSuperAdmin =
        profile?.role === 'super_admin' ||
        (authUser.email || '').toLowerCase() === 'admin@flashdatagh.com'

      if (!isSuperAdmin || profile?.status === 'suspended') {
        setAuthorized(false)
      } else {
        setAuthorized(true)
      }

      setChecking(false)
    }

    void checkAccess()
  }, [clearAuth, router, setAuthUser])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      toast.error(error.message)
      return
    }

    clearAuth()
    router.push('/')
  }

  if (checking) {
    return <PageLoader />
  }

  if (!authorized) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <AccessDenied />
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="lg:pl-72">
        <AdminHeader userName={name} userEmail={email} onLogout={handleLogout} />
        <main className="px-4 py-4 lg:px-6 lg:py-6">{children}</main>
      </div>
    </div>
  )
}
