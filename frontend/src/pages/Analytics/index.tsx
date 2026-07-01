import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { cn, formatCurrency, INVESTOR_STAGE_LABELS, INVESTOR_STAGE_COLORS, CONTACT_TYPE_LABELS } from '@/lib/utils'
import { BarChart2, TrendingUp, Users, Send, DollarSign } from 'lucide-react'

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-medium">{value}</span>
      </div>
      <div className="h-2 bg-slate-800/60 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function Analytics() {
  const { data: dash, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.dashboard.get() })
  const { data: contacts } = useQuery({ queryKey: ['contacts', {}], queryFn: () => api.contacts.list({ limit: 200 }) })
  const { data: investors } = useQuery({ queryKey: ['investors'], queryFn: () => api.investors.list() })
  const { data: revenue } = useQuery({ queryKey: ['revenue'], queryFn: () => api.revenue.list() })
  if (isLoading) return <div className="flex items-center justify-center h-48"><div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>

  const k = dash?.kpis
  const allContacts = contacts?.data || []
  const byType = Object.keys(CONTACT_TYPE_LABELS).map(t => ({ type: t, count: allContacts.filter(c => c.type === t).length })).filter(x => x.count > 0)
  const maxByType = Math.max(...byType.map(x => x.count), 1)
  const invSummary = investors?.summary || []
  const maxInvStage = Math.max(...invSummary.map(s => s.count), 1)
  const revSummary = revenue?.summary || []
  const maxRev = Math.max(...revSummary.map(s => s.total), 1)
  const responseRate = k && k.outreach_total > 0 ? Math.round((k.response_count / k.outreach_total) * 100) : 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-brand-400" />Analytics</h1>
        <p className="text-xs text-slate-500 mt-1">Performance across campaigns, outreach, investor pipeline, and revenue</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="op-card p-4"><div className="text-2xl font-bold text-teal-300">{k?.outreach_total ?? 0}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Total Outreach</div><div className="text-[10px] text-slate-600 mt-1">{responseRate}% response rate</div></div>
        <div className="op-card p-4"><div className="text-2xl font-bold text-purple-300">{k?.coverage_count ?? 0}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Media Coverage</div><div className="text-[10px] text-slate-600 mt-1">~{((k?.total_reach ?? 0) / 1000).toFixed(0)}K total reach</div></div>
        <div className="op-card p-4"><div className="text-2xl font-bold text-emerald-300">{formatCurrency(k?.total_revenue)}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Total Revenue</div><div className="text-[10px] text-slate-600 mt-1">{formatCurrency(k?.book_revenue, true)} from book</div></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="op-card p-4 space-y-4">
          <div className="flex items-center gap-2"><Users className="w-4 h-4 text-teal-400" /><h2 className="text-sm font-semibold text-slate-200">Contacts by Type</h2></div>
          <div className="space-y-3">
            {byType.length === 0 && <p className="text-xs text-slate-700 text-center py-4">No contacts yet</p>}
            {byType.map(({ type, count }) => <Bar key={type} label={CONTACT_TYPE_LABELS[type] || type} value={count} max={maxByType} color="bg-teal-500/60" />)}
          </div>
        </div>

        <div className="op-card p-4 space-y-4">
          <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" /><h2 className="text-sm font-semibold text-slate-200">Investor Pipeline</h2></div>
          <div className="space-y-3">
            {invSummary.length === 0 && <p className="text-xs text-slate-700 text-center py-4">No investor pipeline yet</p>}
            {invSummary.map(s => (
              <div key={s.stage} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className={cn(INVESTOR_STAGE_COLORS[s.stage])}>{INVESTOR_STAGE_LABELS[s.stage] || s.stage}</span>
                  <span className="text-slate-300 font-medium">{s.count}{s.ask_total > 0 ? ` · ${formatCurrency(s.ask_total, true)}` : ''}</span>
                </div>
                <div className="h-2 bg-slate-800/60 rounded-full overflow-hidden"><div className="h-full rounded-full bg-green-500/50 transition-all" style={{ width: `${Math.round((s.count / maxInvStage) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="op-card p-4 space-y-4">
          <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" /><h2 className="text-sm font-semibold text-slate-200">Revenue by Type</h2></div>
          <div className="space-y-3">
            {revSummary.length === 0 && <p className="text-xs text-slate-700 text-center py-4">No revenue recorded yet</p>}
            {revSummary.map(s => (
              <div key={s.type} className="space-y-1">
                <div className="flex justify-between text-xs"><span className="text-slate-400">{s.type.replace(/_/g, ' ')}</span><span className="text-emerald-300 font-medium">{formatCurrency(s.total, true)}</span></div>
                <div className="h-2 bg-slate-800/60 rounded-full overflow-hidden"><div className="h-full rounded-full bg-emerald-500/60 transition-all" style={{ width: `${Math.round((s.total / maxRev) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="op-card p-4 space-y-4">
          <div className="flex items-center gap-2"><Send className="w-4 h-4 text-blue-400" /><h2 className="text-sm font-semibold text-slate-200">Outreach Summary</h2></div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Sent', value: k?.outreach_total ?? 0, color: 'text-slate-200' },
              { label: 'Last 7 Days', value: k?.outreach_7d ?? 0, color: 'text-blue-300' },
              { label: 'Responses', value: k?.response_count ?? 0, color: 'text-teal-300' },
              { label: 'Response Rate', value: `${responseRate}%`, color: responseRate > 20 ? 'text-green-300' : responseRate > 10 ? 'text-brand-300' : 'text-slate-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-800/30 rounded-lg p-3 text-center">
                <div className={cn('text-xl font-bold', color)}>{value}</div>
                <div className="text-[10px] text-slate-600 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
