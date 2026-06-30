import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
  cn, formatCurrency, formatDate, formatDateTime,
  MARKET_MODE_LABELS, MARKET_MODE_COLORS, STATUS_COLORS, STATUS_LABELS,
  SCORE_BG, SCORE_LABELS, CONFIDENCE_COLORS, CLASSIFICATION_COLORS, ALL_STATUSES,
  scoreToClassification,
} from '@/lib/utils'
import { MarketModeBadge } from '@/components/shared/MarketModeIcon'
import { DemoBanner } from '@/components/shared/DemoDataBanner'
import {
  ArrowLeft, Edit2, Plus, RefreshCw, MessageSquare, Download, Trash2,
  Star, MapPin, Globe, DollarSign, Calendar, Clock, Shield, AlertTriangle,
  ChevronRight, User, Phone, Mail, Linkedin, CheckCircle, XCircle, Loader2,
  BarChart2, FileText, Activity, StickyNote, Target, ExternalLink, Info,
  Save, X, Briefcase, Building2, Zap,
} from 'lucide-react'
import type { TargetEntity, Contact, ScoreRecord, ResearchClaim, Opportunity, Note, Activity as ActivityType } from '@/types'

const TABS = [
  { id: 'overview', label: 'Overview', icon: Target },
  { id: 'contacts', label: 'Contacts', icon: User },
  { id: 'score', label: 'Score Breakdown', icon: BarChart2 },
  { id: 'claims', label: 'Research Claims', icon: FileText },
  { id: 'opportunities', label: 'Opportunities', icon: Briefcase },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'activity', label: 'Activity', icon: Activity },
] as const

type TabId = typeof TABS[number]['id']

// ---- Edit Target Modal ----
function EditTargetModal({ target, onClose, onSaved }: { target: TargetEntity; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: target.name || '',
    description: target.description || '',
    website: target.website || '',
    primary_location: target.primary_location || '',
    industry: target.industry || '',
    estimated_value: target.estimated_value?.toString() || '',
    status: target.status,
  })
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => api.targets.update(target.id, {
      ...form,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['target', target.id] })
      qc.invalidateQueries({ queryKey: ['targets'] })
      toast.success('Target updated')
      onSaved()
    },
    onError: () => toast.error('Failed to update target'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-slate-700/50 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/40">
          <h2 className="text-sm font-semibold text-slate-100">Edit Target</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div><label className="fm-label">Name</label><input className="fm-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="fm-label">Description</label><textarea className="fm-input min-h-[80px] resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="fm-label">Website</label><input className="fm-input" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://" /></div>
            <div><label className="fm-label">Location</label><input className="fm-input" value={form.primary_location} onChange={e => setForm(f => ({ ...f, primary_location: e.target.value }))} /></div>
            <div><label className="fm-label">Industry</label><input className="fm-input" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} /></div>
            <div><label className="fm-label">Estimated Value</label><input className="fm-input" type="number" value={form.estimated_value} onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))} placeholder="0" /></div>
          </div>
          <div>
            <label className="fm-label">Status</label>
            <select className="fm-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))}>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-slate-700/40">
          <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
          <button className="btn-primary text-sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Add Contact Modal ----
