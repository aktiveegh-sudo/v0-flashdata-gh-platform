'use client'

import { useEffect, useState } from 'react'
import { KeyRound, Save, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel } from '@/components/admin/page-shell'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function AdminAccountSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) {
        toast.error(error?.message || 'Failed to load profile')
        setLoading(false)
        return
      }
      const metadata = data.user.user_metadata as { full_name?: string }
      setName(metadata?.full_name || data.user.email?.split('@')[0] || 'Admin')
      setEmail(data.user.email || '')
      setLoading(false)
    }
    void load()
  }, [])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name.trim() },
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Profile updated')
    }
    setSaving(false)
  }

  if (loading) return <FlashPageLoader />

  return (
    <AdminPageShell
      title="Account Settings"
      description="Manage your admin profile and security preferences."
    >
      <AdminPanel title="Profile" description="Update your display name. Email is managed by your auth provider.">
        <form onSubmit={saveProfile} className="grid max-w-xl gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9"
                placeholder="Your name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} readOnly disabled className="bg-gray-50 dark:bg-white/5" />
            <p className="text-xs text-gray-500 dark:text-white/50">Email cannot be changed from this panel.</p>
          </div>
          <Button type="submit" disabled={saving} className="w-fit">
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </AdminPanel>

      <AdminPanel title="Change Password" description="Password updates are handled through the secure auth flow.">
        <div className="flex max-w-xl flex-col gap-4 rounded-xl border border-dashed border-amber-300/50 bg-amber-50/50 p-5 dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Password reset</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-white/60">
                Use the forgot-password flow on the login page to receive a secure reset link via email.
              </p>
            </div>
          </div>
          <Button variant="outline" disabled className="w-fit opacity-60">
            Change Password (coming via email reset)
          </Button>
        </div>
      </AdminPanel>
    </AdminPageShell>
  )
}
