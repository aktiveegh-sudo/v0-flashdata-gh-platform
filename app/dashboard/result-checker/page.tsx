'use client'

import { useState } from 'react'
import { GraduationCap, Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  DashboardPageShell,
  DashboardPanel,
} from '@/components/dashboard/page-shell'

type ExamType = 'BECE' | 'WASSCE'

export default function ResultCheckerPage() {
  const [indexNumber, setIndexNumber] = useState('')
  const [examType, setExamType] = useState<ExamType>('BECE')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<{ name: string; grade: string; year: string } | null>(null)

  const handleCheck = async () => {
    const trimmed = indexNumber.trim()
    if (!trimmed || trimmed.length < 8) {
      return
    }

    setChecking(true)
    setResult(null)

    await new Promise((resolve) => window.setTimeout(resolve, 1800))

    setResult({
      name: 'Sample Candidate',
      grade: examType === 'BECE' ? 'Aggregate 12' : 'Credits: 6 | Passes: 2',
      year: '2025',
    })
    setChecking(false)
  }

  return (
    <DashboardPageShell
      title="Result Checker"
      description="Check BECE and WASSCE results by index number."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardPanel title="Check Results">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exam-type">Exam Type</Label>
              <Select value={examType} onValueChange={(v) => setExamType(v as ExamType)}>
                <SelectTrigger id="exam-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BECE">BECE</SelectItem>
                  <SelectItem value="WASSCE">WASSCE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="index">Index Number</Label>
              <Input
                id="index"
                placeholder="e.g. 012345678901"
                value={indexNumber}
                onChange={(e) => setIndexNumber(e.target.value.replace(/\s/g, ''))}
                className="font-mono"
              />
            </div>

            <Button
              onClick={() => void handleCheck()}
              disabled={checking || indexNumber.trim().length < 8}
              className="w-full gap-2 bg-amber-400 text-black hover:bg-amber-300"
            >
              {checking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Check Result
                </>
              )}
            </Button>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Result">
          {checking ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-gray-500 dark:text-white/50">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <p className="text-sm">Querying {examType} database...</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15">
                  <GraduationCap className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/45">
                    {examType} · {result.year}
                  </p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">{result.name}</p>
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                <p className="text-xs text-gray-500 dark:text-white/45">Index: {indexNumber}</p>
                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{result.grade}</p>
              </div>
              <Badge variant="secondary" className="bg-amber-400/15 text-amber-700 dark:text-amber-400">
                Placeholder result — live WAEC integration coming soon
              </Badge>
            </div>
          ) : (
            <div className="flex min-h-[200px] items-center justify-center text-sm text-gray-500 dark:text-white/50">
              Enter an index number and tap Check Result
            </div>
          )}
        </DashboardPanel>
      </div>
    </DashboardPageShell>
  )
}
