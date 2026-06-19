'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type AdminPageShellProps = {
  title: string
  description?: string
  actions?: ReactNode
  stats?: ReactNode
  children: ReactNode
  className?: string
}

export function AdminPageShell({
  title,
  description,
  actions,
  stats,
  children,
  className,
}: AdminPageShellProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-500">Admin Console</p>
            <h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white lg:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-500 dark:text-white/55">{description}</p>
            ) : null}
          </div>
          {actions}
        </div>
      </div>
      {stats}
      {children}
    </div>
  )
}

export function AdminPanel({
  title,
  description,
  children,
  className,
  action,
}: {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]',
        className
      )}
    >
      {title ? (
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/5">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
            {description ? <p className="mt-1 text-xs text-gray-500 dark:text-white/50">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </div>
  )
}

export function AdminStatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
}

export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string
  hint?: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/50">{label}</p>
        {Icon ? <Icon className="h-4 w-4 text-amber-500" /> : null}
      </div>
      <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400 dark:text-white/40">{hint}</p> : null}
    </div>
  )
}
