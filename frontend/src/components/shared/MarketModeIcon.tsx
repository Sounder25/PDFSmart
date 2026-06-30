import { Building2, Landmark, User, Handshake, Users } from 'lucide-react'
import { cn, MARKET_MODE_COLORS, MARKET_MODE_LABELS } from '@/lib/utils'
import type { MarketMode } from '@/types'

const ICONS: Record<MarketMode, typeof Building2> = {
  commercial: Building2,
  government: Landmark,
  private_client: User,
  partner: Handshake,
  stakeholder: Users,
}

export function MarketModeIcon({ mode, size = 'sm' }: { mode: MarketMode; size?: 'xs' | 'sm' | 'md' }) {
  const Icon = ICONS[mode]
  const sizes = { xs: 'w-3 h-3', sm: 'w-4 h-4', md: 'w-5 h-5' }
  return <Icon className={cn(sizes[size])} />
}

export function MarketModeBadge({ mode, showLabel = true }: { mode: MarketMode; showLabel?: boolean }) {
  const Icon = ICONS[mode]
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border', MARKET_MODE_COLORS[mode])}>
      <Icon className="w-3 h-3" />
      {showLabel && MARKET_MODE_LABELS[mode]}
    </span>
  )
}
