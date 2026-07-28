'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  Wifi,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MainSiteShell } from '@/components/public/main-site-shell'
import { useAuthStore, useLoadingStore } from '@/lib/store'
import { supabase } from '@/lib/supabase/client'
import { ensureProfileAndWalletForUser } from '@/lib/supabase/profile-bootstrap'
import toast from 'react-hot-toast'
import type { User as SupabaseUser } from '@supabase/supabase-js'

type AuthTab = 'signin' | 'signup'

const highlights = [
  { icon: Wifi, title: 'Buy & sell data', text: 'MTN, Telecel and AirtelTigo bundles from one dashboard.' },
  { icon: ShieldCheck, title: 'Secure wallet', text: 'Top up, track orders, and manage your store safely.' },
]

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const joinAsSubagent = searchParams.get('as') === 'subagent'
  const storeSlug = (searchParams.get('store') || '').trim().toLowerCase()
  const { setAuthUser, clearAuth, isAuthenticated } = useAuthStore()
  const { setLoading } = useLoadingStore()
  const [activeTab, setActiveTab] = useState<AuthTab>('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    rememberMe: false,
  })

  const maybeLinkSubAgent = async (_user: SupabaseUser) => {
    if (!joinAsSubagent || !storeSlug) return { ok: true as const }

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) {
      return { ok: false as const, error: 'Session expired. Please sign in again.' }
    }

    const response = await fetch('/api/dashboard/subagents/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ storeSlug }),
    })

    const result = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
    if (!response.ok || !result?.success) {
      return { ok: false as const, error: result?.error || 'Unable to join as subagent' }
    }

    return { ok: true as const }
  }

  const resolvePostAuthRoute = async (user: SupabaseUser) => {
    const fallbackAdmin = (user.email || '').toLowerCase() === 'admin@flashdatagh.com'

    const { data: profile } = await supabase.client
      .from('profiles')
      .select('role,status')
      .eq('id', user.id)
      .maybeSingle()

    const isSuperAdmin = profile?.role === 'super_admin' || fallbackAdmin
    const isSuspended = profile?.status === 'suspended'

    if (isSuspended) {
      await supabase.auth.signOut()
      clearAuth()
      toast.error('Your account is suspended. Contact support.')
      return '/'
    }

    return isSuperAdmin ? '/admin' : '/dashboard'
  }

  const mapAuthUser = (user: SupabaseUser) => {
    const metadata = user.user_metadata as {
      full_name?: string
      phone?: string
      avatar_url?: string
    }

    return {
      id: user.id,
      name: metadata?.full_name || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      phone: metadata?.phone || '',
      avatar: metadata?.avatar_url,
    }
  }

  const normalizeGhanaPhone = (value: string) => {
    const digits = value.replace(/\D/g, '')

    if (digits.startsWith('233') && digits.length === 12) {
      return `+${digits}`
    }

    if (digits.startsWith('0') && digits.length === 10) {
      return `+233${digits.slice(1)}`
    }

    return ''
  }

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '')

    if (digits.startsWith('233')) {
      return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 12)}`
    }

    if (digits.startsWith('0')) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`
    }

    return value
  }

  useEffect(() => {
    const redirectAuthenticatedUser = async () => {
      if (sessionStorage.getItem('flashdata-just-signed-out') === '1') {
        sessionStorage.removeItem('flashdata-just-signed-out')
        await supabase.auth.signOut()
        clearAuth()
        return
      }

      if (!isAuthenticated) {
        return
      }

      const { data } = await supabase.auth.getSession()
      if (!data.session?.user) {
        return
      }

      if (joinAsSubagent && storeSlug) {
        const linked = await maybeLinkSubAgent(data.session.user)
        if (!linked.ok) {
          toast.error(linked.error)
          return
        }
        toast.success('You are now a sub-agent for this store')
      }

      const nextRoute = await resolvePostAuthRoute(data.session.user)
      router.push(nextRoute)
    }

    void redirectAuthenticatedUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, router, joinAsSubagent, storeSlug])

  useEffect(() => {
    const syncSession = async () => {
      if (sessionStorage.getItem('flashdata-just-signed-out') === '1') {
        sessionStorage.removeItem('flashdata-just-signed-out')
        await supabase.auth.signOut()
        clearAuth()
        return
      }

      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session?.user) {
        clearAuth()
        return
      }

      await ensureProfileAndWalletForUser(data.session.user)

      setAuthUser(mapAuthUser(data.session.user))
    }

    void syncSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void ensureProfileAndWalletForUser(session.user)
        setAuthUser(mapAuthUser(session.user))
      } else {
        clearAuth()
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [clearAuth, setAuthUser])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setFormData((prev) => ({ ...prev, phone: formatted }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (activeTab === 'signup' && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    setLoading(true)

    try {
      if (activeTab === 'signup') {
        const normalizedPhone = normalizeGhanaPhone(formData.phone)

        if (!normalizedPhone) {
          toast.error('Please enter a valid Ghana phone number')
          return
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              phone: normalizedPhone,
            },
          },
        })

        if (error) {
          toast.error(error.message)
          return
        }

        if (data.session?.user) {
          await ensureProfileAndWalletForUser(data.session.user)
          setAuthUser(mapAuthUser(data.session.user))
          const linked = await maybeLinkSubAgent(data.session.user)
          if (!linked.ok) {
            toast.error(linked.error)
            return
          }
          toast.success(
            joinAsSubagent ? 'Account created — you are now a sub-agent!' : 'Account created successfully!'
          )
          const nextRoute = await resolvePostAuthRoute(data.session.user)
          router.push(nextRoute)
          return
        }

        toast.success('Account created. Please check your email to verify your account.')
        setActiveTab('signin')
        setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' }))
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error || !data.user) {
        toast.error(error?.message || 'Unable to sign in')
        return
      }

      await ensureProfileAndWalletForUser(data.user)

      setAuthUser(mapAuthUser(data.user))
      const linked = await maybeLinkSubAgent(data.user)
      if (!linked.ok) {
        toast.error(linked.error)
        return
      }
      toast.success(joinAsSubagent ? 'Welcome — sub-agent access ready!' : 'Welcome back!')
      const nextRoute = await resolvePostAuthRoute(data.user)
      router.push(nextRoute)
    } finally {
      setLoading(false)
      setIsSubmitting(false)
    }
  }

  return (
    <MainSiteShell activeTab="agent">
      <section className="px-4 py-12 sm:px-6 md:py-20">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="hidden lg:block">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-500">
              {joinAsSubagent ? 'Sub-Agent Access' : 'Agent Access'}
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight">
              {joinAsSubagent ? 'Join as a sub-agent' : 'Sign in to your FlashData dashboard'}
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-gray-500 dark:text-white/60">
              {joinAsSubagent
                ? `Create an account or sign in to get your own wallet and store under ${storeSlug || 'this agent'}.`
                : 'Manage your wallet, buy data at agent prices, run your store, and track every order in one place.'}
            </p>
            <div className="mt-8 space-y-4">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-300">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold">{item.title}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-white/55">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {['MTN', 'Airtel-Tigo', 'Telecel', 'AFA'].map((network) => (
                <span
                  key={network}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                >
                  {network}
                </span>
              ))}
            </div>
          </div>

          <Card className="border-gray-200 shadow-sm dark:border-white/8">
            <CardHeader className="border-b border-gray-100 dark:border-white/8">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-500">Secure access</p>
              <CardTitle className="text-2xl font-black">Welcome to FlashData GH</CardTitle>
              <p className="text-sm text-gray-500 dark:text-white/55">
                {activeTab === 'signin'
                  ? 'Access your wallet, orders, and agent dashboard.'
                  : 'Create your profile and wallet in one step.'}
              </p>
            </CardHeader>

            <CardContent className="p-6 sm:p-8">
              <div className="mb-6 flex rounded-2xl border border-gray-200 bg-gray-50 p-1 dark:border-white/10 dark:bg-white/5">
                {(['signin', 'signup'] as AuthTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`relative flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                      activeTab === tab
                        ? 'bg-amber-400 text-black shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 dark:text-white/55 dark:hover:text-white'
                    }`}
                  >
                    {tab === 'signin' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {activeTab === 'signup' && (
                    <motion.div
                      key="fullName"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <Label htmlFor="fullName">Full name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          id="fullName"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          className="pl-10"
                          required
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {activeTab === 'signup' && (
                    <motion.div
                      key="phone"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <Label htmlFor="phone">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          placeholder="024 123 4567"
                          className="pl-10"
                          required
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === 'signup' && (
                    <motion.div
                      key="confirmPassword"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <Label htmlFor="confirmPassword">Confirm password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className="pl-10 pr-10"
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {activeTab === 'signin' ? (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rememberMe"
                      checked={formData.rememberMe}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, rememberMe: Boolean(checked) }))
                      }
                    />
                    <Label htmlFor="rememberMe" className="text-sm font-normal text-gray-500">
                      Remember me
                    </Label>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-amber-400 text-black hover:bg-amber-300"
                  size="lg"
                >
                  {isSubmitting ? 'Please wait…' : activeTab === 'signin' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </MainSiteShell>
  )
}
