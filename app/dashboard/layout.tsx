'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { useAuthStore, useTransactionStore, useWalletStore, type Transaction } from '@/lib/store'
import { supabase } from '@/lib/supabase/client'
import { ensureProfileAndWalletForUser } from '@/lib/supabase/profile-bootstrap'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { PageLoader } from '@/components/loader'

type DbTransaction = {
  id: string
  type: 'data_purchase' | 'airtime' | 'online_service' | 'withdrawal' | 'funding' | 'store_sale'
  amount: number
  description: string | null
  status: 'pending' | 'success' | 'failed'
  reference: string
  created_at: string
  metadata: Record<string, unknown> | null
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, setAuthUser, clearAuth } = useAuthStore()
  const { setBalance } = useWalletStore()
  const { setTransactions } = useTransactionStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [whatsappChannelUrl, setWhatsappChannelUrl] = useState('')

  const mapTransactionType = (type: DbTransaction['type']): Transaction['type'] => {
    switch (type) {
      case 'funding':
      case 'store_sale':
        return 'wallet'
      case 'data_purchase':
        return 'data'
      case 'withdrawal':
        return 'withdrawal'
      default:
        return 'bill'
    }
  }

  const syncFinancialState = async (userId: string) => {
    const [{ data: wallet }, { data: txRows }] = await Promise.all([
      supabase.client.from('wallets').select('balance').eq('user_id', userId).maybeSingle(),
      supabase.client
        .from('transactions')
        .select('id,type,amount,description,status,reference,created_at,metadata')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    setBalance(Number((wallet as { balance?: number } | null)?.balance || 0))

    const mapped = (((txRows as DbTransaction[] | null) || []).map((row) => ({
      id: row.id,
      type: mapTransactionType(row.type),
      amount: Number(row.amount || 0),
      phone: typeof row.metadata?.phone === 'string' ? row.metadata.phone : undefined,
      network: typeof row.metadata?.network === 'string' ? row.metadata.network : undefined,
      status: row.status,
      reference: row.reference,
      date: row.created_at,
      description: row.description || 'Transaction',
    })) satisfies Transaction[])

    setTransactions(mapped)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) {
      return
    }

    const ensureSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session?.user) {
        clearAuth()
        router.push('/')
        setCheckingSession(false)
        return
      }

      await ensureProfileAndWalletForUser(data.session.user)

      const metadata = data.session.user.user_metadata as { full_name?: string; phone?: string; avatar_url?: string }

      const { data: profile } = await supabase.client
        .from('profiles')
        .select('role,status')
        .eq('id', data.session.user.id)
        .maybeSingle()

      const isSuperAdmin =
        profile?.role === 'super_admin' ||
        (data.session.user.email || '').toLowerCase() === 'admin@flashdatagh.com'

      if (profile?.status === 'suspended') {
        clearAuth()
        await supabase.auth.signOut()
        router.push('/')
        setCheckingSession(false)
        return
      }

      if (isSuperAdmin) {
        router.push('/admin/overview')
        setCheckingSession(false)
        return
      }

      setAuthUser({
        id: data.session.user.id,
        name: metadata?.full_name || data.session.user.email?.split('@')[0] || 'User',
        email: data.session.user.email || '',
        phone: metadata?.phone || '',
        avatar: metadata?.avatar_url,
      })
      await syncFinancialState(data.session.user.id)
      setCheckingSession(false)
    }

    void ensureSession()
  }, [clearAuth, mounted, router, setAuthUser, setBalance, setTransactions])

  useEffect(() => {
    if (!mounted) {
      return
    }

    const loadWhatsappChannel = async () => {
      const { data } = await supabase.client
        .from('site_settings')
        .select('whatsapp_channel_url')
        .limit(1)
        .maybeSingle()

      const raw = (data as { whatsapp_channel_url?: string | null } | null)?.whatsapp_channel_url || ''
      setWhatsappChannelUrl(raw.trim())
    }

    void loadWhatsappChannel()
  }, [mounted])

  if (!mounted || checkingSession) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return <PageLoader />
  }

  return (
    <div className="vibe-dashboard-bg min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 lg:p-6">
          <div className="vibe-shell-panel rounded-3xl p-3 sm:p-4 lg:p-5">{children}</div>
        </main>
      </div>
      {whatsappChannelUrl ? (
        <a
          href={whatsappChannelUrl}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-green-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/30 transition hover:-translate-y-0.5 hover:bg-green-600"
          aria-label="Open WhatsApp channel"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp Channel
        </a>
      ) : null}
    </div>
  )
}
