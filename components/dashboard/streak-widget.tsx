'use client'

import { useEffect, useState } from 'react'
import { Calendar, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'flashdata-daily-streak'

type StreakState = {
  streak: number
  lastClaim: string
}

const getTodayKey = () => new Date().toISOString().slice(0, 10)

const readStreak = (): StreakState => {
  if (typeof window === 'undefined') return { streak: 0, lastClaim: '' }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { streak: 0, lastClaim: '' }
    return JSON.parse(raw) as StreakState
  } catch {
    return { streak: 0, lastClaim: '' }
  }
}

export function StreakWidget() {
  const [streak, setStreak] = useState(0)
  const [claimedToday, setClaimedToday] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const state = readStreak()
    const today = getTodayKey()
    setClaimedToday(state.lastClaim === today)
    setStreak(state.streak)
  }, [])

  const claimStreak = () => {
    setLoading(true)
    const today = getTodayKey()
    const state = readStreak()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = yesterday.toISOString().slice(0, 10)

    const nextStreak = state.lastClaim === yesterdayKey ? state.streak + 1 : state.lastClaim === today ? state.streak : 1
    const nextState = { streak: nextStreak, lastClaim: today }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
    setStreak(nextStreak)
    setClaimedToday(true)
    setLoading(false)
    toast.success(`Daily check-in claimed! +${Math.max(0, (nextStreak - 1) * 5)} FlashPoints added.`)
  }

  return (
    <Card className="border-amber-400/20 bg-white shadow-sm dark:bg-[#0a110d]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">Instant Rewards</p>
            <h3 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{streak} day{streak === 1 ? '' : 's'}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-white/55">Claim every day to unlock bonus FlashPoints.</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-600 dark:text-amber-300">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <div
              key={day}
              className={`h-2 flex-1 rounded-full ${day <= streak % 8 || (streak > 0 && day <= streak) ? 'bg-amber-400' : 'bg-gray-200 dark:bg-white/10'}`}
            />
          ))}
        </div>

        <Button
          onClick={claimStreak}
          disabled={claimedToday || loading}
          className="mt-4 w-full rounded-full bg-amber-400 text-black hover:bg-amber-300"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {claimedToday ? 'Claimed for today' : 'Claim Now'}
        </Button>
      </CardContent>
    </Card>
  )
}
