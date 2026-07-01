import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type ContentAsset } from '@/lib/api'
import { toast } from 'sonner'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { FileText, Plus, Trash2, Edit3, Copy, Check } from 'lucide-react'

const ASSET_TYPES = ['email_template', 'press_release', 'social_post', 'pitch_deck', 'book_excerpt', 'talking_points', 'bio', 'one_pager', 'fact_sheet']
const TYPE_LABELS: Record<string, string> = { email_template: 'Email Template', press_release: 'Press Release', social_post: 'Social Post', pitch_deck: 'Pitch Deck', book_excerpt: 'Book Excerpt', talking_points: 'Talking Points', bio: 'Bio', one_pager: 'One-Pager', fact_sheet: 'Fact Sheet' }
const AUDIENCES = ['general', 'investor', 'media', 'farmer', 'rancher', 'official', 'reader']
type AssetForm = { title: string; type: string; audience: string; content: string; notes: string; is_approved: boolean }
const EMPTY: AssetForm = { title: '', type: 'email_template', audience: 'general', content: '', notes: '', is_approved: false }

export function ContentLibrary() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<ContentAsset | null>(null)
  const [deleting, setDeleting] = useState<ContentAsset | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  const { data: assets = [], isLoading } = useQuery({ queryKey: ['content', filter], queryFn: () => api.content.list(filter ? { type: filter } : {}) })

  const createMut = useMutation({
    mutationFn: () => api.content.create({ ...form, is_approved: form.is_approved ? 1 : 0 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['content'] }); setShowAdd(false); setForm({ ...EMPTY }); toast.success('Asset created') },
    onError: () => toast.error('Failed'),
  })

  const updateMut = useMutation({
    mutationFn: () => api.content.update(editing!.id, { ...form, is_approved: form.is_approved ? 1 : 0 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['content'] }); setEditing(null); toast.success('Updated') },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.content.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['content'] }); toast.success('Deleted') },
  })

  const openEdit = (a: ContentAsset) => { setEditing(a); setForm({ title: a.title, type: a.type, audience: a.audience, content: a.content || '', notes: a.notes || '', is_approved: !!a.is_approved }) }
  const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 1500) }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2"><FileText className="w-5 h-5 text-slate-400" />Content Library</h1>
          <p className="text-xs text-slate-500 mt-1">{assets.length} assets — emails, releases, pitches, social posts</p>
        </div>
        <button className="btn-primary text-xs" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" />New Asset</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('')} className={cn('btn-ghost text-xs py-1 px-2.5', !filter && 'bg-white/8 text-slate-200')}>All</button>
        {ASSET_TYPES.map(t => (
          <button key={t} onClick={() => setFilter(t)} className={cn('btn-ghost text-xs py-1 px-2.5', filter === t && 'bg-white/8 text-slate-200')}>{TYPE_LABELS[t]}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-24"><div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : assets.length === 0 ? (
        <div className="op-card p-12 text-center">
          <FileText className="w-7 h-7 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No content assets yet</p>
          <button className="btn-primary text-xs mt-4" onClick={() => setShowAdd(true)}><Plus className="w-3 h-3" />Add first asset</button>
        </div>
      ) : (
        <div className="space-y-2">
          {assets.map(a => (
            <div key={a.id} className="op-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-200">{a.title}</p>
                    {a.is_approved ? <span className="status-badge text-green-300 bg-green-900/20 border-green-700/40">Approved</span> : null}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-600">
                    <span>{TYPE_LABELS[a.type] || a.type}</span>
                    <span>For: {a.audience}</span>
                    {a.notes && <span className="truncate max-w-48">{a.notes}</span>}
                  </div>
                  {a.content && <p className="text-xs text-slate-500 mt-2 line-clamp-2 whitespace-pre-wrap">{a.content.slice(0, 200)}{a.content.length > 200 ? '…' : ''}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {a.content && (
                    <button className="btn-ghost p-1.5" onClick={() => copy(a.content!, a.id)}>
                      {copied === a.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button className="btn-ghost p-1.5" onClick={() => openEdit(a)}><Edit3 className="w-3.5 h-3.5" /></button>
                  <button className="btn-ghost p-1.5 text-red-400/40 hover:text-red-400" onClick={() => setDeleting(a)}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd || !!editing} onClose={() => { setShowAdd(false); setEditing(null); setForm({ ...EMPTY }) }} title={editing ? 'Edit Asset' : 'New Content Asset'} size="lg">
        <div className="space-y-3">
          <div><label className="op-label">Title *</label><input className="op-input" value={form.title} onChange={f('title')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="op-label">Type</label><select className="op-input" value={form.type} onChange={f('type')}>{ASSET_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select></div>
            <div><label className="op-label">Audience</label><select className="op-input" value={form.audience} onChange={f('audience')}>{AUDIENCES.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}</select></div>
          </div>
          <div><label className="op-label">Content</label><textarea className="op-input resize-none font-mono text-xs" rows={8} value={form.content} onChange={f('content')} placeholder="Paste or write your content here…" /></div>
          <div><label className="op-label">Notes</label><input className="op-input" value={form.notes} onChange={f('notes')} /></div>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input type="checkbox" checked={!!form.is_approved} onChange={e => setForm(p => ({ ...p, is_approved: e.target.checked }))} className="accent-brand-400" />
            Mark as approved / ready to use
          </label>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button className="btn-secondary" onClick={() => { setShowAdd(false); setEditing(null) }}>Cancel</button>
          <button className="btn-primary" onClick={() => editing ? updateMut.mutate() : createMut.mutate()} disabled={!form.title.trim()}>{createMut.isPending || updateMut.isPending ? 'Saving…' : 'Save Asset'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Delete "${deleting?.title}"?`} confirmLabel="Delete" danger onConfirm={() => { deleteMut.mutate(deleting!.id); setDeleting(null) }} />
    </div>
  )
}
