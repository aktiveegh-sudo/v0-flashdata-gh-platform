'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlashPageLoader } from '@/components/flash-loader'
import { supabase } from '@/lib/supabase/client'

/** Blocks active subagents from recruit / referral pages. */
export function SubAgentRecruitGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user?.id
      if (!uid) {
        router.replace('/agent/auth')
        return
      }

      const { data: link } = await supabase.client
        .from('sub_agents')
        .select('id')
        .eq('user_id', uid)
        .eq('status', 'active')
        .maybeSingle()

      if (link) {
        router.replace('/dashboard')
        return
      }

      setAllowed(true)
    }

    void check()
  }, [router])

  if (!allowed) return <FlashPageLoader />
  return <>{children}</>
}
