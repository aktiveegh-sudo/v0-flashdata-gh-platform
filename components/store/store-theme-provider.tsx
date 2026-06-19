'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type StoreThemeContextValue = {
  isDark: boolean
  toggleTheme: () => void
}

const StoreThemeContext = createContext<StoreThemeContextValue>({
  isDark: false,
  toggleTheme: () => undefined,
})

export function StoreThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('flashdata-store-theme')
    if (stored === 'dark') setIsDark(true)
    else if (stored === 'light') setIsDark(false)
    else setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [])

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev
      localStorage.setItem('flashdata-store-theme', next ? 'dark' : 'light')
      return next
    })
  }

  return (
    <StoreThemeContext.Provider value={{ isDark, toggleTheme }}>
      <div className={isDark ? 'dark' : ''}>{children}</div>
    </StoreThemeContext.Provider>
  )
}

export const useStoreTheme = () => useContext(StoreThemeContext)