function AddContactModal({ targetId, onClose, onSaved }: { targetId: string; onClose: () => void; onSaved: () => void }) {
  const ROLE_TYPES = ['Decision Maker','Influencer','Technical Contact','Procurement','Accounts Payable','Executive Sponsor','Contract Officer','Program Manager','Referral Source','Other']
  const [form, setForm] = useState({ name: '', title: '', role_type: 'Decision Maker', email: '', phone: '', notes: '', is_primary: false })
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => api.contacts.create({ ...form, target_entity_id: targetId, is_primary: form.is_primary ? 1 : 0 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts', targetId] }); toast.success('Contact added'); onSaved() },
    onError: () => toast.error('Failed to add contact'),
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-slate-700/50 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/40">
          <h2 className="text-sm font-semibold text-slate-100">Add Contact</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="fm-label">Name</label><input className="fm-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="fm-label">Title</label><input className="fm-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          </div>
          <div><label className="fm-label">Role Type</label><select className="fm-input" value={form.role_type} onChange={e => setForm(f => ({ ...f, role_type: e.target.value }))}>{ROLE_TYPES.map(r => <option key={r}>{r}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="fm-label">Email</label><input className="fm-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="fm-label">Phone</label><input className="fm-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div><label className="fm-label">Notes</label><textarea className="fm-input resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input type="checkbox" checked={form.is_primary} onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))} />
            Set as primary contact
          </label>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-slate-700/40">
          <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
          <button className="btn-primary text-sm" onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.role_type}>
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add Contact
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Add Opportunity Modal ----
function AddOpportunityModal({ targetId, onClose, onSaved }: { targetId: string; onClose: () => void; onSaved: () => void }) {
  const STAGES = ['identified','qualifying','proposal','negotiation','closed_won','closed_lost']
  const STAGE_LABELS: Record<string, string> = { identified: 'Identified', qualifying: 'Qualifying', proposal: 'Proposal', negotiation: 'Negotiation', closed_won: 'Won', closed_lost: 'Lost' }
  const [form, setForm] = useState({ title: '', opportunity_type: 'contract', description: '', estimated_value: '', probability: '50', stage: 'identified', expected_decision_date: '' })
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => api.opportunities.create({
      ...form,
      target_entity_id: targetId,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined,
      probability: Number(form.probability),
      stage: form.stage as import('@/types').OpportunityStage,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['opportunities', targetId] }); toast.success('Opportunity created'); onSaved() },
    onError: () => toast.error('Failed to create opportunity'),
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-slate-700/50 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/40">
          <h2 className="text-sm font-semibold text-slate-100">Create Opportunity</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div><label className="fm-label">Title</label><input className="fm-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Opportunity name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="fm-label">Stage</label><select className="fm-input" value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>{STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}</select></div>
            <div><label className="fm-label">Probability (%)</label><input className="fm-input" type="number" min="0" max="100" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value }))} /></div>
            <div><label className="fm-label">Estimated Value</label><input className="fm-input" type="number" value={form.estimated_value} onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))} placeholder="0" /></div>
            <div><label className="fm-label">Decision Date</label><input className="fm-input" type="date" value={form.expected_decision_date} onChange={e => setForm(f => ({ ...f, expected_decision_date: e.target.value }))} /></div>
          </div>
          <div><label className="fm-label">Description</label><textarea className="fm-input resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-slate-700/40">
          <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
          <button className="btn-primary text-sm" onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title}>
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Refresh Intelligence Modal ----
function EnrichModal({ targetId, onClose, onDone }: { targetId: string; onClose: () => void; onDone: () => void }) {
  const [phase, setPhase] = useState<'analyze' | 'propose' | 'review' | 'done'>('analyze')
  const [analysis, setAnalysis] = useState<{ missing_fields: {field:string;label:string}[]; stale_fields: {field:string;label:string;current:string}[]; low_confidence_fields: {field:string;label:string;current:string}[] } | null>(null)
  const [proposals, setProposals] = useState<{id:string;field:string;field_label:string;old_value:string|null;new_value:unknown;classification:string;confidence:string;caution:string}[]>([])
  const [accepted, setAccepted] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const qc = useQueryClient()

  const analyze = async () => {
    setLoading(true)
    try {
      const data = await api.enrich.analyze(targetId) as typeof analysis
      setAnalysis(data)
      setPhase('propose')
    } catch { toast.error('Analysis failed') } finally { setLoading(false) }
  }

  const propose = async () => {
    setLoading(true)
    try {
      const data = await api.enrich.propose(targetId) as { proposals: typeof proposals }
      setProposals(data.proposals || [])
      setAccepted(new Set(data.proposals.map((p: {id:string}) => p.id)))
      setPhase('review')
    } catch { toast.error('Failed to generate proposals') } finally { setLoading(false) }
  }

  const acceptChanges = async () => {
    setLoading(true)
    try {
      const acc = proposals.filter(p => accepted.has(p.id))
      const rej = proposals.filter(p => !accepted.has(p.id))
      await api.enrich.accept(targetId, { accepted: acc, rejected: rej, claim_proposals: [] })
      qc.invalidateQueries({ queryKey: ['target', targetId] })
      setPhase('done')
      toast.success(`${acc.length} enrichment change${acc.length !== 1 ? 's' : ''} applied`)
      onDone()
    } catch { toast.error('Failed to apply changes') } finally { setLoading(false) }
  }

  const toggleAccept = (id: string) => {
    setAccepted(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-slate-700/50 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/40">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold text-slate-100">Refresh Intelligence</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4">
          {phase === 'analyze' && (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs text-slate-400">Analyze this target to identify missing data fields, stale information, and low-confidence values that can be improved.</p>
              <div className="demo-banner text-xs"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />Demo mode: Enrichment proposals are generated for workflow demonstration only.</div>
              <button className="btn-primary" onClick={analyze} disabled={loading}>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Analyze Target
              </button>
            </div>
          )}

          {phase === 'propose' && analysis && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-red-950/20 border border-red-800/30 rounded-lg p-2">
                  <div className="text-lg font-bold text-red-400">{analysis.missing_fields.length}</div>
                  <div className="text-[10px] text-slate-500">Missing Fields</div>
                </div>
                <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-2">
                  <div className="text-lg font-bold text-amber-400">{analysis.stale_fields.length}</div>
                  <div className="text-[10px] text-slate-500">Stale Fields</div>
                </div>
                <div className="bg-blue-950/20 border border-blue-800/30 rounded-lg p-2">
                  <div className="text-lg font-bold text-blue-400">{analysis.low_confidence_fields.length}</div>
                  <div className="text-[10px] text-slate-500">Low Confidence</div>
                </div>
              </div>
              {analysis.missing_fields.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-1.5">Missing</p>
                  <div className="flex flex-wrap gap-1">{analysis.missing_fields.map(f => <span key={f.field} className="text-[10px] bg-slate-800 border border-slate-700/50 px-2 py-0.5 rounded text-slate-300">{f.label}</span>)}</div>
                </div>
              )}
              <button className="btn-primary w-full" onClick={propose} disabled={loading}>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Generate Enrichment Proposals
              </button>
            </div>
          )}

          {phase === 'review' && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {proposals.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No enrichment proposals available for this target.</p>
              ) : (
                proposals.map(p => (
                  <div key={p.id} className={cn('border rounded-lg p-3 cursor-pointer transition-colors', accepted.has(p.id) ? 'border-teal-500/40 bg-teal-950/10' : 'border-slate-700/40')} onClick={() => toggleAccept(p.id)}>
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">{accepted.has(p.id) ? <CheckCircle className="w-3.5 h-3.5 text-teal-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-600" />}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-200">{p.field_label}</span>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded', CLASSIFICATION_COLORS[p.classification as keyof typeof CLASSIFICATION_COLORS] || 'bg-slate-800 text-slate-400')}>{p.classification}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mb-1">
                          <span className="text-slate-600">{p.old_value ?? '(empty)'}</span>
                          <ChevronRight className="w-2.5 h-2.5 inline mx-1 text-slate-600" />
                          <span className="text-slate-200">{String(p.new_value)}</span>
                        </div>
                        {p.caution && <p className="text-[10px] text-amber-500/80">{p.caution}</p>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {phase === 'done' && (
            <div className="text-center py-6 space-y-2">
              <CheckCircle className="w-8 h-8 text-teal-400 mx-auto" />
              <p className="text-sm font-medium text-slate-200">Intelligence Refresh Complete</p>
              <p className="text-xs text-slate-400">Target data has been updated. Review the changes in the Overview tab.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-slate-700/40">
          <button className="btn-ghost text-sm" onClick={onClose}>Close</button>
          {phase === 'review' && proposals.length > 0 && (
            <button className="btn-primary text-sm" onClick={acceptChanges} disabled={loading || accepted.size === 0}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Apply {accepted.size} Change{accepted.size !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- Generate Message Modal ----
function GenerateMessageModal({ target, onClose }: { target: TargetEntity; onClose: () => void }) {
  const [channel, setChannel] = useState('email')
  const [tone, setTone] = useState('professional')
  const [generated, setGenerated] = useState<{ subject?: string; body: string; disclaimer: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const qc = useQueryClient()

  const generate = async () => {
    setLoading(true)
    try {
      const data = await api.messages.generate(target.id, channel, tone)
      setGenerated(data)
    } catch { toast.error('Failed to generate message') } finally { setLoading(false) }
  }

  const save = async () => {
    if (!generated) return
    try {
      await api.messages.create({ target_entity_id: target.id, channel, tone, subject: generated.subject, body: generated.body, status: 'draft' })
      qc.invalidateQueries({ queryKey: ['messages', target.id] })
      toast.success('Message saved to drafts')
      onClose()
    } catch { toast.error('Failed to save message') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-slate-700/50 rounded-xl w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/40">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold text-slate-100">Generate Outreach Message</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1"><label className="fm-label">Channel</label>
              <select className="fm-input" value={channel} onChange={e => setChannel(e.target.value)}>
                {['email','phone','linkedin','letter','in_person'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="flex-1"><label className="fm-label">Tone</label>
              <select className="fm-input" value={tone} onChange={e => setTone(e.target.value)}>
                {['professional','consultative','partnership','formal','casual'].map(t => <option key={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {!generated ? (
            <div className="text-center py-4">
              <div className="demo-banner text-xs mb-3"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />Demo mode: Message content is simulated. Never send without review and editing.</div>
              <button className="btn-primary" onClick={generate} disabled={loading}>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                Generate Message
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {generated.subject && (
                <div><label className="fm-label">Subject</label><div className="fm-input text-slate-200 text-xs">{generated.subject}</div></div>
              )}
              <div><label className="fm-label">Body</label>
                <div className="fm-input text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">{generated.body}</div>
              </div>
              <p className="text-[10px] text-amber-500/80">{generated.disclaimer}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-slate-700/40">
          <button className="btn-ghost text-sm" onClick={onClose}>Close</button>
          {generated && <button className="btn-primary text-sm" onClick={save}><Save className="w-3.5 h-3.5" />Save to Drafts</button>}
        </div>
      </div>
    </div>
  )
}

// ---- Confidence Badge ----
function ConfidenceBadge({ level }: { level: string }) {
  const colors: Record<string, string> = { low: 'text-red-400 bg-red-950/20 border-red-800/30', medium: 'text-amber-400 bg-amber-950/20 border-amber-800/30', high: 'text-teal-400 bg-teal-950/20 border-teal-800/30', verified: 'text-emerald-400 bg-emerald-950/20 border-emerald-800/30' }
  return <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', colors[level] || colors.low)}>{level}</span>
}

// ---- Classification Badge ----
function ClassificationBadge({ cls }: { cls: string }) {
  return <span className={cn('text-[10px] px-1.5 py-0.5 rounded', CLASSIFICATION_COLORS[cls as keyof typeof CLASSIFICATION_COLORS] || 'bg-slate-800 text-slate-400')}>{cls?.replace('_', ' ')}</span>
}

// ---- Activity Icon ----
function ActivityIcon({ type }: { type: string }) {
  const icons: Record<string, typeof Activity> = {
    note: StickyNote, email: Mail, call: Phone, meeting: User, research: Target,
    enrichment: Zap, status_change: RefreshCw, message_sent: MessageSquare, import: Download, system: Info,
  }
  const Icon = icons[type] || Activity
  return <Icon className="w-3.5 h-3.5" />
}

// ---- Main Component ----
export function TargetProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabId>('overview')
  const [showEdit, setShowEdit] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [showAddOpp, setShowAddOpp] = useState(false)
  const [showEnrich, setShowEnrich] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [noteBody, setNoteBody] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: target, isLoading, error } = useQuery({
    queryKey: ['target', id],
    queryFn: () => api.targets.get(id!),
    enabled: !!id,
  })

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', id],
    queryFn: () => api.contacts.list(id!),
    enabled: !!id,
  })

  const { data: score } = useQuery({
    queryKey: ['score', id],
    queryFn: () => api.scores.get(id!),
    enabled: !!id,
  })

  const { data: claims = [] } = useQuery({
    queryKey: ['claims', id],
    queryFn: () => api.claims.list(id!),
    enabled: !!id,
  })

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities', id],
    queryFn: () => api.opportunities.list(id),
    enabled: !!id,
  })

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', id],
    queryFn: () => api.notes.list(id!),
    enabled: !!id,
  })

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', id],
    queryFn: () => api.activities.list(id),
    enabled: !!id,
  })

  const deleteTarget = useMutation({
    mutationFn: () => api.targets.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['targets'] })
      toast.success('Target deleted')
      navigate('/targets')
    },
    onError: () => toast.error('Failed to delete target'),
  })

  const recalcScore = useMutation({
    mutationFn: () => api.scores.calculate(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['score', id] }); toast.success('Score recalculated') },
    onError: () => toast.error('Failed to recalculate score'),
  })

  const addNote = async () => {
    if (!noteBody.trim() || !id) return
    setAddingNote(true)
    try {
      await api.notes.create(id, noteBody)
      qc.invalidateQueries({ queryKey: ['notes', id] })
      qc.invalidateQueries({ queryKey: ['activities', id] })
      setNoteBody('')
      toast.success('Note added')
    } catch { toast.error('Failed to add note') } finally { setAddingNote(false) }
  }

  const deleteNote = useMutation({
    mutationFn: (noteId: string) => api.notes.delete(noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', id] }),
    onError: () => toast.error('Failed to delete note'),
  })

  const deleteContact = useMutation({
    mutationFn: (cid: string) => api.contacts.delete(cid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts', id] }),
    onError: () => toast.error('Failed to delete contact'),
  })

  const deleteOpp = useMutation({
    mutationFn: (oid: string) => api.opportunities.delete(oid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunities', id] }),
    onError: () => toast.error('Failed to delete opportunity'),
  })

  const exportProfile = () => {
    if (!target) return
    const data = { target, contacts, score, claims, opportunities, notes, exported_at: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${target.name.replace(/\s+/g, '_')}_profile.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
    </div>
  )

  if (error || !target) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertTriangle className="w-8 h-8 text-red-400" />
      <p className="text-slate-400">Target not found</p>
      <Link to="/targets" className="btn-secondary text-sm"><ArrowLeft className="w-3.5 h-3.5" />Back to Targets</Link>
    </div>
  )

  const classification = scoreToClassification(score?.total_score)
  const scoreBg = SCORE_BG[classification]
  const tags = (() => { try { return JSON.parse(target.tags_json || '[]') } catch { return [] } })()

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/targets" className="hover:text-slate-300 transition-colors">Targets</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-300">{target.name}</span>
      </div>

      {target.is_demo ? <DemoBanner /> : null}

      {/* Header Card */}
      <div className="fm-card p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border', MARKET_MODE_COLORS[target.market_mode])}>
            <Building2 className="w-6 h-6 opacity-80" />
          </div>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-100">{target.name}</h1>
              {target.is_demo && <span className="text-[10px] bg-amber-950/60 border border-amber-700/40 text-amber-400 px-1.5 py-0.5 rounded font-medium mt-1">DEMO</span>}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <MarketModeBadge mode={target.market_mode} />
              <span className={cn('text-xs px-2 py-0.5 rounded border font-medium', STATUS_COLORS[target.status])}>{STATUS_LABELS[target.status]}</span>
              {target.entity_type && <span className="text-[10px] text-slate-500 capitalize">{target.entity_type.replace(/_/g, ' ')}</span>}
              {tags.map((t: { id: string; name: string; color: string }) => (
                <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded text-white font-medium" style={{ backgroundColor: t.color + '40', border: `1px solid ${t.color}60`, color: t.color }}>{t.name}</span>
              ))}
            </div>

            {/* Key metadata row */}
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 flex-wrap">
              {target.primary_location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{target.primary_location}</span>}
              {target.website && <a href={target.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-teal-400 transition-colors"><Globe className="w-3 h-3" />{target.domain || target.website}</a>}
              {target.industry && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{target.industry}</span>}
              {target.estimated_value != null && <span className="flex items-center gap-1 text-emerald-400"><DollarSign className="w-3 h-3" />{formatCurrency(target.estimated_value)}</span>}
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Added {formatDate(target.created_at)}</span>
            </div>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            {score ? (
              <>
                <div className={cn('text-3xl font-black', score.total_score >= 85 ? 'text-emerald-400' : score.total_score >= 70 ? 'text-teal-400' : score.total_score >= 55 ? 'text-amber-400' : 'text-slate-400')}>
                  {score.total_score}
                </div>
                <span className={cn('text-[10px] px-2 py-0.5 rounded border font-medium', scoreBg)}>{SCORE_LABELS[classification]}</span>
                <span className="text-[10px] text-slate-600">/ 100</span>
              </>
            ) : (
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-600">—</div>
                <span className="text-[10px] text-slate-600">No score</span>
              </div>
            )}
          </div>
        </div>

        {target.description && (
          <p className="text-xs text-slate-400 leading-relaxed mt-4 pt-4 border-t border-slate-700/40">{target.description}</p>
        )}

        {/* Data quality badges */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700/40 flex-wrap">
          <span className="text-[10px] text-slate-600">Data Quality:</span>
          <ConfidenceBadge level={target.confidence_level} />
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', target.verification_status === 'verified' ? 'text-emerald-400 bg-emerald-950/20 border-emerald-800/30' : target.verification_status === 'sourced' ? 'text-teal-400 bg-teal-950/20 border-teal-800/30' : target.verification_status === 'partial' ? 'text-amber-400 bg-amber-950/20 border-amber-800/30' : 'text-slate-500 bg-slate-800/30 border-slate-700/30')}>
            {target.verification_status}
          </span>
          {target.last_enriched_at && <span className="text-[10px] text-slate-600 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />Enriched {formatDate(target.last_enriched_at, true)}</span>}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button className="btn-secondary text-xs" onClick={() => setShowEdit(true)}>
          <Edit2 className="w-3.5 h-3.5" />Edit
        </button>
        <button className="btn-secondary text-xs" onClick={() => { setTab('contacts'); setShowAddContact(true) }}>
          <Plus className="w-3.5 h-3.5" />Add Contact
        </button>
        <button className="btn-secondary text-xs" onClick={() => { setTab('notes'); }}>
          <StickyNote className="w-3.5 h-3.5" />Add Note
        </button>
        <button className="btn-secondary text-xs" onClick={() => { setTab('opportunities'); setShowAddOpp(true) }}>
          <Briefcase className="w-3.5 h-3.5" />Add Opportunity
        </button>
        <button className="btn-primary text-xs" onClick={() => setShowEnrich(true)}>
          <RefreshCw className="w-3.5 h-3.5" />Refresh Intelligence
        </button>
        <button className="btn-secondary text-xs" onClick={() => setShowMessage(true)}>
          <MessageSquare className="w-3.5 h-3.5" />Generate Message
        </button>
        <button className="btn-secondary text-xs" onClick={exportProfile}>
          <Download className="w-3.5 h-3.5" />Export
        </button>
        <button className="btn-danger text-xs ml-auto" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="w-3.5 h-3.5" />Delete
        </button>
      </div>

      {/* Tabs */}
      <div className="fm-card overflow-hidden">
        {/* Tab nav */}
        <div className="flex border-b border-slate-700/40 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon
            const counts: Partial<Record<TabId, number>> = {
              contacts: contacts.length,
              claims: (claims as ResearchClaim[]).length,
              opportunities: (opportunities as Opportunity[]).length,
              notes: (notes as Note[]).length,
              activity: (activities as ActivityType[]).length,
            }
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0',
                  tab === t.id ? 'border-teal-500 text-teal-400 bg-teal-950/10' : 'border-transparent text-slate-500 hover:text-slate-300'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {counts[t.id] !== undefined && counts[t.id]! > 0 && (
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', tab === t.id ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-700 text-slate-400')}>
                    {counts[t.id]}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="p-4">

          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <div className="grid grid-cols-2 gap-4">
              {/* Left: Key Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Key Details</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Market Mode', value: MARKET_MODE_LABELS[target.market_mode] },
                      { label: 'Entity Type', value: target.entity_type?.replace(/_/g, ' ') },
                      { label: 'Status', value: STATUS_LABELS[target.status] },
                      { label: 'Industry', value: target.industry },
                      { label: 'Subindustry', value: target.subindustry },
                      { label: 'Location', value: target.primary_location },
                      { label: 'Service Area', value: target.service_area },
                      { label: 'Website', value: target.website },
                      { label: 'Domain', value: target.domain },
                      { label: 'NAICS Code', value: target.naics_code },
                      { label: 'PSC Code', value: target.psc_code },
                      { label: 'Fiscal Year', value: target.fiscal_year },
                      { label: 'Set-Aside Type', value: target.set_aside_type },
                      { label: 'Opportunity Type', value: target.opportunity_type },
                      { label: 'Acquisition Path', value: target.acquisition_path },
                    ].filter(d => d.value).map(d => (
                      <div key={d.label} className="flex items-start justify-between gap-2 text-xs">
                        <span className="text-slate-500 flex-shrink-0 w-32">{d.label}</span>
                        <span className="text-slate-200 text-right">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {contacts.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Primary Contact</h3>
                    {contacts.filter((c: Contact) => c.is_primary || c === contacts[0]).slice(0, 1).map((c: Contact) => (
                      <div key={c.id} className="bg-slate-800/30 rounded-lg p-3 space-y-1.5">
                        {c.name && <div className="text-sm font-medium text-slate-200">{c.name}</div>}
                        {c.title && <div className="text-xs text-slate-400">{c.title}</div>}
                        {c.email && <div className="flex items-center gap-1.5 text-xs text-slate-400"><Mail className="w-3 h-3" />{c.email}</div>}
                        {c.phone && <div className="flex items-center gap-1.5 text-xs text-slate-400"><Phone className="w-3 h-3" />{c.phone}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Value + Score + Timeline */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Value & Pipeline</h3>
                  <div className="space-y-2">
                    <div className="bg-slate-800/30 rounded-lg p-3">
                      <div className="text-[10px] text-slate-500 mb-1">Estimated Value</div>
                      <div className="text-lg font-bold text-emerald-400">{formatCurrency(target.estimated_value)}</div>
                    </div>
                    {(opportunities as Opportunity[]).length > 0 && (
                      <div className="bg-slate-800/30 rounded-lg p-3">
                        <div className="text-[10px] text-slate-500 mb-2">Active Opportunities</div>
                        {(opportunities as Opportunity[]).slice(0, 3).map((o: Opportunity) => (
                          <div key={o.id} className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-300 truncate">{o.title}</span>
                            <span className="text-emerald-400 flex-shrink-0 ml-2">{formatCurrency(o.estimated_value, true)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Record Timeline</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Created</span><span className="text-slate-300">{formatDate(target.created_at)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Updated</span><span className="text-slate-300">{formatDate(target.updated_at)}</span></div>
                    {target.last_enriched_at && <div className="flex justify-between"><span className="text-slate-500">Last Enriched</span><span className="text-slate-300">{formatDate(target.last_enriched_at)}</span></div>}
                  </div>
                </div>

                {score && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Score Summary</h3>
                    <div className="bg-slate-800/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Total Score</span>
                        <span className={cn('text-sm font-bold', score.total_score >= 85 ? 'text-emerald-400' : score.total_score >= 70 ? 'text-teal-400' : score.total_score >= 55 ? 'text-amber-400' : 'text-slate-400')}>
                          {score.total_score}/100
                        </span>
                      </div>
                      {score.dimensions?.slice(0, 4).map((d) => (
                        <div key={d.id}>
                          <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                            <span>{d.dimension_name}</span>
                            <span>{d.points_earned}/{d.maximum_points}</span>
                          </div>
                          <div className="score-bar-track">
                            <div className="h-full bg-teal-500/70 rounded-full" style={{ width: `${(d.points_earned / d.maximum_points) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Type-specific intelligence panel — full width below grid */}
              {['county', 'local_agency'].includes(target.entity_type) && (
                <div className="col-span-2 fm-card p-4 border-blue-700/20">
                  <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />County Development Profile
                  </h3>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    {[
                      { label: 'Development Type', value: (target as TargetEntity & { development_type?: string }).development_type },
                      { label: 'NAICS Code', value: target.naics_code },
                      { label: 'Service Area', value: target.service_area },
                    ].filter(d => d.value).map(d => (
                      <div key={d.label}><span className="text-slate-500 block">{d.label}</span><span className="text-slate-200">{d.value}</span></div>
                    ))}
                  </div>
                  {target.description && <p className="text-xs text-slate-400 mt-3 border-t border-[#243044] pt-3">{target.description}</p>}
                </div>
              )}

              {['state_agency', 'government_program'].includes(target.entity_type) && (
                <div className="col-span-2 fm-card p-4 border-green-700/20">
                  <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />State Agency Profile
                  </h3>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    {[
                      { label: 'Development Type', value: (target as TargetEntity & { development_type?: string }).development_type },
                      { label: 'Acquisition Path', value: target.acquisition_path },
                      { label: 'Set-Aside Type', value: target.set_aside_type },
                      { label: 'PSC Code', value: target.psc_code },
                      { label: 'Fiscal Year', value: target.fiscal_year },
                      { label: 'Opportunity Type', value: target.opportunity_type },
                    ].filter(d => d.value).map(d => (
                      <div key={d.label}><span className="text-slate-500 block">{d.label}</span><span className="text-slate-200">{d.value}</span></div>
                    ))}
                  </div>
                </div>
              )}

              {['funding_program'].includes(target.entity_type) && (
                <div className="col-span-2 fm-card p-4 border-emerald-700/20">
                  <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5" />Funding Profile
                  </h3>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    {[
                      { label: 'Development Type', value: (target as TargetEntity & { development_type?: string }).development_type },
                      { label: 'Opportunity Type', value: target.opportunity_type },
                      { label: 'Fiscal Year', value: target.fiscal_year },
                      { label: 'Acquisition Path', value: target.acquisition_path },
                      { label: 'NAICS Code', value: target.naics_code },
                    ].filter(d => d.value).map(d => (
                      <div key={d.label}><span className="text-slate-500 block">{d.label}</span><span className="text-slate-200">{d.value}</span></div>
                    ))}
                  </div>
                </div>
              )}

              {['procurement_opportunity'].includes(target.entity_type) && (
                <div className="col-span-2 fm-card p-4 border-purple-700/20">
                  <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5" />Contract Profile
                  </h3>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    {[
                      { label: 'Development Type', value: (target as TargetEntity & { development_type?: string }).development_type },
                      { label: 'Opportunity Type', value: target.opportunity_type },
                      { label: 'Acquisition Path', value: target.acquisition_path },
                      { label: 'Set-Aside Type', value: target.set_aside_type },
                      { label: 'PSC Code', value: target.psc_code },
                      { label: 'Fiscal Year', value: target.fiscal_year },
                    ].filter(d => d.value).map(d => (
                      <div key={d.label}><span className="text-slate-500 block">{d.label}</span><span className="text-slate-200">{d.value}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONTACTS TAB */}
          {tab === 'contacts' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-400">{(contacts as Contact[]).length} Contact{(contacts as Contact[]).length !== 1 ? 's' : ''}</h3>
                <button className="btn-primary text-xs py-1" onClick={() => setShowAddContact(true)}><Plus className="w-3.5 h-3.5" />Add Contact</button>
              </div>
              {(contacts as Contact[]).length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No contacts yet</p>
                  <button className="btn-secondary text-xs mt-3" onClick={() => setShowAddContact(true)}><Plus className="w-3.5 h-3.5" />Add First Contact</button>
                </div>
              ) : (
                (contacts as Contact[]).map((c: Contact) => (
                  <div key={c.id} className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {c.is_primary ? <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> : null}
                          <span className="text-sm font-medium text-slate-200">{c.name || '(Name not provided)'}</span>
                          <ConfidenceBadge level={c.confidence_level} />
                        </div>
                        {c.title && <div className="text-xs text-slate-400 mb-1">{c.title}{c.department ? ` — ${c.department}` : ''}</div>}
                        <div className="text-[10px] text-slate-500 mb-2">{c.role_type}</div>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                          {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                          {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                          {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-400"><Linkedin className="w-3 h-3" />LinkedIn</a>}
                        </div>
                        {c.notes && <p className="text-[10px] text-slate-500 mt-2 italic">{c.notes}</p>}
                        {c.public_contact_path && <p className="text-[10px] text-slate-600 mt-1">{c.public_contact_path}</p>}
                      </div>
                      <button className="btn-ghost p-1 text-slate-600 hover:text-red-400" onClick={() => deleteContact.mutate(c.id)}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SCORE BREAKDOWN TAB */}
          {tab === 'score' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-400">Score Breakdown — {MARKET_MODE_LABELS[target.market_mode]} Model</h3>
                <button className="btn-secondary text-xs py-1" onClick={() => recalcScore.mutate()} disabled={recalcScore.isPending}>
                  {recalcScore.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Recalculate
                </button>
              </div>

              {!score ? (
                <div className="text-center py-8">
                  <BarChart2 className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 mb-3">No score calculated yet</p>
                  <button className="btn-primary text-xs" onClick={() => recalcScore.mutate()} disabled={recalcScore.isPending}>
                    {recalcScore.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart2 className="w-3.5 h-3.5" />}
                    Calculate Score
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                    <div className="text-center">
                      <div className={cn('text-4xl font-black', score.total_score >= 85 ? 'text-emerald-400' : score.total_score >= 70 ? 'text-teal-400' : score.total_score >= 55 ? 'text-amber-400' : 'text-slate-400')}>
                        {score.total_score}
                      </div>
                      <div className="text-[10px] text-slate-500">/ 100</div>
                    </div>
                    <div>
                      <div className={cn('text-sm font-semibold mb-1', SCORE_BG[classification].split(' ').find(c => c.startsWith('text-')))}>{SCORE_LABELS[classification]}</div>
                      <div className="text-[10px] text-slate-500">Confidence: <span className={CONFIDENCE_COLORS[score.confidence_level]}>{score.confidence_level}</span></div>
                      <div className="text-[10px] text-slate-500">Calculated {formatDate(score.calculated_at, true)}</div>
                    </div>
                    {/* Score bar */}
                    <div className="flex-1">
                      <div className="score-bar-track h-3 rounded-full">
                        <div
                          className={cn('h-full rounded-full transition-all duration-700', score.total_score >= 85 ? 'bg-emerald-500' : score.total_score >= 70 ? 'bg-teal-500' : score.total_score >= 55 ? 'bg-amber-500' : 'bg-slate-600')}
                          style={{ width: `${score.total_score}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                        <span>0</span><span>55</span><span>70</span><span>85</span><span>100</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {score.dimensions?.map((d) => (
                      <div key={d.id} className="bg-slate-800/20 border border-slate-700/20 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs font-medium text-slate-200">{d.dimension_name}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <ConfidenceBadge level={d.confidence_level} />
                            <span className={cn('text-sm font-bold', d.points_earned / d.maximum_points >= 0.8 ? 'text-emerald-400' : d.points_earned / d.maximum_points >= 0.6 ? 'text-teal-400' : d.points_earned / d.maximum_points >= 0.4 ? 'text-amber-400' : 'text-slate-400')}>
                              {d.points_earned}<span className="text-xs text-slate-600">/{d.maximum_points}</span>
                            </span>
                          </div>
                        </div>
                        <div className="score-bar-track mb-2">
                          <div
                            className={cn('h-full rounded-full', d.points_earned / d.maximum_points >= 0.7 ? 'bg-teal-500/80' : d.points_earned / d.maximum_points >= 0.4 ? 'bg-amber-500/80' : 'bg-red-500/50')}
                            style={{ width: `${(d.points_earned / d.maximum_points) * 100}%` }}
                          />
                        </div>
                        {d.explanation && <p className="text-[10px] text-slate-400">{d.explanation}</p>}
                        {d.missing_data_penalty > 0 && (
                          <p className="text-[10px] text-amber-500/80 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />−{d.missing_data_penalty} pts missing data penalty
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* RESEARCH CLAIMS TAB */}
          {tab === 'claims' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-400">{(claims as ResearchClaim[]).length} Research Claim{(claims as ResearchClaim[]).length !== 1 ? 's' : ''}</h3>
              </div>
              {(claims as ResearchClaim[]).length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No research claims recorded</p>
                  <p className="text-[10px] text-slate-600 mt-1">Run enrichment to generate initial claims</p>
                </div>
              ) : (
                (claims as ResearchClaim[]).map((c: ResearchClaim) => (
                  <div key={c.id} className="bg-slate-800/20 border border-slate-700/20 rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <ClassificationBadge cls={c.classification} />
                      <ConfidenceBadge level={c.confidence_level} />
                      <span className="text-[10px] text-slate-600 ml-auto">{c.claim_type?.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{c.claim_text}</p>
                    <div className="text-[10px] text-slate-600 mt-2">{formatDate(c.created_at)}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* OPPORTUNITIES TAB */}
          {tab === 'opportunities' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-400">{(opportunities as Opportunity[]).length} Opportunit{(opportunities as Opportunity[]).length !== 1 ? 'ies' : 'y'}</h3>
                <button className="btn-primary text-xs py-1" onClick={() => setShowAddOpp(true)}><Plus className="w-3.5 h-3.5" />Add Opportunity</button>
              </div>
              {(opportunities as Opportunity[]).length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No opportunities tracked yet</p>
                  <button className="btn-secondary text-xs mt-3" onClick={() => setShowAddOpp(true)}><Plus className="w-3.5 h-3.5" />Create First Opportunity</button>
                </div>
              ) : (
                (opportunities as Opportunity[]).map((o: Opportunity) => {
                  const stageColors: Record<string, string> = { identified: 'text-slate-400', qualifying: 'text-cyan-400', proposal: 'text-violet-400', negotiation: 'text-amber-400', closed_won: 'text-emerald-400', closed_lost: 'text-red-400' }
                  const stageLabels: Record<string, string> = { identified: 'Identified', qualifying: 'Qualifying', proposal: 'Proposal', negotiation: 'Negotiation', closed_won: 'Won', closed_lost: 'Lost' }
                  return (
                    <div key={o.id} className="bg-slate-800/20 border border-slate-700/20 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-200">{o.title}</span>
                            <span className={cn('text-[10px] font-medium', stageColors[o.stage])}>{stageLabels[o.stage]}</span>
                          </div>
                          {o.description && <p className="text-xs text-slate-400 mb-2">{o.description}</p>}
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            {o.estimated_value != null && <span className="text-emerald-400">{formatCurrency(o.estimated_value, true)}</span>}
                            <span>{o.probability}% probability</span>
                            {o.expected_decision_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(o.expected_decision_date)}</span>}
                          </div>
                        </div>
                        <button className="btn-ghost p-1 text-slate-600 hover:text-red-400" onClick={() => deleteOpp.mutate(o.id)}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* NOTES TAB */}
          {tab === 'notes' && (
            <div className="space-y-3">
              {/* Note composer */}
              <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
                <textarea
                  className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-600 resize-none outline-none leading-relaxed"
                  rows={3}
                  placeholder="Write a note…"
                  value={noteBody}
                  onChange={e => setNoteBody(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <button className="btn-primary text-xs py-1" onClick={addNote} disabled={!noteBody.trim() || addingNote}>
                    {addingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Add Note
                  </button>
                </div>
              </div>

              {(notes as Note[]).length === 0 ? (
                <div className="text-center py-6">
                  <StickyNote className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No notes yet</p>
                </div>
              ) : (
                (notes as Note[]).map((n: Note) => (
                  <div key={n.id} className="bg-slate-800/20 border border-slate-700/20 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{n.body}</p>
                        <div className="text-[10px] text-slate-600 mt-2">{formatDateTime(n.created_at)}</div>
                      </div>
                      <button className="btn-ghost p-1 text-slate-600 hover:text-red-400" onClick={() => deleteNote.mutate(n.id)}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ACTIVITY TAB */}
          {tab === 'activity' && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 mb-3">{(activities as ActivityType[]).length} Activities</h3>
              {(activities as ActivityType[]).length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No activity recorded yet</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[18px] top-0 bottom-0 w-px bg-slate-700/40" />
                  <div className="space-y-3">
                    {(activities as ActivityType[]).map((a: ActivityType) => (
                      <div key={a.id} className="flex items-start gap-3 pl-1">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700/50 flex items-center justify-center flex-shrink-0 z-10">
                          <ActivityIcon type={a.activity_type} />
                        </div>
                        <div className="flex-1 min-w-0 pb-3">
                          <div className="text-xs text-slate-200">{a.description}</div>
                          {a.outcome && <div className="text-[10px] text-slate-500 mt-0.5">Outcome: {a.outcome}</div>}
                          <div className="text-[10px] text-slate-600 mt-1">{formatDate(a.created_at, true)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-red-800/40 rounded-xl w-full max-w-sm shadow-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-4 h-4" />
              <h2 className="text-sm font-semibold">Delete Target</h2>
            </div>
            <p className="text-xs text-slate-400">Permanently delete <strong className="text-slate-200">{target.name}</strong>? This will also remove all contacts, notes, activities, and opportunities for this target.</p>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost text-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn-danger text-sm" onClick={() => deleteTarget.mutate()} disabled={deleteTarget.isPending}>
                {deleteTarget.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showEdit && <EditTargetModal target={target} onClose={() => setShowEdit(false)} onSaved={() => setShowEdit(false)} />}
      {showAddContact && <AddContactModal targetId={target.id} onClose={() => setShowAddContact(false)} onSaved={() => setShowAddContact(false)} />}
      {showAddOpp && <AddOpportunityModal targetId={target.id} onClose={() => setShowAddOpp(false)} onSaved={() => setShowAddOpp(false)} />}
      {showEnrich && <EnrichModal targetId={target.id} onClose={() => setShowEnrich(false)} onDone={() => setShowEnrich(false)} />}
      {showMessage && <GenerateMessageModal target={target} onClose={() => setShowMessage(false)} />}
    </div>
  )
}
