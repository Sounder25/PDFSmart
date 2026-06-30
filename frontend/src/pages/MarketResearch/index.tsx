import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { MARKET_MODE_LABELS } from '@/lib/utils'
import type { MarketMode } from '@/types'
import { MarketModeBadge } from '@/components/shared/MarketModeIcon'
import { DemoBanner } from '@/components/shared/DemoDataBanner'
import { ComplianceNotice } from '@/components/shared/ComplianceNotice'
import { PageSpinner } from '@/components/ui/Spinner'
import { ResearchResults } from './ResearchResults'
import { CommercialForm } from './CommercialForm'
import { GovernmentForm } from './GovernmentForm'
import { PrivateClientForm } from './PrivateClientForm'
import { PartnerForm } from './PartnerForm'
import { StakeholderForm } from './StakeholderForm'
import {
  Search, Save, Trash2, Copy, ChevronDown, RotateCcw, BookOpen, Radio, Import
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Modal } from '@/components/ui/Modal'
import { EcosystemSignalForm, RESEARCH_TYPE_LABELS } from './EcosystemSignalForm'
import type { ResearchType } from '@/types'

const MODES: MarketMode[] = ['commercial', 'government', 'private_client', 'partner', 'stakeholder']
const RESEARCH_TYPES: ResearchType[] = [
  'target_discovery', 'ecosystem_signal', 'county_development',
  'state_agency_development', 'funding_opportunity', 'contract_opportunity',
  'speaking_opportunity', 'industry_partner_opportunity'
]

const URGENCY_COLORS: Record<string, string> = {
  immediate: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-slate-400',
}

