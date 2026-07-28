import { Suspense } from 'react'
import AuthPage from './auth-client'

export default function AgentAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">Loading?</div>
      }
    >
      <AuthPage />
    </Suspense>
  )
}
