'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { PageLoader } from '@/components/loader'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/')
    }
  }, [mounted, isAuthenticated, router])

  if (!mounted) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return <PageLoader />
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
