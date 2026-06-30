import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { cn, MARKET_MODE_LABELS } from '@/lib/utils'
import {
  Settings, Tag, Plus, Trash2, Loader2, Info, Shield, Database, Palette,
} from 'lucide-react'
import type { Tag as TagType } from '@/types'

const TAG_COLORS = [
  '#14b8a6', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ef4444', '#ec4899', '#6366f1', '#0ea5e9', '#84cc16',
]

function TagManager() {
  const qc = useQueryClient()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(TAG_COLORS[0])

  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => api.tags.list() })

  const createTag = useMutation({
    mutationFn: () => api.tags.create(newName, newColor),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); setNewName(''); toast.success('Tag created') },
    onError: () => toast.error('Failed to create tag'),
  })

  const deleteTag = useMutation({
    mutationFn: (id: string) => api.tags.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); toast.success('Tag deleted') },
    onError: () => toast.error('Failed to delete tag'),
  })

  return (
    <div className="fm-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-teal-400" />
        <h2 className="text-sm font-semibold text-slate-200">Tags</h2>
        <span className="text-[10px] text-slate-500 ml-auto">{(tags as TagType[]).length} tag{(tags as TagType[]).length !== 1 ? 's' : ''}</span>
      </div>

      {/* Create tag */}
      <div className="flex items-center gap-2">
        <input
          className="fm-input flex-1 text-xs"
          placeholder="New tag name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) createTag.mutate() }}
        />
        <div className="flex items-center gap-1">
          {TAG_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              className={cn('w-5 h-5 rounded-full border-2 transition-transform', newColor === c ? 'border-white scale-110' : 'border-transparent scale-100')}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button
          className="btn-primary text-xs py-1.5"
          onClick={() => { if (newName.trim()) createTag.mutate() }}
          disabled={!newName.trim() || createTag.isPending}
        >
          {createTag.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add
        </button>
      </div>

      {/* Tag list */}
      {(tags as TagType[]).length === 0 ? (
        <p className="text-xs text-slate-600 text-center py-3">No tags created yet</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(tags as TagType[]).map((t: TagType) => (
            <div key={t.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium group" style={{ backgroundColor: t.color + '20', borderColor: t.color + '50', color: t.color }}>
              <span>{t.name}</span>
              {t.usage_count !== undefined && <span className="text-[10px] opacity-60">({t.usage_count})</span>}
              <button className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" onClick={() => deleteTag.mutate(t.id)}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const MARKET_MODES = ['commercial', 'government', 'private_client', 'partner', 'stakeholder'] as const

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<'general' | 'tags' | 'data' | 'compliance'>('general')

  const SECTIONS = [
    { id: 'general' as const, label: 'General', icon: Settings },
    { id: 'tags' as const, label: 'Tags', icon: Tag },
    { id: 'data' as const, label: 'Data & Scoring', icon: Database },
    { id: 'compliance' as const, label: 'Compliance', icon: Shield },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Configure ForgeMark AI for your business</p>
      </div>

      <div className="grid grid-cols-[200px_1fr] gap-4">
        {/* Nav */}
        <div className="fm-card p-2 space-y-0.5 h-fit">
          {SECTIONS.map(s => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors text-left',
                  activeSection === s.id ? 'bg-teal-950/40 text-teal-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="space-y-4">
          {activeSection === 'general' && (
            <div className="space-y-4">
              <div className="fm-card p-5 space-y-4">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-teal-400" />Application Settings
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="fm-label">Organization Name</label>
                    <input className="fm-input" placeholder="Your organization name" defaultValue="My Organization" />
                  </div>
                  <div>
                    <label className="fm-label">Default Market Mode</label>
                    <select className="fm-input">
                      {MARKET_MODES.map(m => <option key={m} value={m}>{MARKET_MODE_LABELS[m]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="fm-label">Default Results Per Page</label>
                    <select className="fm-input">
                      {[10, 25, 50, 100].map(n => <option key={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-slate-800/30 rounded-lg">
                  <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500">Settings persistence will be implemented in Phase 2. Changes here are for demonstration only.</p>
                </div>
              </div>

              <div className="fm-card p-5 space-y-3">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-teal-400" />Display Preferences
                </h2>
                <div className="space-y-2">
                  {[
                    { label: 'Show DEMO badge on demo records', defaultChecked: true },
                    { label: 'Show data classification badges on claims', defaultChecked: true },
                    { label: 'Collapse sidebar by default', defaultChecked: false },
                    { label: 'Show AI Assistant button in top nav', defaultChecked: true },
                  ].map(p => (
                    <label key={p.label} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input type="checkbox" defaultChecked={p.defaultChecked} className="rounded" />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'tags' && <TagManager />}

          {activeSection === 'data' && (
            <div className="space-y-4">
              <div className="fm-card p-5 space-y-4">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Database className="w-4 h-4 text-teal-400" />Scoring Model Configuration
                </h2>
                <p className="text-xs text-slate-400">Each market mode uses a 100-point scoring model. Dimension weights are calibrated for each mode.</p>
                <div className="space-y-2">
                  {[
                    { mode: 'Commercial', dims: 'Revenue Potential · Strategic Fit · Access & Timing · Risk · Relationship' },
                    { mode: 'Government', dims: 'Contract Fit · Agency Alignment · Access · Competitive Position · Compliance' },
                    { mode: 'Private Client', dims: 'Property Fit · Problem Urgency · Budget · Access · Relationship' },
                    { mode: 'Partner', dims: 'Capability Fit · Market Access · Strategic Alignment · Validation Value · Relationship' },
                    { mode: 'Stakeholder', dims: 'Influence · Authority · Alignment · Network · Engagement' },
                  ].map(m => (
                    <div key={m.mode} className="bg-slate-800/20 border border-slate-700/20 rounded-lg p-3">
                      <div className="text-xs font-medium text-slate-200 mb-1">{m.mode}</div>
                      <div className="text-[10px] text-slate-500">{m.dims}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 p-3 bg-slate-800/30 rounded-lg">
                  <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500">Custom weight adjustment will be available in Phase 2. Recalculate individual scores from any Target Profile.</p>
                </div>
              </div>

              <div className="fm-card p-5 space-y-3">
                <h2 className="text-sm font-semibold text-slate-200">Data Classification Rules</h2>
                <div className="space-y-2">
                  {[
                    { cls: 'Verified', color: 'bg-emerald-500/20 text-emerald-300', rule: 'Confirmed by independent primary source. Cannot be overwritten by inferred or simulated data.' },
                    { cls: 'Sourced', color: 'bg-teal-500/20 text-teal-300', rule: 'Derived from a traceable secondary source. Protected from simulated overwrites.' },
                    { cls: 'User Provided', color: 'bg-blue-500/20 text-blue-300', rule: 'Entered directly by the user. Takes priority over inferred data.' },
                    { cls: 'Inferred', color: 'bg-amber-500/20 text-amber-300', rule: 'Derived by AI from available context. Always labeled. Can be overwritten by higher-confidence data.' },
                    { cls: 'Simulated', color: 'bg-purple-500/20 text-purple-300', rule: 'Generated for demo workflow demonstration. Never treated as factual.' },
                    { cls: 'Unknown', color: 'bg-slate-500/20 text-slate-400', rule: 'No source or classification available. Lowest priority.' },
                  ].map(r => (
                    <div key={r.cls} className="flex items-start gap-3 text-xs">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 mt-0.5', r.color)}>{r.cls}</span>
                      <span className="text-slate-500">{r.rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'compliance' && (
            <div className="space-y-4">
              <div className="fm-card p-5 space-y-4">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-teal-400" />Compliance Notices by Market Mode
                </h2>
                <div className="space-y-3">
                  {[
                    { mode: 'Commercial', regs: 'CAN-SPAM Act · TCPA · Do-Not-Call Registry · GDPR (EU contacts) · CCPA (CA contacts)', color: 'text-blue-400' },
                    { mode: 'Government', regs: 'FAR Procurement Integrity Rules · Lobbyist Disclosure Act · 18 U.S.C. § 207 (Revolving Door) · ITAR/EAR (defense)', color: 'text-indigo-400' },
                    { mode: 'Private Client', regs: 'CAN-SPAM · TCPA · Do-Not-Call Registry · State Agricultural Solicitation Rules · Privacy Laws', color: 'text-emerald-400' },
                    { mode: 'Partner', regs: 'Teaming Agreement Disclosure · OCI Rules · Exclusive Dealing Laws · Joint Venture Reporting', color: 'text-purple-400' },
                    { mode: 'Stakeholder', regs: 'Lobbying Disclosure Act · FARA (foreign principals) · State Lobby Registration · Ethics Reporting', color: 'text-amber-400' },
                  ].map(c => (
                    <div key={c.mode} className="bg-slate-800/20 border border-slate-700/20 rounded-lg p-3">
                      <div className={cn('text-xs font-semibold mb-1', c.color)}>{c.mode}</div>
                      <div className="text-[10px] text-slate-500">{c.regs}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-red-950/20 border border-red-800/30 rounded-lg p-3 flex items-start gap-2">
                  <Shield className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-400/80">
                    ForgeMark AI provides compliance guidance for workflow awareness only. It is not legal advice. Consult qualified legal counsel for compliance decisions specific to your organization.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
