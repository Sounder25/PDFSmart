import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Campaign } from '@/lib/api'
import { toast } from 'sonner'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { cn, formatDate, CAMPAIGN_TYPE_LABELS, CAMPAIGN_TYPE_COLORS, CAMPAIGN_STATUS_COLORS } from '@/lib/utils'
import { Megaphone, Plus, Trash2, Edit3, Target, FileText, Send } from 'lucide-react'

const CAMPAIGN_TYPES = Object.keys(CAMPAIGN_TYPE_LABELS)
const STATUSES = ['planning', 'active', 'paused', 'completed', 'archived']
const EMPTY = { name: '', type: 'general', status: 'planning', goal: '', target_audience: '', budget: '', start_date: '', end_date: '', description: '', notes: '' }

export function Campaigns() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Campaign | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [deleting, setDeleting] = useState<Campaign | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  const { data: campaigns = [], isLoading } = useQuery({ queryKey: ['campaigns'], queryFn: () => api.campaigns.list() })

  const createMut = useMutation({
    mutationFn: () => api.campaigns.create({ ...form, budget: form.budget ? Number(form.budget) : undefined }),
    onSuccess: (c) => { qc.invalidateQueries({ queryKey: ['campaigns'] }); setShowAdd(false); setForm({ ...EMPTY }); setSelected(c); toast.success('Campaign created') },
    onError: () => toast.error('Failed to create campaign'),
  })

  const updateMut = useMutation({
    mutationFn: () => api.campaigns.update(editing!.id, { ...form, budget: form.budget ? Number(form.budget) : undefined }),
    onSuccess: (c) => { qc.invalidateQueries({ queryKey: ['campaigns'] }); setEditing(null); setSelected(c); toast.success('Updated') },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.campaigns.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); if (selected?.id === deleting?.id) setSelected(null); toast.success('Deleted') },
  })

  const openEdit = (c: Campaign) => { setEditing(c); setForm({ name: c.name, type: c.type, status: c.status, goal: c.goal || '', target_audience: c.target_audience || '', budget: c.budget?.toString() || '', start_date: c.start_date || '', end_date: c.end_date || '', description: c.description || '', notes: c.notes || '' }) }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2"><Megaphone className="w-5 h-5 text-brand-400" />Campaigns</h1>
          <p className="text-xs text-slate-500 mt-1">Book launch, investor rounds, media pushes, farmer outreach — all in one place</p>
        </div>
        <button className="btn-primary text-xs" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" />New Campaign</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          {isLoading && <div className="text-xs text-slate-600 text-center py-8">Loading…</div>}
          {!isLoading && campaigns.length === 0 && (
            <div className="op-card p-6 text-center">
              <Megaphone className="w-7 h-7 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No campaigns yet</p>
              <button className="btn-primary text-xs mt-3" onClick={() => setShowAdd(true)}><Plus className="w-3 h-3" />Start one</button>
            </div>
          )}
          {campaigns.map(c => (
            <div key={c.id} onClick={() => setSelected(c)}
              className={cn('op-card p-3 cursor-pointer transition-all', selected?.id === c.id ? 'border-brand-500/50 bg-brand-900/5' : 'hover:border-[#263548]')}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200 truncate">{c.name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className={cn('status-badge', CAMPAIGN_TYPE_COLORS[c.type] || CAMPAIGN_TYPE_COLORS.general)}>{CAMPAIGN_TYPE_LABELS[c.type] || c.type}</span>
                    <span className={cn('status-badge', CAMPAIGN_STATUS_COLORS[c.status] || CAMPAIGN_STATUS_COLORS.planning)}>{c.status}</span>
                  </div>
                </div>
              </div>
              {(c.outreach_count! > 0 || c.asset_count! > 0) && (
                <div className="flex gap-3 mt-2 text-[10px] text-slate-600">
                  {c.outreach_count! > 0 && <span className="flex items-center gap-0.5"><Send className="w-2.5 h-2.5" />{c.outreach_count}</span>}
                  {c.asset_count! > 0 && <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" />{c.asset_count}</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="col-span-2">
          {!selected ? (
            <div className="op-card p-8 text-center space-y-3">
              <Target className="w-8 h-8 text-slate-700 mx-auto" />
              <p className="text-sm text-slate-500">Select a campaign to view details</p>
            </div>
          ) : (
            <div className="op-card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-100">{selected.name}</h2>
                  <div className="flex gap-2 mt-1.5">
                    <span className={cn('status-badge', CAMPAIGN_TYPE_COLORS[selected.type] || CAMPAIGN_TYPE_COLORS.general)}>{CAMPAIGN_TYPE_LABELS[selected.type] || selected.type}</span>
                    <span className={cn('status-badge', CAMPAIGN_STATUS_COLORS[selected.status])}>{selected.status}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost p-1.5" onClick={() => openEdit(selected)}><Edit3 className="w-4 h-4" /></button>
                  <button className="btn-ghost p-1.5 text-red-400/50 hover:text-red-400" onClick={() => setDeleting(selected)}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {selected.description && <p className="text-sm text-slate-400">{selected.description}</p>}
              <div className="grid grid-cols-2 gap-3">
                {selected.goal && <div className="bg-slate-800/30 rounded-lg p-3"><p className="op-label mb-1">Goal</p><p className="text-xs text-slate-300">{selected.goal}</p></div>}
                {selected.target_audience && <div className="bg-slate-800/30 rounded-lg p-3"><p className="op-label mb-1">Audience</p><p className="text-xs text-slate-300">{selected.target_audience}</p></div>}
                {selected.budget && <div className="bg-slate-800/30 rounded-lg p-3"><p className="op-label mb-1">Budget</p><p className="text-xs text-slate-300">${selected.budget.toLocaleString()}</p></div>}
                {(selected.start_date || selected.end_date) && (
                  <div className="bg-slate-800/30 rounded-lg p-3"><p className="op-label mb-1">Timeline</p><p className="text-xs text-slate-300">{formatDate(selected.start_date, true)} → {formatDate(selected.end_date, true)}</p></div>
                )}
              </div>
              {selected.notes && (
                <div className="bg-slate-800/20 rounded-lg p-3 border border-[#1f2d40]">
                  <p className="op-label mb-1">Notes</p>
                  <p className="text-xs text-slate-400" style={{ whiteSpace: 'pre-wrap' }}>{selected.notes}</p>
                </div>
              )}
              <div className="text-[10px] text-slate-600 border-t border-[#1f2d40] pt-3">
                Created {formatDate(selected.created_at)} · Updated {formatDate(selected.updated_at)}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={showAdd || !!editing} onClose={() => { setShowAdd(false); setEditing(null); setForm({ ...EMPTY }) }} title={editing ? 'Edit Campaign' : 'New Campaign'} size="lg">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="op-label">Campaign Name *</label><input className="op-input" value={form.name} onChange={f('name')} placeholder="e.g. Book Launch — Spring 2025" /></div>
          <div><label className="op-label">Type</label>
            <select className="op-input" value={form.type} onChange={f('type')}>
              {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{CAMPAIGN_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div><label className="op-label">Status</label>
            <select className="op-input" value={form.status} onChange={f('status')}>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className="op-label">Goal</label><input className="op-input" value={form.goal} onChange={f('goal')} placeholder="e.g. Sell 500 books, Schedule 10 investor meetings" /></div>
          <div className="col-span-2"><label className="op-label">Target Audience</label><input className="op-input" value={form.target_audience} onChange={f('target_audience')} /></div>
          <div><label className="op-label">Budget ($)</label><input className="op-input" type="number" value={form.budget} onChange={f('budget')} placeholder="0" /></div>
          <div></div>
          <div><label className="op-label">Start Date</label><input className="op-input" type="date" value={form.start_date} onChange={f('start_date')} /></div>
          <div><label className="op-label">End Date</label><input className="op-input" type="date" value={form.end_date} onChange={f('end_date')} /></div>
          <div className="col-span-2"><label className="op-label">Description</label><textarea className="op-input resize-none" rows={2} value={form.description} onChange={f('description')} /></div>
          <div className="col-span-2"><label className="op-label">Notes / Strategy</label><textarea className="op-input resize-none" rows={3} value={form.notes} onChange={f('notes')} /></div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button className="btn-secondary" onClick={() => { setShowAdd(false); setEditing(null) }}>Cancel</button>
          <button className="btn-primary" onClick={() => editing ? updateMut.mutate() : createMut.mutate()} disabled={!form.name.trim()}>
            {createMut.isPending || updateMut.isPending ? 'Saving…' : 'Save Campaign'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Delete "${deleting?.name}"?`} description="This cannot be undone." confirmLabel="Delete" danger onConfirm={() => { deleteMut.mutate(deleting!.id); setDeleting(null) }} />
    </div>
  )
}