export function MarketResearch() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<MarketMode>('commercial')
  const [researchType, setResearchType] = useState<ResearchType>('target_discovery')
  const [criteria, setCriteria] = useState<Record<string, unknown>>({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<any[]>([])
  const [disclaimer, setDisclaimer] = useState('')
  const [searching, setSearching] = useState(false)
  const [stage, setStage] = useState('')
  const [saveModal, setSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [renameModal, setRenameModal] = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')
  const [importingSignals, setImportingSignals] = useState(false)

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['research-profiles', mode],
    queryFn: () => api.research.profiles.list(mode),
  })

  // Load draft on mount
  useEffect(() => {
    api.research.draft.get().then(draft => {
      if (draft) {
        setMode(draft.market_mode as MarketMode)
        setCriteria(draft.criteria || {})
      }
    }).catch(() => {})
  }, [])

  // Save draft on criteria change
  useEffect(() => {
    const timer = setTimeout(() => {
      api.research.draft.save(mode, criteria).catch(() => {})
    }, 1000)
    return () => clearTimeout(timer)
  }, [mode, criteria])

  const saveProfile = useMutation({
    mutationFn: () => api.research.profiles.create({ name: saveName, market_mode: mode, criteria }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['research-profiles', mode] })
      setSaveModal(false)
      setSaveName('')
      toast.success('Research profile saved')
    },
    onError: () => toast.error('Failed to save profile'),
  })

  const deleteProfile = useMutation({
    mutationFn: (id: string) => api.research.profiles.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['research-profiles', mode] })
      toast.success('Profile deleted')
    },
  })

  const renameProfile = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.research.profiles.update(id, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['research-profiles', mode] })
      setRenameModal(null)
      toast.success('Profile renamed')
    },
  })

  const STAGES = [
    'Parsing research criteria…',
    'Identifying candidate targets…',
    'Comparing candidates to qualification criteria…',
    'Structuring available information…',
    'Identifying missing information…',
    'Calculating preliminary scores…',
    'Preparing results…',
  ]

  const runResearch = async () => {
    setResults([])
    setSearching(true)
    const isSignal = researchType === 'ecosystem_signal'
    const signalStages = [
      'Scanning USDA and federal agency feeds…',
      'Checking drought monitor and weather alerts…',
      'Reviewing NRCS and FSA program announcements…',
      'Filtering by geography and commodity…',
      'Assessing funding and contract implications…',
      'Prioritizing by urgency and severity…',
      'Preparing signal results…',
    ]
    for (const s of (isSignal ? signalStages : STAGES)) {
      setStage(s)
      await new Promise(r => setTimeout(r, 600))
    }
    try {
      const resp = await api.research.run(
        isSignalMode ? 'commercial' : mode, criteria, (criteria.desired_count as number) || 5, researchType
      )
      setResults(resp.results)
      setDisclaimer(resp.disclaimer)
      toast.success(`${resp.results.length} demo ${isSignal ? 'signals' : 'targets'} generated`)
    } catch {
      toast.error('Research failed. Check backend connection.')
    }
    setSearching(false)
    setStage('')
  }

  const importSignals = async () => {
    if (!results.length) return
    setImportingSignals(true)
    let imported = 0
    for (const sig of results) {
      try {
        await api.signals.create({ ...sig as object, is_demo: true })
        imported++
      } catch { /* skip dupes */ }
    }
    toast.success(`${imported} signal${imported !== 1 ? 's' : ''} saved`)
    qc.invalidateQueries({ queryKey: ['signals'] })
    setImportingSignals(false)
    setResults([])
  }

  const updateField = (field: string, value: unknown) => {
    setCriteria(prev => ({ ...prev, [field]: value }))
  }

  const loadProfile = (p: { criteria?: Record<string, unknown> }) => {
    setCriteria(p.criteria || {})
    toast.success('Profile loaded')
  }

  const duplicateProfile = async (p: { name: string; criteria?: Record<string, unknown> }) => {
    try {
      await api.research.profiles.create({ name: `${p.name} (Copy)`, market_mode: mode, criteria: p.criteria || {} })
      qc.invalidateQueries({ queryKey: ['research-profiles', mode] })
      toast.success('Profile duplicated')
    } catch { toast.error('Failed') }
  }

  const clearForm = () => {
    setCriteria({})
    toast.success('Form cleared')
  }

  const formProps = { criteria, onUpdate: updateField }

  const isSignalMode = researchType === 'ecosystem_signal'

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Radio className="w-5 h-5 text-teal-400" />
            Market Research & Signals
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Discover targets, monitor agricultural signals, identify funding and contract opportunities</p>
        </div>
      </div>

      {/* Research Type Selector */}
      <div className="mb-4">
        <label className="text-[10px] text-slate-500 uppercase tracking-widest font-medium block mb-2">Research Type</label>
        <div className="fm-card p-1 flex flex-wrap gap-0.5 w-fit">
          {RESEARCH_TYPES.map(rt => (
            <button
              key={rt}
              onClick={() => { setResearchType(rt); setCriteria({}); setResults([]) }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                researchType === rt
                  ? rt === 'ecosystem_signal'
                    ? 'bg-orange-600 text-white'
                    : 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {rt === 'ecosystem_signal' && <Radio className="w-3 h-3 inline mr-1" />}
              {RESEARCH_TYPE_LABELS[rt]}
            </button>
          ))}
        </div>
      </div>

      {/* Market Mode Selector — hidden for ecosystem signal */}
      {!isSignalMode && (
        <div className="fm-card p-1 flex gap-0.5 mb-5 w-fit">
          {MODES.map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setCriteria({}); setResults([]) }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === m
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {MARKET_MODE_LABELS[m]}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Research Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Profile toolbar */}
          <div className="fm-card p-3 flex items-center gap-2 flex-wrap">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="btn-secondary text-xs py-1.5 px-3">
                  <BookOpen className="w-3 h-3" />
                  Load Profile
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="min-w-52 bg-[#1e293b] border border-[#334155] rounded-lg shadow-2xl p-1 z-50">
                  {profiles.length === 0
                    ? <div className="px-3 py-2 text-xs text-slate-500">No saved profiles for {MARKET_MODE_LABELS[mode]}</div>
                    : profiles.map(p => (
                      <div key={p.id} className="flex items-center group">
                        <DropdownMenu.Item
                          className="flex-1 px-3 py-2 text-xs text-slate-300 hover:text-slate-100 hover:bg-white/5 rounded-md cursor-pointer outline-none"
                          onSelect={() => loadProfile(p)}
                        >
                          {p.name}{p.is_default ? ' ★' : ''}
                        </DropdownMenu.Item>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 pr-2">
                          <button onClick={() => duplicateProfile(p)} className="btn-ghost p-1" title="Duplicate"><Copy className="w-3 h-3" /></button>
                          <button onClick={() => { setRenameModal(p.id); setRenameName(p.name) }} className="btn-ghost p-1" title="Rename"><BookOpen className="w-3 h-3" /></button>
                          <button onClick={() => deleteProfile.mutate(p.id)} className="btn-ghost p-1 text-red-400" title="Delete"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))
                  }
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <button className="btn-secondary text-xs py-1.5 px-3" onClick={() => setSaveModal(true)}>
              <Save className="w-3 h-3" />
              Save Profile
            </button>
            <button className="btn-ghost text-xs py-1.5 px-3 text-slate-500" onClick={clearForm}>
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
            <div className="ml-auto">
              <MarketModeBadge mode={mode} />
            </div>
          </div>

          {/* Criteria Summary */}
          {Object.keys(criteria).filter(k => criteria[k] && criteria[k] !== '' && !(Array.isArray(criteria[k]) && (criteria[k] as unknown[]).length === 0)).length > 0 && (
            <div className="bg-teal-950/30 border border-teal-800/30 rounded-md px-3 py-2">
              <p className="text-[10px] text-teal-400 font-medium mb-1">Research Criteria Summary</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(criteria)
                  .filter(([, v]) => v && v !== '' && !(Array.isArray(v) && (v as unknown[]).length === 0))
                  .map(([k, v]) => (
                    <span key={k} className="text-[10px] bg-teal-900/30 text-teal-300 border border-teal-700/30 px-2 py-0.5 rounded">
                      {k.replace(/_/g, ' ')}: {Array.isArray(v) ? (v as string[]).join(', ') : String(v)}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Form */}
          <div className="fm-card p-5">
            {isSignalMode
              ? <EcosystemSignalForm {...formProps} />
              : <>
                  {mode === 'commercial' && <CommercialForm {...formProps} />}
                  {mode === 'government' && <GovernmentForm {...formProps} />}
                  {mode === 'private_client' && <PrivateClientForm {...formProps} />}
                  {mode === 'partner' && <PartnerForm {...formProps} />}
                  {mode === 'stakeholder' && <StakeholderForm {...formProps} />}
                </>
            }
          </div>

          {/* Run button */}
          <div className="flex justify-end gap-3">
            <button
              className={`btn-primary text-sm px-6 py-2.5 ${isSignalMode ? 'bg-orange-600 hover:bg-orange-700 border-orange-600' : ''}`}
              onClick={runResearch}
              disabled={searching}
            >
              {searching ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{stage}</>
              ) : isSignalMode ? (
                <><Radio className="w-4 h-4" />Scan for Signals</>
              ) : (
                <><Search className="w-4 h-4" />Run Demo Research</>
              )}
            </button>
          </div>

          {/* Signal Results */}
          {isSignalMode && results.length > 0 && (
            <div className="fm-card p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-200">Signal Results ({results.length})</h3>
                <button
                  className="btn-primary text-xs py-1.5 px-3"
                  onClick={importSignals}
                  disabled={importingSignals}
                >
                  <Import className="w-3 h-3" />
                  {importingSignals ? 'Saving…' : 'Save All Signals'}
                </button>
              </div>
              <p className="text-[10px] text-amber-400/80 bg-amber-900/10 border border-amber-700/20 rounded px-2 py-1">{disclaimer}</p>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {results.map((sig: any, i: number) => (
                <div key={i} className="border border-[#334155] rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      sig.urgency === 'immediate' ? 'text-red-400 bg-red-900/20 border-red-700/30' :
                      sig.urgency === 'high' ? 'text-orange-400 bg-orange-900/20 border-orange-700/30' :
                      sig.urgency === 'medium' ? 'text-yellow-400 bg-yellow-900/20 border-yellow-700/30' :
                      'text-slate-400 bg-slate-800/40 border-slate-700/30'
                    }`}>{(sig.urgency || 'medium').toUpperCase()}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-[#334155] text-slate-400 capitalize">{(sig.signal_type || '').replace(/_/g, ' ')}</span>
                    {sig.state && <span className="text-[10px] px-2 py-0.5 rounded border border-[#334155] text-blue-400">{sig.state}</span>}
                  </div>
                  <p className="text-sm font-medium text-slate-200">{sig.topic}</p>
                  {sig.funding_implication && <p className="text-xs text-green-400/80"><span className="font-medium">Funding:</span> {sig.funding_implication}</p>}
                  {sig.contract_implication && <p className="text-xs text-blue-400/80"><span className="font-medium">Contract:</span> {sig.contract_implication}</p>}
                  {sig.marketing_implication && <p className="text-xs text-purple-400/80"><span className="font-medium">Marketing:</span> {sig.marketing_implication}</p>}
                  {sig.operational_implication && <p className="text-xs text-slate-400"><span className="font-medium">Operational:</span> {sig.operational_implication}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Target Results (non-signal) */}
          {!isSignalMode && results.length > 0 && (
            <ResearchResults results={results} disclaimer={disclaimer} marketMode={mode} />
          )}
        </div>

        {/* Right: Compliance + sidebar */}
        <div className="space-y-4">
          <DemoBanner />
          <ComplianceNotice marketMode={mode} />
        </div>
      </div>

      {/* Save Profile Modal */}
      <Modal open={saveModal} onClose={() => setSaveModal(false)} title="Save Research Profile" size="sm">
        <div className="space-y-3">
          <div>
            <label className="fm-label">Profile Name</label>
            <input className="fm-input" value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="e.g. Midwest Manufacturing Q3" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary" onClick={() => setSaveModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={() => saveProfile.mutate()} disabled={!saveName.trim()}>Save Profile</button>
          </div>
        </div>
      </Modal>

      {/* Rename Modal */}
      <Modal open={!!renameModal} onClose={() => setRenameModal(null)} title="Rename Profile" size="sm">
        <div className="space-y-3">
          <input className="fm-input" value={renameName} onChange={e => setRenameName(e.target.value)} />
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary" onClick={() => setRenameModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={() => renameProfile.mutate({ id: renameModal!, name: renameName })} disabled={!renameName.trim()}>Rename</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
