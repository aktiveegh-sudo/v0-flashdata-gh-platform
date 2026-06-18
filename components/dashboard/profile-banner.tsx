'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store'

export function ProfileBanner() {
  const { user } = useAuthStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!user?.phone?.trim()) {
      setVisible(!sessionStorage.getItem('flashdata-dismiss-profile-banner'))
    } else {
      setVisible(false)
    }
  }, [user?.phone])

  if (!visible) return null

  return (
    <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Complete your profile</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-white/65">Add your phone number to receive order updates and secure your account.</p>
            <Button asChild size="sm" className="mt-3 rounded-full bg-amber-400 text-black hover:bg-amber-300">
              <Link href="/dashboard/profile">Update Profile</Link>
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem('flashdata-dismiss-profile-banner', '1')
            setVisible(false)
          }}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
