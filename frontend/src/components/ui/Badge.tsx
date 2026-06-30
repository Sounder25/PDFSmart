import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'outline' | 'solid'
  className?: string
}

export function Badge({ children, variant = 'outline', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
      variant === 'solid' && 'border-transparent',
      className
    )}>
      {children}
    </span>
  )
}
