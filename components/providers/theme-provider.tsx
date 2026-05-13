'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/lib/store'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, accent } = useThemeStore()

  useEffect(() => {
    const root = document.documentElement
    
    // Apply dark mode
    if (mode === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    
    // Remove all theme classes
    root.classList.remove('theme-blue', 'theme-orange', 'theme-purple')
    
    // Apply accent theme
    if (accent !== 'default') {
      root.classList.add(`theme-${accent}`)
    }
  }, [mode, accent])

  return <>{children}</>
}
