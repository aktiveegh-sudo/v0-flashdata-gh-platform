'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GhanaFlagIcon } from '@/components/loader'
import { useAuthStore, useLoadingStore } from '@/lib/store'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { User as SupabaseUser } from '@supabase/supabase-js'

type AuthTab = 'signin' | 'signup'

const featureCards = [
  {
    icon: Zap,
    title: 'Instant fulfillment',
    description: 'Data, airtime, and service requests move fast with live wallet sync.',
  },
  {
    icon: ShieldCheck,
    title: 'Protected access',
    description: 'Supabase auth, secure sessions, and profile creation handled automatically.',
  },
  {
    icon: Globe,
    title: 'Built for Ghana',
    description: 'Phone validation, local networks, and MoMo-friendly flows out of the box.',
  },
]

const trustPillars = ['MTN', 'Airtel-Tigo', 'Telecel', 'AFA']

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
    if (isAuthenticated) {
      router.push('/dashboard/overview')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session?.user) {
        clearAuth()
        return
      }

      setAuthUser(mapAuthUser(data.session.user))
    }

    void syncSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
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
          setAuthUser(mapAuthUser(data.session.user))
          toast.success('Account created successfully!')
          router.push('/dashboard/overview')
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

      setAuthUser(mapAuthUser(data.user))
      toast.success('Welcome back!')
      router.push('/dashboard/overview')
    } finally {
      setLoading(false)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,195,0,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(0,200,83,0.18),transparent_25%),linear-gradient(135deg,#08111f_0%,#0c172a_46%,#09111b_100%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div className="absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute right-[-6rem] top-1/2 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="absolute bottom-[-7rem] left-1/3 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-10">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="order-2 lg:order-1"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-white/85 backdrop-blur-xl">
            <Sparkles className="h-4 w-4 text-amber-300" />
            Fast data, airtime, and digital services for Ghana
          </div>

          <div className="mt-8 max-w-2xl space-y-6">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0.85, rotate: -6 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur-xl"
              >
                <GhanaFlagIcon className="h-16 w-16 drop-shadow-lg" />
              </motion.div>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-white/55">FlashData GH</p>
                <h1 className="mt-1 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Built for speed.
                  <span className="bg-gradient-to-r from-amber-300 via-lime-300 to-emerald-300 bg-clip-text text-transparent">
                    {' '}
                    Designed to convert.
                  </span>
                </h1>
              </div>
            </div>

            <p className="max-w-xl text-base leading-7 text-white/72 sm:text-lg">
              Manage data bundles, airtime, online services, and wallets in one polished platform.
              Sign in to a secure, modern experience powered by Supabase authentication and instant profile creation.
            </p>

            <div className="flex flex-wrap gap-3">
              {trustPillars.map((item) => (
                <div
                  key={item}
                  className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-xl"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-amber-300">
                  <BadgeCheck className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-[0.24em] text-white/50">Trusted</span>
                </div>
                <p className="mt-3 text-2xl font-bold">24/7</p>
                <p className="mt-1 text-sm text-white/60">Always-on access for users and admins</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Zap className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-[0.24em] text-white/50">Instant</span>
                </div>
                <p className="mt-3 text-2xl font-bold">Wallet sync</p>
                <p className="mt-1 text-sm text-white/60">Profiles and wallets created on signup</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-sky-300">
                  <Star className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-[0.24em] text-white/50">Clean</span>
                </div>
                <p className="mt-3 text-2xl font-bold">One flow</p>
                <p className="mt-1 text-sm text-white/60">Simple sign up, smooth sign in, no demo users</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {featureCards.map((feature, index) => {
                const Icon = feature.icon

                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.15 + index * 0.08 }}
                    className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur-xl"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-emerald-400/20 text-amber-200 shadow-lg">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-base font-semibold text-white">{feature.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/65">{feature.description}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="order-1 lg:order-2"
        >
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -left-6 top-6 h-24 w-24 rounded-full bg-amber-300/20 blur-2xl" />
            <div className="absolute -right-4 bottom-8 h-24 w-24 rounded-full bg-emerald-300/20 blur-2xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="border-b border-white/10 bg-white/5 px-6 py-5 sm:px-8">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-white/50">Secure access</p>
                    <h3 className="mt-2 text-2xl font-bold text-white">Welcome to FlashData GH</h3>
                  </div>
                  <div className="hidden rounded-full border border-emerald-300/20 bg-emerald-300/15 px-3 py-1 text-xs font-medium text-emerald-100 sm:flex">
                    Supabase Auth
                  </div>
                </div>
              </div>

              <div className="px-6 py-6 sm:px-8">
                <div className="mb-6 flex rounded-2xl border border-white/10 bg-black/20 p-1.5">
                  {(['signin', 'signup'] as AuthTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`relative flex-1 rounded-xl py-3 text-sm font-semibold transition-all ${
                        activeTab === tab ? 'text-slate-950' : 'text-white/65 hover:text-white'
                      }`}
                    >
                      {activeTab === tab && (
                        <motion.div
                          layoutId="authTab"
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-300 via-yellow-200 to-lime-200 shadow-lg"
                          transition={{ type: 'spring', duration: 0.45, bounce: 0.2 }}
                        />
                      )}
                      <span className="relative z-10">{tab === 'signin' ? 'Sign In' : 'Create Account'}</span>
                    </button>
                  ))}
                </div>

                <p className="mb-6 text-sm leading-6 text-white/65">
                  {activeTab === 'signin'
                    ? 'Access your wallet, orders, and services dashboard with your Supabase account.'
                    : 'Create your profile, wallet, and secure access in a single step.'}
                </p>

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
                          <Label htmlFor="fullName" className="text-white/80">
                            Full Name
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                            <Input
                              id="fullName"
                              name="fullName"
                              placeholder="Kwame Asante"
                              value={formData.fullName}
                              onChange={handleInputChange}
                              className="h-12 border-white/10 bg-black/20 pl-10 text-white placeholder:text-white/35 focus-visible:ring-amber-300/50"
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
                          <Label htmlFor="phone" className="text-white/80">
                            Phone Number
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                            <Input
                              id="phone"
                              name="phone"
                              type="tel"
                              placeholder="+233 24 123 4567"
                              value={formData.phone}
                              onChange={handlePhoneChange}
                              className="h-12 border-white/10 bg-black/20 pl-10 text-white placeholder:text-white/35 focus-visible:ring-amber-300/50"
                              required={activeTab === 'signup'}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/80">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="kwame@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="h-12 border-white/10 bg-black/20 pl-10 text-white placeholder:text-white/35 focus-visible:ring-amber-300/50"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white/80">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="h-12 border-white/10 bg-black/20 pl-10 pr-10 text-white placeholder:text-white/35 focus-visible:ring-amber-300/50"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white"
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
                          <Label htmlFor="confirmPassword" className="text-white/80">
                            Confirm Password
                          </Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                            <Input
                              id="confirmPassword"
                              name="confirmPassword"
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="Confirm your password"
                              value={formData.confirmPassword}
                              onChange={handleInputChange}
                              className="h-12 border-white/10 bg-black/20 pl-10 pr-10 text-white placeholder:text-white/35 focus-visible:ring-amber-300/50"
                              required={activeTab === 'signup'}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white"
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
                        <Label htmlFor="rememberMe" className="cursor-pointer text-sm text-white/65">
                          Remember me
                        </Label>
                      </div>
                      <button
                        type="button"
                        className="text-sm font-medium text-amber-200 transition hover:text-amber-100 hover:underline"
                        onClick={() => toast.error('Feature coming soon!')}
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="group mt-2 h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-amber-300 via-yellow-200 to-lime-200 font-semibold text-slate-950 shadow-[0_18px_40px_rgba(251,191,36,0.22)] transition-transform hover:scale-[1.01]"
                    size="lg"
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

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-slate-950/70 px-4 text-white/45">Or continue with</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                      onClick={() => toast.error('Social login coming soon!')}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                      onClick={() => toast.error('Social login coming soon!')}
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
+                      </svg>
+                      Facebook
+                    </Button>
+                  </div>
+                </div>
+              </div>
+
+              <div className="border-t border-white/10 bg-white/5 px-6 py-4 sm:px-8">
+                <p className="text-center text-xs leading-5 text-white/45 sm:text-sm">
+                  By continuing, you agree to our{' '}
+                  <button className="font-medium text-amber-200 transition hover:text-amber-100 hover:underline">
+                    Terms of Service
+                  </button>{' '}
                  and{' '}
                  <button className="font-medium text-amber-200 transition hover:text-amber-100 hover:underline">
                    Privacy Policy
                  </button>
                </p>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
