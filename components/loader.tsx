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
    <img src="/site-logo.png" alt="FlashData GH logo" className={className} />
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
