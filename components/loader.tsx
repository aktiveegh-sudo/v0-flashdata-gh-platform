'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useLoadingStore } from '@/lib/store'

export function GlobalLoader() {
  const { isLoading } = useLoadingStore()

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              {/* Logo */}
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="flex items-center gap-2"
              >
                <GhanaFlagIcon className="h-12 w-12" />
                <span className="text-2xl font-bold text-foreground">
                  Flash<span className="text-primary">Data</span> GH
                </span>
              </motion.div>
              
              {/* Data wave animation */}
              <div className="mt-6 flex items-end justify-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 rounded-full bg-primary"
                    animate={{
                      height: ['12px', '28px', '12px'],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function GhanaFlagIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle */}
      <circle cx="20" cy="20" r="18" fill="currentColor" className="text-primary/10" />
      
      {/* Ghana flag stripes */}
      <rect x="8" y="10" width="24" height="6" rx="1" fill="#CE1126" />
      <rect x="8" y="16" width="24" height="6" rx="0" fill="#FCD116" />
      <rect x="8" y="22" width="24" height="6" rx="1" fill="#006B3F" />
      
      {/* Black star */}
      <path
        d="M20 14L21.2 17.5H25L21.9 19.7L23 23L20 21L17 23L18.1 19.7L15 17.5H18.8L20 14Z"
        fill="#000000"
      />
      
      {/* Data/signal icon overlay */}
      <circle cx="30" cy="30" r="8" fill="currentColor" className="text-primary" />
      <path
        d="M27 30C27 28.34 28.34 27 30 27"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M25 30C25 27.24 27.24 25 30 25"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M23 30C23 26.13 26.13 23 30 23"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="30" cy="30" r="2" fill="white" />
    </svg>
  )
}

export function PageLoader() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-end gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-2 rounded-full bg-primary"
              animate={{
                height: ['12px', '28px', '12px'],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
