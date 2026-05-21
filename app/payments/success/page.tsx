'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const message = searchParams.get('message') || 'Payment verified successfully'
  const reference = searchParams.get('reference') || ''
  const nextPath = searchParams.get('next') || '/dashboard/wallet'

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Payment Successful</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            {message}
          </div>

          {reference ? (
            <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
              Reference: <span className="font-medium text-foreground">{reference}</span>
            </div>
          ) : null}

          <Button className="w-full" onClick={() => router.replace(nextPath)}>
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Payment Successful</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Loading payment details...</CardContent>
          </Card>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  )
}
