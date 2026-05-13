'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Palette, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useThemeStore } from '@/lib/store'

const accentColors = [
  { id: 'default', name: 'Ghana Green', color: '#00C853' },
  { id: 'blue', name: 'Royal Blue', color: '#2563EB' },
  { id: 'orange', name: 'Sunset Orange', color: '#F97316' },
  { id: 'purple', name: 'Purple', color: '#9333EA' },
] as const

export function ThemeSwitcher() {
  const { mode, accent, setMode, setAccent, toggleMode } = useThemeStore()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex items-center gap-2">
      {/* Light/Dark Mode Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMode}
        className="relative h-9 w-9"
        aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'light' ? (
            <motion.div
              key="sun"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.2 }}
            >
              <Sun className="h-5 w-5" />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ scale: 0, rotate: 180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: -180 }}
              transition={{ duration: 0.2 }}
            >
              <Moon className="h-5 w-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>

      {/* Accent Color Picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            aria-label="Change accent color"
          >
            <Palette className="h-5 w-5" />
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background"
              style={{
                backgroundColor: accentColors.find((c) => c.id === accent)?.color,
              }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-4">
          <div className="space-y-4">
            {/* Mode Selector */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Appearance</p>
              <div className="grid grid-cols-2 gap-2">
                {(['light', 'dark'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                      mode === m
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted'
                    }`}
                  >
                    {m === 'light' ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                    <span className="capitalize">{m}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color Selector */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Accent Color</p>
              <div className="grid grid-cols-2 gap-2">
                {accentColors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setAccent(color.id)}
                    className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                      accent === color.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/50 hover:bg-muted'
                    }`}
                  >
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full"
                      style={{ backgroundColor: color.color }}
                    >
                      {accent === color.id && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </span>
                    <span className="text-foreground">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
