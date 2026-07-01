import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { cn, formatCurrency, formatDate, timeAgo, INVESTOR_STAGE_LABELS, INVESTOR_STAGE_COLORS, OUTCOME_COLORS, CHANNEL_ICONS } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  LayoutDashboard, Users, Megaphone, Send, Radio, DollarSign,
  TrendingUp, AlertCircle, ChevronRight, Zap, BookOpen
} from 'lucide-react'

function KpiCard({ label, value, sub, color = 'text-slate-100', icon: Icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: React.ElementType
}) {
  return (
    <div className="op-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className={cn('text-2xl font-bold mb-0.5 tracking-tight', color)}>{value}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
          {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
        </div>
        {Icon && <Icon className="w-4 h-4 text-slate-700 shrink-0 mt-1" />}
      </div>
    </div>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: dash, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.dashboard.get() })

  const seedMut = useMutation({
    mutationFn: () => api.contacts.seedDemo(),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success(`${d.count} demo contacts loaded`) },
    onError: () => toast.error('Seed failed'),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const k = dash?.kpis
  const brand = dash?.brand
  const isEmpty = !k || k.total_contacts === 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="w-4 h-4 text-brand-400" />
            <h1 className="text-xl font-bold text-slate-100">Command Center</h1>
          </div>
          {brand?.mission ? (
            <p className="text-xs text-slate-500 max-w-xl">{brand.mission}</p>
          ) : (
            <p className="text-xs text-slate-600">Set your mission in <button className="text-brand-400 hover:underline" onClick={() => navigate('/brand')}>Brand Studio</button> to personalize this view.</p>
          )}
        </div>
        {isEmpty && (
          <button className="btn-secondary text-xs" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
            <Zap className="w-3.5 h-3.5" />
            {seedMut.isPending ? 'Loading…' : 'Load Demo Data'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="Total Contacts" value={k?.total_contacts ?? 0} />
        <KpiCard icon={Megaphone} label="Active Campaigns" value={k?.active_campaigns ?? 0} color="text-brand-300" sub={k?.total_campaigns ? `${k.total_campaigns} total` : undefined} />
        <KpiCard icon={Send} label="Outreach (7 days)" value={k?.outreach_7d ?? 0} color="text-teal-300" sub={k?.response_count ? `${k.response_count} responses` : undefined} />
        <KpiCard icon={Radio} label="Media Coverage" value={k?.coverage_count ?? 0} color="text-purple-300" sub={k?.total_reach ? `~${(k.total_reach / 1000).toFixed(0)}K reach` : undefined} />
        <KpiCard icon={TrendingUp} label="Investor Conversations" value={k?.active_investor_conversations ?? 0} color="text-green-300" sub={k?.total_committed ? `${formatCurrency(k.total_committed)} committed` : undefined} />
        <KpiCard icon={DollarSign} label="Revenue" value={formatCurrency(k?.total_revenue)} color="text-emerald-300" sub={k?.book_revenue ? `${formatCurrency(k.book_revenue)} from book` : undefined} />
        <KpiCard icon={BookOpen} label="Total Investors" value={k?.total_investors ?? 0} color="text-blue-300" sub={k?.total_ask ? `${formatCurrency(k.total_ask)} total ask` : undefined} />
        <div className="op-card p-4 border-amber-700/20">
          <div className={cn('text-2xl font-bold mb-0.5 tracking-tight', (k?.follow_ups_due ?? 0) > 0 ? 'text-amber-300' : 'text-slate-600')}>
            {k?.follow_ups_due ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Follow-ups Due</div>
          {(k?.follow_ups_due ?? 0) > 0 && (
            <button onClick={() => navigate('/outreach')} className="text-[10px] text-amber-400 hover:underline mt-1 flex items-center gap-0.5">
              View queue <ChevronRight className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {dash?.investor_pipeline && dash.investor_pipeline.length > 0 && (
        <div className="op-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />Investor Pipeline
            </h2>
            <button onClick={() => navigate('/investors')} className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5">
              Full board <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {dash.investor_pipeline.map(p => (
              <div key={p.stage} className="flex flex-col items-center bg-slate-800/30 rounded-lg px-3 py-2 min-w-[70px]">
                <div className={cn('text-lg font-bold', INVESTOR_STAGE_COLORS[p.stage])}>{p.count}</div>
                <div className="text-[9px] text-slate-600 text-center mt-0.5">{INVESTOR_STAGE_LABELS[p.stage] || p.stage}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="op-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-teal-400" />Recent Outreach
            </h2>
            <button onClick={() => navigate('/outreach')} className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5">
              All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {dash?.recent_outreach?.length === 0 && <p className="text-xs text-slate-600 text-center py-4">No outreach logged yet</p>}
            {dash?.recent_outreach?.map(o => (
              <div key={o.id} className="flex items-start gap-2 text-xs border-b border-[#1f2d40] pb-2 last:border-0 last:pb-0">
                <span className="text-base leading-none mt-0.5">{CHANNEL_ICONS[o.channel] || '✉'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 font-medium truncate">{o.contact_name || 'Unknown'}</p>
                  <p className="text-slate-600 truncate">{o.subject || o.organization || o.channel}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn('text-[10px]', OUTCOME_COLORS[o.outcome] || 'text-slate-500')}>{o.outcome?.replace('_', ' ')}</p>
                  <p className="text-[10px] text-slate-600">{timeAgo(o.sent_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="op-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-purple-400" />Coverage Wins
            </h2>
            <button onClick={() => navigate('/coverage')} className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5">
              All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {dash?.recent_coverage?.length === 0 && <p className="text-xs text-slate-600 text-center py-4">No coverage logged yet</p>}
            {dash?.recent_coverage?.map(c => (
              <div key={c.id} className="flex items-start gap-2 text-xs border-b border-[#1f2d40] pb-2 last:border-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 font-medium truncate">{c.headline || c.outlet_name}</p>
                  <p className="text-slate-600 truncate">{c.outlet_name}{c.reach_estimate ? ` · ~${(c.reach_estimate / 1000).toFixed(0)}K reach` : ''}</p>
                </div>
                <div className="text-[10px] text-slate-600 shrink-0">{formatDate(c.published_date, true)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {dash?.upcoming_follow_ups && dash.upcoming_follow_ups.length > 0 && (
        <div className="op-card p-4 border-amber-700/20">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />Follow-ups Due
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {dash.upcoming_follow_ups.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-xs bg-slate-800/30 rounded-lg p-2">
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', c.type === 'investor' ? 'bg-green-400' : c.type === 'media' ? 'bg-purple-400' : 'bg-brand-400')} />
                <div className="min-w-0 flex-1">
                  <p className="text-slate-300 font-medium truncate">{c.name}</p>
                  <p className="text-[10px] text-slate-600 truncate">{c.organization || c.type}</p>
                </div>
                <p className="text-amber-400 text-[10px] shrink-0">{formatDate(c.next_follow_up, true)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
