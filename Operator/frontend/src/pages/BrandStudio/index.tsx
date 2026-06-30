import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type BrandProfile } from '@/lib/api'
import { toast } from 'sonner'
import { Crosshair, BookOpen, Users, Edit3, Check, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'mission' | 'book' | 'audiences' | 'messaging'

function EditableField({ label, value, onSave, multiline = false, placeholder }: {
  label: string; value?: string; onSave: (v: string) => void; multiline?: boolean; placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')

  useEffect(() => { setDraft(value || '') }, [value])

  const save = () => { onSave(draft); setEditing(false) }

  if (!editing) return (
    <div className="group">
      <div className="op-label">{label}</div>
      <div className="flex items-start gap-2">
        <div className={cn('flex-1 text-sm', value ? 'text-slate-300' : 'text-slate-700 italic')} style={{ whiteSpace: 'pre-wrap' }}>
          {value || `Click to add ${label.toLowerCase()}…`}
        </div>
        <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 btn-ghost p-1 shrink-0">
          <Edit3 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="op-label">{label}</div>
      {multiline
        ? <textarea className="op-input resize-none" rows={4} value={draft} onChange={e => setDraft(e.target.value)} placeholder={placeholder} autoFocus />
        : <input className="op-input" value={draft} onChange={e => setDraft(e.target.value)} placeholder={placeholder} autoFocus onKeyDown={e => e.key === 'Enter' && save()} />
      }
      <div className="flex gap-2 mt-2">
        <button className="btn-primary text-xs py-1 px-2" onClick={save}><Check className="w-3 h-3" />Save</button>
        <button className="btn-ghost text-xs" onClick={() => { setDraft(value || ''); setEditing(false) }}>Cancel</button>
      </div>
    </div>
  )
}

function TagList({ label, items, onUpdate }: { label: string; items: string[]; onUpdate: (v: string[]) => void }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const add = () => {
    if (draft.trim()) { onUpdate([...items, draft.trim()]); setDraft(''); setAdding(false) }
  }

  return (
    <div>
      <div className="op-label">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1 text-xs bg-slate-800/60 border border-[#1f2d40] text-slate-300 px-2.5 py-1 rounded-full">
            {item}
            <button onClick={() => onUpdate(items.filter((_, j) => j !== i))} className="text-slate-600 hover:text-red-400 ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {adding ? (
          <div className="flex items-center gap-1">
            <input className="op-input py-0.5 px-2 text-xs w-40" value={draft} onChange={e => setDraft(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false) }} placeholder="Add item…" />
            <button className="btn-primary py-0.5 px-2 text-xs" onClick={add}><Check className="w-3 h-3" /></button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="btn-ghost text-xs py-0.5 px-2 text-slate-600">
            <Plus className="w-3 h-3" />Add
          </button>
        )}
      </div>
    </div>
  )
}

