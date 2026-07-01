import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type CoverageLog } from '@/lib/api'
import { toast } from 'sonner'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import { Radio, Plus, Trash2, ExternalLink, Mic, Newspaper, Tv, Star } from 'lucide-react'

const COVERAGE_TYPES = ['press_article', 'podcast', 'tv_radio', 'speaking', 'social_mention', 'review', 'interview']
const TYPE_ICONS: Record<string, React.ElementType> = { podcast: Mic, tv_radio: Tv, press_article: Newspaper, speaking: Star, social_mention: Radio, interview: Mic, review: Star }
const TYPE_LABELS: Record<string, string> = { press_article: 'Press Article', podcast: 'Podcast', tv_radio: 'TV / Radio', speaking: 'Speaking', social_mention: 'Social Mention', review: 'Review', interview: 'Interview' }
const EMPTY = { type: 'press_article', outlet_name: '', headline: '', url: '', reach_estimate: '', sentiment: 'positive', published_date: '', notes: '' }

export function Coverage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [deleting, setDeleting] = useState<CoverageLog | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  const { data } = useQuery({ queryKey: ['coverage'], queryFn: () => api.coverage.list() })

  const createMut = useMutation({
    mutationFn: () => api.coverage.create({ ...form, reach_estimate: form.reach_estimate ? Number(form.reach_estimate) : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coverage'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setShowAdd(false); setForm({ ...EMPTY }); toast.success('Coverage logged') },
    onError: () => toast.error('Failed'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.coverage.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coverage'] }); toast.success('Deleted') },
  })

  const logs = data?.data || []
  const totals = data?.totals

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2"><Radio className="w-5 h-5 text-purple-400" />Coverage & PR</h1>
          <p className="text-xs text-slate-500 mt-1">{totals?.count ?? 0} hits · ~{((totals?.total_reach ?? 0) / 1000).toFixed(0)}K total reach</p>
        </div>
        <button className="btn-primary text-xs" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" />Log Coverage</button>
      </div>

      {logs.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {COVERAGE_TYPES.map(t => {
            const count = logs.filter(l => l.type === t).length
            if (!count) return null
            const Icon = TYPE_ICONS[t] || Radio
            return (
              <div key={t} className="op-card px-3 py-2 flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-sm font-bold text-slate-200">{count}</span>
                <span className="text-xs text-slate-500">{TYPE_LABELS[t]}</span>
              </div>
            )
          })}
        </div>
      )}

      {logs.length === 0 ? (
        <div className="op-card p-12 text-center">
          <Radio className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No coverage logged yet</p>
          <button className="btn-primary text-xs mt-4" onClick={() => setShowAdd(true)}><Plus className="w-3 h-3" />Log first coverage</button>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(c => {
            const Icon = TYPE_ICONS[c.type] || Radio
            return (
              <div key={c.id} className="op-card p-4 flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-900/20 border border-purple-700/30 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100">{c.headline || c.outlet_name || 'Coverage'}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500">{c.outlet_name}</span>
                    <span className="text-xs text-slate-600">{TYPE_LABELS[c.type]}</span>
                    {c.reach_estimate && <span className="text-xs text-teal-500">~{(c.reach_estimate / 1000).toFixed(0)}K reach</span>}
                    <span className="text-xs text-slate-600">{formatDate(c.published_date, true)}</span>
                  </div>
                  {c.notes && <p className="text-xs text-slate-600 mt-1 truncate">{c.notes}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="btn-ghost p-1.5"><ExternalLink className="w-3.5 h-3.5" /></a>}
                  <button className="btn-ghost p-1.5 text-red-400/40 hover:text-red-400" onClick={() => setDeleting(c)}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setForm({ ...EMPTY }) }} title="Log Coverage" size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="op-label">Type</label><select className="op-input" value={form.type} onChange={f('type')}>{COVERAGE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select></div>
            <div><label className="op-label">Sentiment</label><select className="op-input" value={form.sentiment} onChange={f('sentiment')}><option value="positive">Positive</option><option value="neutral">Neutral</option><option value="negative">Negative</option></select></div>
          </div>
          <div><label className="op-label">Outlet / Venue *</label><input className="op-input" value={form.outlet_name} onChange={f('outlet_name')} placeholder="e.g. AgriPulse, Ranch & Range Podcast" /></div>
          <div><label className="op-label">Headline / Title</label><input className="op-input" value={form.headline} onChange={f('headline')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="op-label">URL</label><input className="op-input" value={form.url} onChange={f('url')} placeholder="https://" /></div>
            <div><label className="op-label">Est. Reach</label><input className="op-input" type="number" value={form.reach_estimate} onChange={f('reach_estimate')} placeholder="e.g. 42000" /></div>
          </div>
          <div><label className="op-label">Date Published / Aired</label><input className="op-input" type="date" value={form.published_date} onChange={f('published_date')} /></div>
          <div><label className="op-label">Notes</label><textarea className="op-input resize-none" rows={2} value={form.notes} onChange={f('notes')} /></div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn-primary" onClick={() => createMut.mutate()} disabled={!form.outlet_name.trim() || createMut.isPending}>{createMut.isPending ? 'Logging…' : 'Log Coverage'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete this coverage entry?" confirmLabel="Delete" danger onConfirm={() => { deleteMut.mutate(deleting!.id); setDeleting(null) }} />
    </div>
  )
}
