import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type InvestorRecord, type Contact } from '@/lib/api'
import { toast } from 'sonner'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { cn, formatCurrency, formatDate, INVESTOR_STAGE_LABELS, INVESTOR_STAGE_COLORS, SEGMENT_LABELS } from '@/lib/utils'
import { TrendingUp, Plus, Trash2, Edit3, DollarSign } from 'lucide-react'

const STAGES = Object.keys(INVESTOR_STAGE_LABELS)

export function InvestorBoard() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<InvestorRecord | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<InvestorRecord | null>(null)
  const [deleting, setDeleting] = useState<InvestorRecord | null>(null)
  const [newContactId, setNewContactId] = useState('')
  const [form, setForm] = useState({ stage: 'identified', ask_amount: '', committed_amount: '', last_activity: '', next_action: '', next_action_date: '', notes: '' })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  const { data, isLoading } = useQuery({ queryKey: ['investors'], queryFn: () => api.investors.list() })
  const { data: contacts } = useQuery({ queryKey: ['contacts-investors'], queryFn: () => api.contacts.list({ type: 'investor', limit: 200 }) })

  const createMut = useMutation({
    mutationFn: () => api.investors.create({ ...form, contact_id: newContactId, ask_amount: form.ask_amount ? Number(form.ask_amount) : undefined, committed_amount: form.committed_amount ? Number(form.committed_amount) : undefined }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['investors'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setShowAdd(false); setSelected(r); toast.success('Investor added to pipeline') },
    onError: (e: Error & { data?: { error?: string } }) => toast.error(e?.data?.error || 'Failed'),
  })

  const updateMut = useMutation({
    mutationFn: () => api.investors.update(editing!.id, { ...form, ask_amount: form.ask_amount ? Number(form.ask_amount) : undefined, committed_amount: form.committed_amount ? Number(form.committed_amount) : undefined }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['investors'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setEditing(null); setSelected(r); toast.success('Updated') },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.investors.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['investors'] }); if (selected?.id === deleting?.id) setSelected(null); toast.success('Removed from pipeline') },
  })

  const openEdit = (r: InvestorRecord) => { setEditing(r); setForm({ stage: r.stage, ask_amount: r.ask_amount?.toString() || '', committed_amount: r.committed_amount?.toString() || '', last_activity: r.last_activity || '', next_action: r.next_action || '', next_action_date: r.next_action_date || '', notes: r.notes || '' }) }

  const investors = data?.data || []
  const summary = data?.summary || []
  const contactList = contacts?.data || []
  const totalAsk = summary.reduce((s, g) => s + g.ask_total, 0)
  const totalCommitted = summary.reduce((s, g) => s + g.committed_total, 0)
  const byStage = STAGES.reduce((acc, s) => { acc[s] = investors.filter(i => i.stage === s); return acc }, {} as Record<string, InvestorRecord[]>)
  const activeStages = STAGES.filter(s => byStage[s].length > 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-400" />Investor Board</h1>
          <p className="text-xs text-slate-500 mt-1">{investors.length} investors tracked · {formatCurrency(totalCommitted)} committed of {formatCurrency(totalAsk)} ask</p>
        </div>
        <button className="btn-primary text-xs" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" />Add Investor</button>
      </div>

      {investors.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <div className="op-card p-4"><div className="text-2xl font-bold text-slate-100">{investors.length}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">In Pipeline</div></div>
          <div className="op-card p-4"><div className="text-2xl font-bold text-green-300">{formatCurrency(totalCommitted, true)}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Committed</div></div>
          <div className="op-card p-4"><div className="text-2xl font-bold text-brand-300">{formatCurrency(totalAsk, true)}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Total Ask</div></div>
          <div className="op-card p-4"><div className="text-2xl font-bold text-blue-300">{investors.filter(i => ['meeting_scheduled', 'follow_up', 'due_diligence'].includes(i.stage)).length}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Active Convos</div></div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-4">
          {isLoading && <div className="text-xs text-slate-600 text-center py-8">Loading…</div>}
          {!isLoading && investors.length === 0 && (
            <div className="op-card p-6 text-center">
              <TrendingUp className="w-7 h-7 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No investors tracked yet</p>
              <button className="btn-primary text-xs mt-3" onClick={() => setShowAdd(true)}><Plus className="w-3 h-3" />Add</button>
            </div>
          )}
          {activeStages.map(stage => (
            <div key={stage}>
              <div className={cn('text-[10px] font-bold uppercase tracking-wider mb-1.5', INVESTOR_STAGE_COLORS[stage])}>{INVESTOR_STAGE_LABELS[stage]} ({byStage[stage].length})</div>
              {byStage[stage].map(r => (
                <div key={r.id} onClick={() => setSelected(r)}
                  className={cn('op-card p-3 cursor-pointer mb-2 transition-all', selected?.id === r.id ? 'border-green-500/40 bg-green-900/5' : 'hover:border-[#263548]')}>
                  <p className="text-xs font-semibold text-slate-200 truncate">{r.name}</p>
                  <p className="text-[10px] text-slate-600 truncate">{r.organization}</p>
                  {r.ask_amount && <p className="text-[10px] text-brand-400 mt-1">{formatCurrency(r.ask_amount)} ask</p>}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="col-span-2">
          {!selected ? (
            <div className="op-card p-8 text-center"><DollarSign className="w-8 h-8 text-slate-700 mx-auto mb-2" /><p className="text-sm text-slate-500">Select an investor to view details</p></div>
          ) : (
            <div className="op-card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-100">{selected.name}</h2>
                  <p className="text-xs text-slate-500">{selected.organization} · {SEGMENT_LABELS[selected.audience_segment || ''] || selected.audience_segment}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn('text-xs font-bold', INVESTOR_STAGE_COLORS[selected.stage])}>{INVESTOR_STAGE_LABELS[selected.stage]}</span>
                    {selected.next_action_date && <span className="text-[10px] text-amber-400">Next: {formatDate(selected.next_action_date, true)}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost p-1.5" onClick={() => openEdit(selected)}><Edit3 className="w-4 h-4" /></button>
                  <button className="btn-ghost p-1.5 text-red-400/50 hover:text-red-400" onClick={() => setDeleting(selected)}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {selected.ask_amount && <div className="bg-slate-800/30 rounded-lg p-3"><p className="op-label mb-1">Ask Amount</p><p className="text-sm font-bold text-brand-300">{formatCurrency(selected.ask_amount)}</p></div>}
                {selected.committed_amount && <div className="bg-slate-800/30 rounded-lg p-3"><p className="op-label mb-1">Committed</p><p className="text-sm font-bold text-green-300">{formatCurrency(selected.committed_amount)}</p></div>}
              </div>
              {selected.next_action && <div className="bg-amber-900/10 border border-amber-800/20 rounded-lg p-3"><p className="op-label mb-1">Next Action</p><p className="text-xs text-slate-300">{selected.next_action}</p></div>}
              {selected.notes && <div className="bg-slate-800/20 rounded-lg p-3"><p className="op-label mb-1">Notes</p><p className="text-xs text-slate-400" style={{ whiteSpace: 'pre-wrap' }}>{selected.notes || selected.contact_notes}</p></div>}
              <div className="flex gap-2 pt-2 border-t border-[#1f2d40]">
                {selected.email && <a href={`mailto:${selected.email}`} className="btn-secondary text-xs py-1 px-2">{selected.email}</a>}
                {selected.phone && <a href={`tel:${selected.phone}`} className="btn-secondary text-xs py-1 px-2">{selected.phone}</a>}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setNewContactId('') }} title="Add Investor to Pipeline" size="md">
        <div className="space-y-3">
          <div><label className="op-label">Contact *</label>
            <select className="op-input" value={newContactId} onChange={e => setNewContactId(e.target.value)}>
              <option value="">— Select investor contact —</option>
              {contactList.map((c: Contact) => <option key={c.id} value={c.id}>{c.name} · {c.organization}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="op-label">Stage</label><select className="op-input" value={form.stage} onChange={f('stage')}>{STAGES.map(s => <option key={s} value={s}>{INVESTOR_STAGE_LABELS[s]}</option>)}</select></div>
            <div><label className="op-label">Ask Amount ($)</label><input className="op-input" type="number" value={form.ask_amount} onChange={f('ask_amount')} placeholder="0" /></div>
          </div>
          <div><label className="op-label">Next Action</label><input className="op-input" value={form.next_action} onChange={f('next_action')} /></div>
          <div><label className="op-label">Next Action Date</label><input className="op-input" type="date" value={form.next_action_date} onChange={f('next_action_date')} /></div>
          <div><label className="op-label">Notes</label><textarea className="op-input resize-none" rows={3} value={form.notes} onChange={f('notes')} /></div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn-primary" onClick={() => createMut.mutate()} disabled={!newContactId || createMut.isPending}>{createMut.isPending ? 'Adding…' : 'Add to Pipeline'}</button>
        </div>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Update Investor" size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="op-label">Stage</label><select className="op-input" value={form.stage} onChange={f('stage')}>{STAGES.map(s => <option key={s} value={s}>{INVESTOR_STAGE_LABELS[s]}</option>)}</select></div>
            <div><label className="op-label">Ask Amount ($)</label><input className="op-input" type="number" value={form.ask_amount} onChange={f('ask_amount')} /></div>
          </div>
          <div><label className="op-label">Committed Amount ($)</label><input className="op-input" type="number" value={form.committed_amount} onChange={f('committed_amount')} /></div>
          <div><label className="op-label">Next Action</label><input className="op-input" value={form.next_action} onChange={f('next_action')} /></div>
          <div><label className="op-label">Next Action Date</label><input className="op-input" type="date" value={form.next_action_date} onChange={f('next_action_date')} /></div>
          <div><label className="op-label">Notes</label><textarea className="op-input resize-none" rows={3} value={form.notes} onChange={f('notes')} /></div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn-primary" onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>Save</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Remove ${deleting?.name} from pipeline?`} confirmLabel="Remove" danger onConfirm={() => { deleteMut.mutate(deleting!.id); setDeleting(null) }} />
    </div>
  )
}
