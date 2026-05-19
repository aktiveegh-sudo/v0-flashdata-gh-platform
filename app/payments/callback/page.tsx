'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PaymentsCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reference = searchParams.get('reference') || searchParams.get('trxref') || ''
  const nextPath = searchParams.get('next') || '/dashboard/wallet'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('Verifying your payment...')

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setError('Missing payment reference')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`)
      const result = (await response.json()) as {
        success: boolean
        error?: string
        data?: { redirectPath?: string; message?: string }
      }

      if (!response.ok || !result.success) {
        setError(result.error || 'Unable to verify payment')
        setLoading(false)
        return
      }

      setMessage(result.data?.message || 'Payment verified successfully')
      setLoading(false)

      const redirectTarget = result.data?.redirectPath || nextPath
      window.setTimeout(() => {
        router.replace(redirectTarget)
      }, 1800)
    }

    void verifyPayment()
  }, [nextPath, reference, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Payment Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {message}
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
                <AlertCircle className="h-5 w-5" />
                {error}
              </div>
              <Button variant="outline" className="w-full" onClick={() => router.replace(nextPath)}>
                Go Back
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                {message}
              </div>
              <p className="text-sm text-muted-foreground">Redirecting you now...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}