export function BrandStudio() {
  const [tab, setTab] = useState<Tab>('mission')
  const qc = useQueryClient()
  const { data: brand, isLoading } = useQuery({ queryKey: ['brand'], queryFn: () => api.brand.get() })

  const mut = useMutation({
    mutationFn: (data: Partial<BrandProfile>) => api.brand.update(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['brand'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Saved') },
    onError: () => toast.error('Save failed'),
  })

  const save = (data: Partial<BrandProfile>) => mut.mutate(data)

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'mission', label: 'Mission & Story', icon: Crosshair },
    { id: 'book', label: 'The Book', icon: BookOpen },
    { id: 'audiences', label: 'Audiences', icon: Users },
    { id: 'messaging', label: 'Key Messages', icon: Edit3 },
  ]

  if (isLoading) return <div className="flex items-center justify-center h-48"><div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-brand-400" />Brand Studio
        </h1>
        <p className="text-xs text-slate-500 mt-1">Your mission, story, messaging, and book — the foundation for everything you send.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1f2d40]">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
              tab === id ? 'border-brand-400 text-brand-300' : 'border-transparent text-slate-500 hover:text-slate-300'
            )}
          >
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {tab === 'mission' && (
        <div className="op-card p-5 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <EditableField label="Company / Brand Name" value={brand?.company_name} onSave={v => save({ company_name: v })} placeholder="Your company or brand name" />
            <EditableField label="Founder Name" value={brand?.founder_name} onSave={v => save({ founder_name: v })} placeholder="Your name" />
          </div>
          <EditableField label="Tagline" value={brand?.tagline} onSave={v => save({ tagline: v })} placeholder="One punchy line that captures what you do" />
          <EditableField label="Mission Statement" value={brand?.mission} onSave={v => save({ mission: v })} multiline placeholder="Why does your company exist? What are you fighting for?" />
          <EditableField label="The Problem (what we're losing)" value={brand?.problem_statement} onSave={v => save({ problem_statement: v })} multiline placeholder="Describe the problem — the fight we've been losing and why the old tools aren't working" />
          <EditableField label="The Solution (what you bring)" value={brand?.solution_statement} onSave={v => save({ solution_statement: v })} multiline placeholder="How does your tech change the game? What can you do that wasn't possible before?" />
          <EditableField label="Origin Story" value={brand?.origin_story} onSave={v => save({ origin_story: v })} multiline placeholder="How did you get here? What made you become the operator who decided to fight back with tech?" />
          <div className="grid grid-cols-2 gap-5">
            <EditableField label="Website" value={brand?.website} onSave={v => save({ website: v })} placeholder="https://" />
            <EditableField label="LinkedIn" value={brand?.linkedin} onSave={v => save({ linkedin: v })} placeholder="linkedin.com/in/..." />
          </div>
        </div>
      )}

      {tab === 'book' && (
        <div className="op-card p-5 space-y-5">
          <EditableField label="Book Title" value={brand?.book_title} onSave={v => save({ book_title: v })} placeholder="The title of your book" />
          <EditableField label="Subtitle" value={brand?.book_subtitle} onSave={v => save({ book_subtitle: v })} placeholder="Subtitle or working subtitle" />
          <EditableField label="Book Description / Pitch" value={brand?.book_description} onSave={v => save({ book_description: v })} multiline placeholder="What's the book about? Who is it for? Why does it matter?" />
          <div className="grid grid-cols-3 gap-5">
            <div>
              <div className="op-label">Book Status</div>
              <select className="op-input" value={brand?.book_status || 'writing'} onChange={e => save({ book_status: e.target.value })}>
                <option value="writing">Writing</option>
                <option value="editing">In Editing</option>
                <option value="design">In Design</option>
                <option value="pre_order">Pre-Order</option>
                <option value="published">Published</option>
              </select>
            </div>
            <EditableField label="Price ($)" value={brand?.book_price?.toString()} onSave={v => save({ book_price: parseFloat(v) || undefined })} placeholder="e.g. 24.99" />
            <EditableField label="Buy / Pre-Order Link" value={brand?.book_link} onSave={v => save({ book_link: v })} placeholder="Amazon, Shopify, etc." />
          </div>
        </div>
      )}

      {tab === 'audiences' && (
        <div className="op-card p-5 space-y-5">
          <TagList label="Primary Audiences" items={brand?.primary_audiences || []} onUpdate={v => save({ primary_audiences: v })} />
          <div className="border-t border-[#1f2d40] pt-5">
            <EditableField label="Call to Action — Investors" value={brand?.cta_investor} onSave={v => save({ cta_investor: v })} multiline placeholder="What do you want investors to do? (e.g. Schedule a 30-min call, review our deck)" />
          </div>
          <EditableField label="Call to Action — Customers" value={brand?.cta_customer} onSave={v => save({ cta_customer: v })} multiline placeholder="What do you want farmers/ranchers/land managers to do?" />
          <EditableField label="Call to Action — Readers" value={brand?.cta_reader} onSave={v => save({ cta_reader: v })} multiline placeholder="What do you want book readers to do? (buy, review, share)" />
        </div>
      )}

      {tab === 'messaging' && (
        <div className="op-card p-5 space-y-5">
          <EditableField label="Elevator Pitch (30 seconds)" value={brand?.elevator_pitch} onSave={v => save({ elevator_pitch: v })} multiline placeholder="If you had 30 seconds with a stranger on an elevator — what do you say?" />
          <TagList label="Key Differentiators" items={brand?.key_differentiators || []} onUpdate={v => save({ key_differentiators: v })} />
          <TagList label="Proof Points" items={brand?.proof_points || []} onUpdate={v => save({ proof_points: v })} />
          <div className="op-card p-4 bg-brand-900/10 border-brand-700/20">
            <p className="text-xs font-semibold text-brand-300 mb-2">Quick Messaging Angles by Audience</p>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
              <div><span className="text-slate-400 font-medium">Farmers/Ranchers:</span> Lost livestock, crop damage, real cost of the old way. Show ROI.</div>
              <div><span className="text-slate-400 font-medium">Land Managers:</span> Scale, data visibility, multi-property management. Show efficiency.</div>
              <div><span className="text-slate-400 font-medium">Investors:</span> Market size, tech moat, traction, team credibility. Show the opportunity.</div>
              <div><span className="text-slate-400 font-medium">Media/Readers:</span> The story — operator vs. a decades-old problem. Human, urgent, visual.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
