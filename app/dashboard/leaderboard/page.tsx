'use client'

import { useEffect, useState } from 'react'
import { Trophy, Flame, Medal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DashboardPageShell,
  DashboardPanel,
  DashboardStatGrid,
  DashboardStatCard,
} from '@/components/dashboard/page-shell'
import { FlashPageLoader } from '@/components/flash-loader'
import { fetchLeaderboard, type LeaderboardEntry } from '@/lib/dashboard/agent-pages-data'

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const rows = await fetchLeaderboard()
        setEntries(rows)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load leaderboard')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const topPoints = entries[0]?.points ?? 0
  const topStreak = entries.reduce((max, row) => Math.max(max, row.streak), 0)

  if (loading) return <FlashPageLoader />

  if (error) {
    return (
      <DashboardPageShell title="Leaderboard" description="Top performing agents on FlashData GH.">
        <DashboardPanel>
          <p className="text-sm text-red-500">{error}</p>
        </DashboardPanel>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell
      title="Leaderboard"
      description="See how you stack up against other agents by loyalty points and streaks."
      stats={
        <DashboardStatGrid>
          <DashboardStatCard label="Ranked Agents" value={String(entries.length)} icon={Trophy} />
          <DashboardStatCard label="Top Score" value={String(topPoints)} hint="FlashPoints" icon={Medal} />
          <DashboardStatCard label="Best Streak" value={String(topStreak)} hint="days" icon={Flame} />
        </DashboardStatGrid>
      }
    >
      <DashboardPanel title="Top Agents" description="Ranked by loyalty points earned from successful orders.">
        {entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500 dark:text-white/50">
            No leaderboard data yet. Complete orders to earn FlashPoints.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-white/5 dark:text-white/45">
                  <th className="pb-3 pr-4 font-semibold">Rank</th>
                  <th className="pb-3 pr-4 font-semibold">Agent</th>
                  <th className="pb-3 pr-4 font-semibold">Points</th>
                  <th className="pb-3 font-semibold">Streak</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={`${entry.rank}-${entry.name}`}
                    className="border-b border-gray-50 last:border-0 dark:border-white/[0.03]"
                  >
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black ${
                          entry.rank === 1
                            ? 'bg-amber-400 text-black'
                            : entry.rank === 2
                              ? 'bg-gray-200 text-gray-800 dark:bg-white/15 dark:text-white'
                              : entry.rank === 3
                                ? 'bg-amber-700/20 text-amber-700 dark:text-amber-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-white/60'
                        }`}
                      >
                        #{entry.rank}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-semibold text-gray-900 dark:text-white">{entry.name}</td>
                    <td className="py-3 pr-4">
                      <Badge className="bg-amber-400/15 text-amber-700 hover:bg-amber-400/20 dark:text-amber-400">
                        {entry.points} pts
                      </Badge>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 text-gray-600 dark:text-white/65">
                        <Flame className="h-3.5 w-3.5 text-orange-500" />
                        {entry.streak} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardPanel>
    </DashboardPageShell>
  )
}
