import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { DemoBanner } from '@/components/shared/DemoDataBanner'
import { MarketModeBadge } from '@/components/shared/MarketModeIcon'
import { AlertTriangle, CheckSquare, Square, Import, MapPin, DollarSign, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { MarketMode } from '@/types'

interface ResearchResult {
  id: string; name: string; entity_type: string; market_mode: MarketMode
  primary_location?: string; description?: string; estimated_value?: number
  score_preview?: { estimated: number; note: string }
  data_gaps?: string[]; claims?: { claim_text: string }[]
}

interface Props { results: ResearchResult[]; disclaimer: string; marketMode: MarketMode }

export function ResearchResults({ results, disclaimer, marketMode }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const qc = useQueryClient()

  const importMutation = useMutation({
    mutationFn: (items: ResearchResult[]) => api.research.import(items),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['targets'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      if (data.imported > 0) toast.success(`${data.imported} target${data.imported !== 1 ? 's' : ''} added to database`)
      if (data.duplicates > 0) toast.warning(`${data.duplicates} duplicate${data.duplicates !== 1 ? 's' : ''} skipped`)
      setSelected(new Set())
    },
    onError: () => toast.error('Import failed'),
  })

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const toggleAll = () => {
    if (selected.size === results.length) setSelected(new Set())
    else setSelected(new Set(results.map(r => r.id)))
  }

  const importSelected = () => {
    const items = results.filter(r => selected.has(r.id))
    if (!items.length) return toast.error('Select at least one result')
    importMutation.mutate(items)
  }

  return (
    <div className="space-y-3">
      <DemoBanner />

      <div className="fm-card p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={toggleAll} className="btn-ghost text-xs py-1">
            {selected.size === results.length ? <CheckSquare className="w-3.5 h-3.5 text-teal-400" /> : <Square className="w-3.5 h-3.5" />}
            {selected.size === results.length ? ' Deselect all' : ' Select all'}
          </button>
          <span className="text-xs text-slate-400">{results.length} demo result{results.length !== 1 ? 's' : ''} generated</span>
        </div>
        <button
          className="btn-primary text-xs py-1.5"
          onClick={importSelected}
          disabled={selected.size === 0 || importMutation.isPending}
        >
          <Import className="w-3.5 h-3.5" />
          Add {selected.size > 0 ? selected.size : ''} to Database
        </button>
      </div>

      {results.map(r => (
        <div
          key={r.id}
          className={`fm-card p-4 cursor-pointer transition-colors ${selected.has(r.id) ? 'border-teal-500/50 bg-teal-950/10' : ''}`}
          onClick={() => toggle(r.id)}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5" onClick={e => { e.stopPropagation(); toggle(r.id) }}>
              {selected.has(r.id)
                ? <CheckSquare className="w-4 h-4 text-teal-400" />
                : <Square className="w-4 h-4 text-slate-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{r.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <MarketModeBadge mode={r.market_mode} />
                    <span className="text-[10px] text-slate-500 capitalize">{r.entity_type?.replace('_', ' ')}</span>
                    {r.primary_location && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        <MapPin className="w-2.5 h-2.5" />{r.primary_location}
                      </span>
                    )}
                  </div>
                </div>
                {r.estimated_value && (
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                      <DollarSign className="w-3 h-3" />
                      {formatCurrency(r.estimated_value, true)}
                    </div>
                    <div className="text-[10px] text-slate-600">estimated</div>
                  </div>
                )}
              </div>

              {r.description && (
                <p className="text-xs text-slate-400 mb-2 leading-relaxed">{r.description}</p>
              )}

              {r.score_preview && (
                <div className="bg-[#0f172a] rounded-md px-3 py-2 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Preliminary Score Estimate</span>
                    <span className="text-xs font-semibold text-amber-400">{r.score_preview.estimated}/100</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5">{r.score_preview.note}</p>
                </div>
              )}

              {r.data_gaps && r.data_gaps.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {r.data_gaps.map((g, i) => (
                    <span key={i} className="flex items-center gap-1 text-[10px] bg-amber-950/30 text-amber-400 border border-amber-800/30 px-2 py-0.5 rounded">
                      <AlertCircle className="w-2.5 h-2.5" />{g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
