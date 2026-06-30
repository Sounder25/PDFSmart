import { AlertTriangle, Info } from 'lucide-react'

export function DemoBanner({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-950/60 border border-amber-700/40 rounded text-[10px] text-amber-400 font-medium">
        <AlertTriangle className="w-2.5 h-2.5" />
        DEMO
      </span>
    )
  }
  return (
    <div className="demo-banner">
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>
        <strong>Demo Research Mode:</strong> Results are generated for workflow demonstration and have not been independently verified through live external sources.
      </span>
    </div>
  )
}

export function SimulatedLabel({ text = 'Simulated' }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-purple-400 bg-purple-900/20 border border-purple-700/30 px-1.5 py-0.5 rounded">
      <Info className="w-2.5 h-2.5" />
      {text}
    </span>
  )
}
