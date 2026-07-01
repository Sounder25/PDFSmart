import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Contact } from '@/lib/api'
import { toast } from 'sonner'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { cn, formatDate, CONTACT_TYPE_LABELS, CONTACT_TYPE_COLORS, CONTACT_STATUS_COLORS, SEGMENT_LABELS } from '@/lib/utils'
import { Users, Plus, Search, Trash2, Edit3, MapPin } from 'lucide-react'

const CONTACT_TYPES = Object.keys(CONTACT_TYPE_LABELS)
const STATUSES = ['cold', 'warm', 'active', 'won', 'lost']
const SEGMENTS = Object.keys(SEGMENT_LABELS)

type ContactForm = { name: string; type: string; audience_segment: string; organization: string; title: string; email: string; phone: string; website: string; location: string; status: string; notes: string; next_follow_up: string }
const EMPTY_FORM: ContactForm = { name: '', type: 'general', audience_segment: '', organization: '', title: '', email: '', phone: '', website: '', location: '', status: 'cold', notes: '', next_follow_up: '' }

export function Contacts() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [deleting, setDeleting] = useState<Contact | null>(null)
  const [form, setForm] = useState<ContactForm>({ ...EMPTY_FORM })
  const { data, isLoading } = useQuery({
    queryKey: ['contacts', { search, type: typeFilter, page }],
    queryFn: () => api.contacts.list({ search, type: typeFilter, page, limit: 30 }),
  })

  const createMut = useMutation({
    mutationFn: () => api.contacts.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); setShowAdd(false); setForm({ ...EMPTY_FORM }); toast.success('Contact added') },
    onError: () => toast.error('Failed to add contact'),
  })

  const updateMut = useMutation({
    mutationFn: () => api.contacts.update(editing!.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); setEditing(null); toast.success('Contact updated') },
    onError: () => toast.error('Update failed'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.contacts.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Contact deleted') },
  })

  const openEdit = (c: Contact) => { setEditing(c); setForm({ name: c.name, type: c.type, audience_segment: c.audience_segment || '', organization: c.organization || '', title: c.title || '', email: c.email || '', phone: c.phone || '', website: c.website || '', location: c.location || '', status: c.status, notes: c.notes || '', next_follow_up: c.next_follow_up || '' }) }

  const contacts = data?.data || []
  const total = data?.total || 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2"><Users className="w-5 h-5 text-teal-400" />Contacts</h1>
          <p className="text-xs text-slate-500 mt-1">{total} contacts · farmers, ranchers, investors, media, officials</p>
        </div>
        <button className="btn-primary text-xs" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" />Add Contact</button>
      </div>

      <div className="op-card p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input className="op-input pl-9 py-1.5 text-xs" placeholder="Search contacts…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="op-input w-auto py-1.5 text-xs" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
          <option value="">All Types</option>
          {CONTACT_TYPES.map(t => <option key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</option>)}
        </select>
        {(search || typeFilter) && <button className="btn-ghost text-xs text-slate-500" onClick={() => { setSearch(''); setTypeFilter(''); setPage(1) }}>Clear</button>}
      </div>

      <div className="op-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No contacts found</p>
            <button className="btn-primary text-xs mt-3" onClick={() => setShowAdd(true)}><Plus className="w-3 h-3" />Add your first contact</button>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1f2d40]">
                {['Name / Org', 'Type', 'Segment', 'Location', 'Status', 'Follow-up', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id} className="border-b border-[#161f30] hover:bg-white/2 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-slate-200">{c.name}</p>
                    {c.organization && <p className="text-[10px] text-slate-600">{c.organization}{c.title ? ` · ${c.title}` : ''}</p>}
                  </td>
                  <td className="px-3 py-2.5"><span className={cn('status-badge', CONTACT_TYPE_COLORS[c.type] || CONTACT_TYPE_COLORS.general)}>{CONTACT_TYPE_LABELS[c.type] || c.type}</span></td>
                  <td className="px-3 py-2.5 text-slate-500">{SEGMENT_LABELS[c.audience_segment || ''] || c.audience_segment || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{c.location ? <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{c.location}</span> : '—'}</td>
                  <td className="px-3 py-2.5"><span className={cn('status-badge', CONTACT_STATUS_COLORS[c.status] || CONTACT_STATUS_COLORS.cold)}>{c.status}</span></td>
                  <td className="px-3 py-2.5 text-slate-500">{formatDate(c.next_follow_up, true)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button className="btn-ghost p-1" onClick={() => openEdit(c)}><Edit3 className="w-3.5 h-3.5" /></button>
                      <button className="btn-ghost p-1 text-red-400/50 hover:text-red-400" onClick={() => setDeleting(c)}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {total > 30 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-[#1f2d40]">
            <span className="text-xs text-slate-500">{total} total</span>
            <div className="flex gap-1">
              <button className="btn-ghost text-xs py-1 px-2" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <button className="btn-ghost text-xs py-1 px-2" disabled={page * 30 >= total} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      <ContactFormModal
        open={showAdd || !!editing} title={editing ? 'Edit Contact' : 'Add Contact'}
        form={form} setForm={setForm}
        onClose={() => { setShowAdd(false); setEditing(null); setForm({ ...EMPTY_FORM }) }}
        onSubmit={() => editing ? updateMut.mutate() : createMut.mutate()}
        isPending={createMut.isPending || updateMut.isPending}
      />

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Delete ${deleting?.name}?`}
        description="All outreach and investor records for this contact will also be deleted." confirmLabel="Delete" danger
        onConfirm={() => { deleteMut.mutate(deleting!.id); setDeleting(null) }} />
    </div>
  )
}

function ContactFormModal({ open, title, form, setForm, onClose, onSubmit, isPending }: {
  open: boolean; title: string; form: ContactForm
  setForm: React.Dispatch<React.SetStateAction<ContactForm>>
  onClose: () => void; onSubmit: () => void; isPending: boolean
}) {
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="op-label">Name *</label><input className="op-input" value={form.name} onChange={f('name')} placeholder="Full name" /></div>
        <div><label className="op-label">Contact Type</label>
          <select className="op-input" value={form.type} onChange={f('type')}>
            {Object.entries(CONTACT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div><label className="op-label">Segment</label>
          <select className="op-input" value={form.audience_segment} onChange={f('audience_segment')}>
            <option value="">— Select —</option>
            {SEGMENTS.map(s => <option key={s} value={s}>{SEGMENT_LABELS[s]}</option>)}
          </select>
        </div>
        <div><label className="op-label">Organization</label><input className="op-input" value={form.organization} onChange={f('organization')} placeholder="Company / outlet / agency" /></div>
        <div><label className="op-label">Title / Role</label><input className="op-input" value={form.title} onChange={f('title')} placeholder="e.g. Ranch Owner, Editor" /></div>
        <div><label className="op-label">Email</label><input className="op-input" type="email" value={form.email} onChange={f('email')} /></div>
        <div><label className="op-label">Phone</label><input className="op-input" value={form.phone} onChange={f('phone')} /></div>
        <div><label className="op-label">Location</label><input className="op-input" value={form.location} onChange={f('location')} placeholder="City, State" /></div>
        <div><label className="op-label">Status</label>
          <select className="op-input" value={form.status} onChange={f('status')}>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div><label className="op-label">Next Follow-up Date</label><input className="op-input" type="date" value={form.next_follow_up} onChange={f('next_follow_up')} /></div>
        <div className="col-span-2"><label className="op-label">Notes</label><textarea className="op-input resize-none" rows={3} value={form.notes} onChange={f('notes')} placeholder="Context, background, anything worth remembering…" /></div>
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={onSubmit} disabled={!form.name.trim() || isPending}>{isPending ? 'Saving…' : 'Save Contact'}</button>
      </div>
    </Modal>
  )
}
