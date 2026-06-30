import { cn, SCORE_BG, SCORE_LABELS, scoreToClassification } from '@/lib/utils'
import type { ScoreClassification } from '@/types'

export function ScoreBadge({ score, classification }: { score?: number | null; classification?: ScoreClassification }) {
  const cls = classification || scoreToClassification(score ?? undefined)
  if (score == null) return <span className="text-slate-500 text-xs">—</span>
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border', SCORE_BG[cls])}>
      {score} <span className="opacity-70">· {SCORE_LABELS[cls]}</span>
    </span>
  )
}

export function ScoreBar({ score, max = 100 }: { score?: number | null; max?: number }) {
  if (score == null) return null
  const pct = Math.round((score / max) * 100)
  const cls = scoreToClassification(score)
  const barColor = {
    priority: 'bg-emerald-500',
    strong: 'bg-teal-500',
    possible: 'bg-amber-500',
    low_priority: 'bg-slate-500',
  }[cls]
  return (
    <div className="score-bar-track">
      <div className={cn('score-bar-fill', barColor)} style={{ width: `${pct}%` }} />
    </div>
  )
}
