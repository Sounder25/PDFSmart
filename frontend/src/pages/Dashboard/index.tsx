import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, MARKET_MODE_LABELS, STATUS_LABELS, SCORE_BG, SCORE_LABELS, scoreToClassification } from '@/lib/utils'
import { PageSpinner } from '@/components/ui/Spinner'
import { ScoreBadge } from '@/components/shared/ScoreBadge'
import { MarketModeBadge } from '@/components/shared/MarketModeIcon'
import { useNavigate } from 'react-router-dom'
import {
  Target, TrendingUp, DollarSign, Send, CheckCircle,
  AlertTriangle, RefreshCw, Zap, ArrowRight, Activity,
  Search, Building2, Landmark, User, Handshake, Users,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MarketMode } from '@/types'

const MODE_ICONS: Record<MarketMode, React.ElementType> = {
  commercial: Building2, government: Landmark, private_client: User, partner: Handshake, stakeholder: Users
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-400 bg-red-950/40 border-red-800/40',
  medium: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
  low: 'text-slate-400 bg-slate-800/40 border-slate-700/40',
}

function KpiCard({ icon: Icon, label, value, sub, color = 'teal' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string
}) {
  const colors: Record<string, string> = {
    teal: 'text-teal-400 bg-teal-400/10',
    emerald: 'text-emerald-400 bg-emerald-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
    amber: 'text-amber-400 bg-amber-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    rose: 'text-rose-400 bg-rose-400/10',
    cyan: 'text-cyan-400 bg-cyan-400/10',
  }
  return (
    <div className="fm-card p-4">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', colors[color])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-100">{value}</div>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function ActivityIcon({ type }: { type: string }) {
  const icons: Record<string, React.ElementType> = {
    note: Activity, email: Send, call: Activity, meeting: Users,
    research: Search, enrichment: RefreshCw, status_change: CheckCircle,
    message_sent: Send, import: Target, system: Zap
  }
  const Icon = icons[type] || Activity
  return <Icon className="w-3.5 h-3.5" />
}

export function Dashboard() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.dashboard.get(),
    refetchInterval: 60_000,
  })

  if (isLoading) return <PageSpinner />
  if (error || !data) return (
    <div className="p-8 text-center text-red-400">
      <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
      <p className="text-sm">Unable to load dashboard. Check that the backend is running.</p>
    </div>
  )

  const { kpis, market_distribution, recent_activity, high_priority_targets, needs_enrichment, recommendations, data_quality_warnings, stage_distribution } = data
  const totalTargets = kpis.total_targets

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Market intelligence overview · {formatDate(new Date().toISOString())}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={() => navigate('/research')}>
            <Search className="w-3.5 h-3.5" />
            Run Research
          </button>
          <button className="btn-primary text-xs" onClick={() => navigate('/targets')}>
            <Target className="w-3.5 h-3.5" />
            View Targets
          </button>
        </div>
      </div>

      {/* Data quality warnings */}
      {data_quality_warnings.length > 0 && (
        <div className="mb-4 space-y-2">
          {data_quality_warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2 bg-amber-950/30 border border-amber-800/30 rounded-md px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs text-amber-300">{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
        <KpiCard icon={Target} label="Targets Researched" value={kpis.total_targets} sub={`${kpis.new_this_month} new this month`} color="teal" />
        <KpiCard icon={TrendingUp} label="New This Month" value={kpis.new_this_month} color="cyan" />
        <KpiCard icon={Zap} label="Active Opportunities" value={kpis.active_opportunities} color="blue" />
        <KpiCard icon={Send} label="Outreach Sent" value={kpis.outreach_sent} color="purple" />
        <KpiCard icon={CheckCircle} label="Qualified Targets" value={kpis.qualified_count} color="emerald" />
        <KpiCard icon={DollarSign} label="Pipeline Value" value={formatCurrency(kpis.pipeline_value, true)} color="amber" />
        <KpiCard icon={Activity} label="Response Rate" value="—" sub="Track responses to calculate" color="rose" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">

          {/* Strategic Recommendations */}
          <div className="fm-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-semibold text-slate-100">Strategic Recommendations</h2>
            </div>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div key={i} className={cn('rounded-lg px-3 py-2.5 border text-xs', PRIORITY_COLORS[rec.priority])}>
                  <div className="flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium mb-0.5">{rec.title}</p>
                      <p className="opacity-80 leading-relaxed">{rec.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline by stage */}
          <div className="fm-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-100">Opportunity Pipeline</h2>
              <button className="text-xs text-teal-400 hover:text-teal-300" onClick={() => navigate('/targets')}>View all</button>
            </div>
            {stage_distribution.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No opportunities yet. Add targets and create opportunities to populate the pipeline.</p>
            ) : (
              <div className="space-y-2">
                {stage_distribution.map(s => (
                  <div key={s.stage} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-28 capitalize">{s.stage.replace('_', ' ')}</span>
                    <div className="flex-1 h-2 bg-[#0f172a] rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.min(100, (s.count / (totalTargets || 1)) * 100 * 3)}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 w-6 text-right">{s.count}</span>
                    <span className="text-xs text-slate-600 w-16 text-right">{formatCurrency(s.value, true)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="fm-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-100">Recent Activity</h2>
            </div>
            {recent_activity.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No activity yet. Start researching and engaging targets to see activity here.</p>
            ) : (
              <div className="space-y-2">
                {recent_activity.map(a => (
                  <div key={a.id} className="flex items-start gap-2.5 py-1.5 border-b border-[#1e2d42] last:border-0">
                    <div className="w-6 h-6 rounded-md bg-[#1e293b] flex items-center justify-center shrink-0 mt-0.5 text-slate-400">
                      <ActivityIcon type={a.activity_type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 truncate">
                        <button className="text-teal-400 hover:text-teal-300 font-medium" onClick={() => navigate(`/targets/${a.target_entity_id}`)}>
                          {a.target_name}
                        </button>
                        {' — '}{a.description}
                      </p>
                      <p className="text-[10px] text-slate-600">{formatDate(a.created_at, true)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Market mode distribution */}
          <div className="fm-card p-4">
            <h2 className="text-sm font-semibold text-slate-100 mb-3">Market Mode Distribution</h2>
            {market_distribution.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No targets yet.</p>
            ) : (
              <div className="space-y-2.5">
                {market_distribution.map(m => {
                  const Icon = MODE_ICONS[m.market_mode as MarketMode] || Target
                  const pct = totalTargets ? Math.round((m.count / totalTargets) * 100) : 0
                  return (
                    <div key={m.market_mode}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-300">{MARKET_MODE_LABELS[m.market_mode as MarketMode]}</span>
                        </div>
                        <span className="text-xs text-slate-500">{m.count}</span>
                      </div>
                      <div className="h-1.5 bg-[#0f172a] rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Highest Priority Targets */}
          <div className="fm-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-100">Top Priority Targets</h2>
              <button onClick={() => navigate('/targets')} className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {high_priority_targets.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Score targets to see them ranked here.</p>
            ) : (
              <div className="space-y-2">
                {high_priority_targets.slice(0, 5).map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/targets/${t.id}`)}
                    className="w-full flex items-center gap-2 py-2 hover:bg-white/3 rounded-md transition-colors group text-left"
                  >
                    <span className="text-xs text-slate-600 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 truncate group-hover:text-teal-300">{t.name}</p>
                      <MarketModeBadge mode={t.market_mode} />
                    </div>
                    <ScoreBadge score={t.score ?? undefined} classification={t.score_classification} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Needs Enrichment */}
          <div className="fm-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-100">Needs Enrichment</h2>
            </div>
            {needs_enrichment.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">All targets are enriched.</p>
            ) : (
              <div className="space-y-2">
                {needs_enrichment.slice(0, 4).map(t => (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/targets/${t.id}`)}
                    className="w-full flex items-center gap-2 py-1.5 hover:bg-white/3 rounded-md transition-colors group text-left"
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 truncate group-hover:text-amber-300">{t.name}</p>
                      <p className="text-[10px] text-slate-600 capitalize">{t.confidence_level} confidence · {t.verification_status}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="fm-card p-4">
            <h2 className="text-sm font-semibold text-slate-100 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: 'Run Market Research', icon: Search, to: '/research', color: 'teal' },
                { label: 'View All Targets', icon: Target, to: '/targets', color: 'blue' },
                { label: 'Create Opportunity', icon: Zap, to: '/targets', color: 'emerald' },
              ].map(a => {
                const Icon = a.icon
                return (
                  <button key={a.label} onClick={() => navigate(a.to)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 bg-[#0f172a] hover:bg-[#1e293b] rounded-md transition-colors border border-[#243044] group">
                    <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400" />
                    <span className="text-xs text-slate-300 group-hover:text-slate-100">{a.label}</span>
                    <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400 ml-auto" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
