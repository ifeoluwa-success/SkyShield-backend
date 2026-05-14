import { Loader2 } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { cn } from '../../lib/utils'

const SIZES = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 32,
  xl: 36,
} as const

export type SpinnerSize = keyof typeof SIZES

export type SpinnerProps = Omit<LucideProps, 'size'> & {
  /** Pixel size preset for the icon */
  size?: SpinnerSize
}

/** App-wide loading icon — amber Loader2, same spin timing as `animate-spin` (see tailwind.config). */
export function Spinner({ size = 'md', className, ...props }: SpinnerProps) {
  const px = SIZES[size]
  return (
    <Loader2
      size={px}
      className={cn('shrink-0 animate-spin text-amber-500', className)}
      aria-hidden
      {...props}
    />
  )
}

export type PageLoaderProps = {
  message?: string
  size?: SpinnerSize
  className?: string
}

/** Centered full-area loader for initial data fetches — one layout everywhere. */
export function PageLoader({ message = 'Loading…', size = 'lg', className }: PageLoaderProps) {
  return (
    <div
      className={cn(
        'flex min-h-[36vh] flex-col items-center justify-center gap-2 px-4 py-10 text-[var(--text-secondary)]',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <Spinner size={size} className="text-amber-500" />
      <p className="text-center text-sm">{message}</p>
    </div>
  )
}
