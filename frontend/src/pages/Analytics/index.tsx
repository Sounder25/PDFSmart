import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { cn, formatCurrency, MARKET_MODE_LABELS, MARKET_MODE_COLORS, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils'
import { BarChart2, TrendingUp, Target, DollarSign, Loader2, PieChart, Activity, Radio } from 'lucide-react'
import type { MarketMode, TargetStatus } from '@/types'

function StatCard({ label, value, sub, color = 'text-slate-100' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="fm-card p-4">
      <div className={cn('text-2xl font-bold mb-0.5', color)}>{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  )
}

function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-medium">{value}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function Analytics() {
  const { data: dash, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.dashboard.get(),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
    </div>
  )

  const kpis = dash?.kpis
  const marketDist = dash?.market_distribution || []
  const statusDist = dash?.status_distribution || []
  const stageDist = dash?.stage_distribution || []
  const totalTargets = marketDist.reduce((s, d) => s + d.count, 0)
  const totalPipeline = stageDist.reduce((s, d) => s + (d.value || 0), 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Analytics</h1>
        <p className="text-xs text-slate-500 mt-1">Portfolio metrics and pipeline intelligence across all market modes</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Targets" value={kpis?.total_targets ?? 0} color="text-slate-100" />
        <StatCard label="Qualified Targets" value={kpis?.qualified_count ?? 0} color="text-teal-400" sub={kpis?.total_targets ? `${Math.round(((kpis.qualified_count ?? 0) / kpis.total_targets) * 100)}% of portfolio` : undefined} />
        <StatCard label="Pipeline Value" value={formatCurrency(kpis?.pipeline_value)} color="text-emerald-400" />
        <StatCard label="Active Opportunities" value={kpis?.active_opportunities ?? 0} color="text-blue-400" />
        <StatCard label="New This Month" value={kpis?.new_this_month ?? 0} color="text-slate-300" />
        <StatCard label="Outreach Sent" value={kpis?.outreach_sent ?? 0} color="text-purple-400" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Market Distribution */}
        <div className="fm-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold text-slate-200">Portfolio by Market Mode</h2>
          </div>
          <div className="space-y-3">
            {marketDist.map(d => (
              <HBar
                key={d.market_mode}
                label={MARKET_MODE_LABELS[d.market_mode as MarketMode] || d.market_mode}
                value={d.count}
                max={totalTargets}
                color={d.market_mode === 'commercial' ? 'bg-blue-500' : d.market_mode === 'government' ? 'bg-indigo-500' : d.market_mode === 'private_client' ? 'bg-emerald-500' : d.market_mode === 'partner' ? 'bg-purple-500' : 'bg-amber-500'}
              />
            ))}
            {marketDist.length === 0 && <p className="text-xs text-slate-600 text-center py-4">No data yet</p>}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/30">
            {marketDist.map(d => (
              <span key={d.market_mode} className={cn('text-[10px] px-2 py-0.5 rounded border', MARKET_MODE_COLORS[d.market_mode as MarketMode])}>
                {MARKET_MODE_LABELS[d.market_mode as MarketMode]} · {totalTargets > 0 ? Math.round((d.count / totalTargets) * 100) : 0}%
              </span>
            ))}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="fm-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold text-slate-200">Targets by Status</h2>
          </div>
          <div className="space-y-3">
            {statusDist.map(d => (
              <div key={d.status} className="flex items-center justify-between text-xs">
                <span className={cn('px-2 py-0.5 rounded border text-[10px] font-medium', STATUS_COLORS[d.status as TargetStatus] || 'bg-slate-800 text-slate-400 border-slate-700/30')}>
                  {STATUS_LABELS[d.status as TargetStatus] || d.status}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500/60 rounded-full" style={{ width: `${totalTargets > 0 ? (d.count / totalTargets) * 100 : 0}%` }} />
                  </div>
                  <span className="text-slate-300 w-6 text-right">{d.count}</span>
                </div>
              </div>
            ))}
            {statusDist.length === 0 && <p className="text-xs text-slate-600 text-center py-4">No data yet</p>}
          </div>
        </div>
      </div>

      {/* Pipeline by Stage */}
      <div className="fm-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-teal-400" />
          <h2 className="text-sm font-semibold text-slate-200">Pipeline by Stage</h2>
          <span className="text-xs text-slate-500 ml-auto">Total: {formatCurrency(totalPipeline)}</span>
        </div>
        {stageDist.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-6">No opportunities in pipeline</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {stageDist.map(d => {
              const stageColors: Record<string, string> = {
                identified: 'text-slate-400', qualifying: 'text-cyan-400', proposal: 'text-violet-400',
                negotiation: 'text-amber-400', closed_won: 'text-emerald-400', closed_lost: 'text-red-400',
              }
              const stageLabels: Record<string, string> = {
                identified: 'Identified', qualifying: 'Qualifying', proposal: 'Proposal',
                negotiation: 'Negotiation', closed_won: 'Closed Won', closed_lost: 'Closed Lost',
              }
              return (
                <div key={d.stage} className="bg-slate-800/30 rounded-lg p-3 text-center">
                  <div className={cn('text-lg font-bold', stageColors[d.stage] || 'text-slate-300')}>{d.count}</div>
                  <div className="text-[10px] text-slate-500 mb-1">{stageLabels[d.stage] || d.stage}</div>
                  {d.value > 0 && <div className="text-[10px] text-emerald-400">{formatCurrency(d.value, true)}</div>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Agricultural Intelligence Analytics */}
      {dash?.agricultural_intelligence && (
        <div className="fm-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-slate-100">Agricultural Signal Intelligence</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Signals Captured" value={(dash.agricultural_intelligence.new_signals ?? 0) + (dash.agricultural_intelligence.high_priority_signals ?? 0)} color="text-orange-400" />
            <StatCard label="High Priority / Immediate" value={dash.agricultural_intelligence.high_priority_signals ?? 0} color="text-red-400" />
            <StatCard label="Funding Opportunities" value={dash.agricultural_intelligence.funding_opportunities ?? 0} color="text-green-400" />
            <StatCard label="Contract Opportunities" value={dash.agricultural_intelligence.contract_opportunities ?? 0} color="text-blue-400" />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            {(dash.agricultural_intelligence.priority_counties?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Priority Counties</h3>
                <div className="space-y-1.5">
                  {dash.agricultural_intelligence.priority_counties.map((c, i) => (
                    <HBar key={i} label={c.primary_location || 'Unknown'} value={c.target_count} max={Math.max(...dash.agricultural_intelligence!.priority_counties.map((x: { target_count: number }) => x.target_count))} color="bg-blue-500" />
                  ))}
                </div>
              </div>
            )}

            {(dash.agricultural_intelligence.priority_state_agencies?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Priority State Agencies</h3>
                <div className="space-y-1.5">
                  {dash.agricultural_intelligence.priority_state_agencies.map((a: { name: string; status: string }, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 truncate flex-1">{a.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${a.status === 'active' ? 'text-green-400 bg-green-900/20' : 'text-slate-500 bg-slate-800/40'}`}>{a.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#243044]">
            <p className="text-[10px] text-slate-500">Signal-to-campaign conversion, signal volume by type, and county development velocity metrics will appear here as you capture and action more signals.</p>
          </div>
        </div>
      )}

      {/* Advanced Analytics note */}
      <div className="fm-card p-4 bg-slate-800/20 border-slate-700/30">
        <div className="flex items-start gap-3">
          <BarChart2 className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-slate-400 mb-0.5">Advanced Analytics — Coming Soon</p>
            <p className="text-[10px] text-slate-600">
              Upcoming: trend charts over time, signal-to-campaign conversion funnels, county development velocity, funding pipeline value tracking, score distribution histograms, and exportable board-ready reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
