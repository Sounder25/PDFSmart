import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type OutreachLog, type Contact } from '@/lib/api'
import { toast } from 'sonner'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { cn, formatDate, timeAgo, CHANNEL_ICONS, CONTACT_TYPE_COLORS, CONTACT_TYPE_LABELS } from '@/lib/utils'
import { Send, Plus, Trash2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

const CHANNELS = ['email', 'phone', 'linkedin', 'in_person', 'event', 'social', 'podcast_pitch', 'press_pitch']
const OUTCOMES = ['pending', 'no_response', 'responded', 'interested', 'meeting_booked', 'declined', 'coverage_secured']
const EMPTY = { contact_id: '', campaign_id: '', channel: 'email', direction: 'sent', subject: '', body_preview: '', outcome: 'pending', follow_up_date: '', notes: '' }

export function Outreach() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [deleting, setDeleting] = useState<OutreachLog | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  const { data } = useQuery({ queryKey: ['outreach'], queryFn: () => api.outreach.list({ limit: 50 }) })
  const { data: followUps = [] } = useQuery({ queryKey: ['follow-ups'], queryFn: () => api.outreach.followUps() })
  const { data: contacts } = useQuery({ queryKey: ['contacts-all'], queryFn: () => api.contacts.list({ limit: 200 }) })
  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: () => api.campaigns.list() })

  const createMut = useMutation({
    mutationFn: () => api.outreach.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['outreach'] }); qc.invalidateQueries({ queryKey: ['follow-ups'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setShowAdd(false); setForm({ ...EMPTY }); toast.success('Outreach logged') },
    onError: () => toast.error('Failed to log outreach'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OutreachLog> }) => api.outreach.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['outreach'] }); toast.success('Updated') },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.outreach.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['outreach'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Deleted') },
  })

  const logs = data?.data || []
  const contactList = contacts?.data || []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2"><Send className="w-5 h-5 text-teal-400" />Outreach Tracker</h1>
          <p className="text-xs text-slate-500 mt-1">{data?.total ?? 0} touchpoints logged</p>
        </div>
        <button className="btn-primary text-xs" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" />Log Outreach</button>
      </div>

      {followUps.length > 0 && (
        <div className="op-card p-4 border-amber-700/20">
          <h2 className="text-xs font-semibold text-amber-300 flex items-center gap-2 mb-3">
            <AlertCircle className="w-3.5 h-3.5" />{followUps.length} Follow-up{followUps.length !== 1 ? 's' : ''} Due
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {followUps.map((c: Contact) => (
              <div key={c.id} className="flex items-center gap-2 text-xs bg-amber-900/10 border border-amber-800/20 rounded-lg px-3 py-2">
                <span className={cn('status-badge', CONTACT_TYPE_COLORS[c.type] || CONTACT_TYPE_COLORS.general)}>{CONTACT_TYPE_LABELS[c.type] || c.type}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-slate-200 font-medium truncate">{c.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{c.organization}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-amber-400 text-[10px]">{formatDate(c.next_follow_up, true)}</p>
                  <button className="text-[10px] text-teal-400 hover:underline" onClick={() => { setForm(p => ({ ...p, contact_id: c.id })); setShowAdd(true) }}>Log now</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="op-card overflow-hidden">
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <Send className="w-7 h-7 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No outreach logged yet</p>
            <button className="btn-primary text-xs mt-3" onClick={() => setShowAdd(true)}><Plus className="w-3 h-3" />Log first touchpoint</button>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1f2d40]">
                {['', 'Contact', 'Channel', 'Subject / Note', 'Outcome', 'Date', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(o => (
                <>
                  <tr key={o.id} className="border-b border-[#161f30] hover:bg-white/2 transition-colors cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                    <td className="px-3 py-2.5 text-base">{CHANNEL_ICONS[o.channel] || '✉'}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-200">{o.contact_name || '—'}</p>
                      <p className="text-[10px] text-slate-600 truncate max-w-32">{o.organization || o.campaign_name || ''}</p>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 capitalize">{o.channel.replace('_', ' ')}</td>
                    <td className="px-3 py-2.5 text-slate-400 max-w-48 truncate">{o.subject || o.body_preview || '—'}</td>
                    <td className="px-3 py-2.5">
                      <select className="text-xs bg-transparent border-0 outline-none cursor-pointer"
                        value={o.outcome} style={{ color: 'var(--text-secondary)' }}
                        onClick={e => e.stopPropagation()}
                        onChange={e => updateMut.mutate({ id: o.id, data: { outcome: e.target.value } })}>
                        {OUTCOMES.map(out => <option key={out} value={out}>{out.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{timeAgo(o.sent_at)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {expanded === o.id ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
                        <button className="btn-ghost p-1 text-red-400/40 hover:text-red-400" onClick={e => { e.stopPropagation(); setDeleting(o) }}><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                  {expanded === o.id && o.notes && (
                    <tr key={`${o.id}-exp`} className="border-b border-[#161f30] bg-slate-900/30">
                      <td colSpan={7} className="px-4 py-2.5 text-xs text-slate-500 italic">{o.notes}</td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setForm({ ...EMPTY }) }} title="Log Outreach" size="md">
        <div className="space-y-3">
          <div><label className="op-label">Contact *</label>
            <select className="op-input" value={form.contact_id} onChange={f('contact_id')}>
              <option value="">— Select contact —</option>
              {contactList.map((c: Contact) => <option key={c.id} value={c.id}>{c.name}{c.organization ? ` · ${c.organization}` : ''}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="op-label">Channel</label>
              <select className="op-input" value={form.channel} onChange={f('channel')}>
                {CHANNELS.map(c => <option key={c} value={c}>{CHANNEL_ICONS[c]} {c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div><label className="op-label">Campaign (optional)</label>
              <select className="op-input" value={form.campaign_id} onChange={f('campaign_id')}>
                <option value="">None</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="op-label">Subject / Topic</label><input className="op-input" value={form.subject} onChange={f('subject')} placeholder="What was the outreach about?" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="op-label">Outcome</label>
              <select className="op-input" value={form.outcome} onChange={f('outcome')}>
                {OUTCOMES.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div><label className="op-label">Follow-up Date</label><input className="op-input" type="date" value={form.follow_up_date} onChange={f('follow_up_date')} /></div>
          </div>
          <div><label className="op-label">Notes</label><textarea className="op-input resize-none" rows={3} value={form.notes} onChange={f('notes')} placeholder="Key takeaways, next steps, what they said…" /></div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button className="btn-secondary" onClick={() => { setShowAdd(false); setForm({ ...EMPTY }) }}>Cancel</button>
          <button className="btn-primary" onClick={() => createMut.mutate()} disabled={!form.contact_id || createMut.isPending}>{createMut.isPending ? 'Logging…' : 'Log Outreach'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete this outreach log?" confirmLabel="Delete" danger onConfirm={() => { deleteMut.mutate(deleting!.id); setDeleting(null) }} />
    </div>
  )
}
