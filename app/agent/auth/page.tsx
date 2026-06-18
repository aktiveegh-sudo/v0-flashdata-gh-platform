'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

    return isSuperAdmin ? '/admin/overview' : '/dashboard/overview'
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

      const nextRoute = await resolvePostAuthRoute(data.session.user)
      router.push(nextRoute)
    }

    void redirectAuthenticatedUser()
  }, [isAuthenticated, router])

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
          toast.success('Account created successfully!')
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
      toast.success('Welcome back!')
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
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-500">Agent Access</p>
            <h1 className="mt-3 text-4xl font-black leading-tight">Sign in to your FlashData dashboard</h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-gray-500 dark:text-white/60">
              Manage your wallet, buy data at agent prices, run your store, and track every order in one place.
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
                    >
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input
                            id="fullName"
                            name="fullName"
                            placeholder="Kwame Asante"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            className="h-11 pl-10"
                            required={activeTab === 'signup'}
                          />
                        </div>
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
                    >
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder="+233 24 123 4567"
                            value={formData.phone}
                            onChange={handlePhoneChange}
                            className="h-11 pl-10"
                            required={activeTab === 'signup'}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="kwame@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="h-11 pl-10"
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
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="h-11 pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700 dark:hover:text-white"
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
                    >
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm your password"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            className="h-11 pl-10 pr-10"
                            required={activeTab === 'signup'}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700 dark:hover:text-white"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {activeTab === 'signin' && (
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="rememberMe"
                        checked={formData.rememberMe}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, rememberMe: checked as boolean }))
                        }
                      />
                      <Label htmlFor="rememberMe" className="cursor-pointer text-sm text-gray-500">
                        Remember me
                      </Label>
                    </div>
                    <button
                      type="button"
                      className="text-sm font-medium text-amber-600 transition hover:text-amber-500 hover:underline dark:text-amber-300"
                      onClick={() => toast.error('Feature coming soon!')}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  className="group h-11 w-full gap-2 rounded-full bg-amber-400 font-bold text-black hover:bg-amber-300"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span>Please wait...</span>
                    </div>
                  ) : (
                    <>
                      <span>{activeTab === 'signin' ? 'Sign In' : 'Create Account'}</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-gray-400 dark:text-white/40">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </MainSiteShell>
  )
}
