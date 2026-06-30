import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import {
  Megaphone, Plus, Trash2, Edit2, ArrowRight, Radio,
  MapPin, DollarSign, FileText, Users, Building2, Zap
} from 'lucide-react'

const ORIGIN_TYPES = [
  { value: 'ecosystem_signal', label: 'Ecosystem Signal', icon: Radio },
  { value: 'county_development', label: 'County Development', icon: MapPin },
  { value: 'state_agency_development', label: 'State Agency Development', icon: FileText },
  { value: 'funding_opportunity', label: 'Funding Opportunity', icon: DollarSign },
  { value: 'contract_opportunity', label: 'Contract Opportunity', icon: FileText },
  { value: 'partner_development', label: 'Partner Development', icon: Users },
  { value: 'stakeholder_engagement', label: 'Stakeholder Engagement', icon: Users },
  { value: 'direct', label: 'Direct / Manual', icon: Building2 },
]

const CAMPAIGN_TYPES = [
  'County Awareness', 'State Agency Outreach', 'Funding Partner Email',
  'Procurement Introduction', 'Partner Pitch', 'Stakeholder Briefing',
  'Industry Media Outreach', 'Conference Follow-up', 'General Awareness',
]

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-700/30 text-slate-400 border-slate-600/30',
  active: 'bg-green-900/30 text-green-400 border-green-700/30',
  paused: 'bg-amber-900/30 text-amber-400 border-amber-700/30',
  completed: 'bg-blue-900/30 text-blue-400 border-blue-700/30',
  archived: 'bg-slate-800/30 text-slate-500 border-slate-700/30',
}

interface Campaign {
  id: string
  name: string
  market_mode?: string
  status: string
  description?: string
  origin_type?: string
  campaign_type?: string
  created_at: string
  updated_at: string
}

export function Campaigns() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<Campaign | null>(null)
  const [form, setForm] = useState({
    name: '', description: '', status: 'draft', market_mode: 'commercial',
    origin_type: '', campaign_type: '',
  })

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.targets.list({ limit: 1 }).then(() => fetch('/api/campaigns').then(r => r.ok ? r.json() : [])).catch(() => []) as Promise<Campaign[]>,
  })

  const createMutation = useMutation({
    mutationFn: () => fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      setShowCreate(false)
      setForm({ name: '', description: '', status: 'draft', market_mode: 'commercial', origin_type: '', campaign_type: '' })
      toast.success('Campaign created')
    },
    onError: () => toast.error('Failed to create campaign'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/campaigns/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      if (selected) setSelected(null)
      toast.success('Campaign deleted')
    },
  })

  const OriginIcon = ORIGIN_TYPES.find(o => o.value === selected?.origin_type)?.icon || Zap

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-teal-400" />
            Marketing Activation Campaigns
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Signal-driven and market-development outreach campaigns</p>
        </div>
        <button className="btn-primary text-xs" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" />
          New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Campaign List */}
        <div className="lg:col-span-1 space-y-2">
          {isLoading && (
            <div className="fm-card p-4 text-center text-xs text-slate-500">Loading…</div>
          )}
          {!isLoading && campaigns.length === 0 && (
            <div className="fm-card p-8 text-center">
              <Megaphone className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-medium">No campaigns yet</p>
              <p className="text-xs text-slate-600 mt-1">Create your first marketing activation campaign</p>
              <button className="btn-primary text-xs mt-3" onClick={() => setShowCreate(true)}>
                <Plus className="w-3 h-3" />
                New Campaign
              </button>
            </div>
          )}
          {campaigns.map((c: Campaign) => {
            const OIcon = ORIGIN_TYPES.find(o => o.value === c.origin_type)?.icon || Megaphone
            return (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                className={`fm-card p-3 cursor-pointer transition-colors ${selected?.id === c.id ? 'border-teal-500/50 bg-teal-900/5' : 'hover:border-[#334155]'}`}
              >
                <div className="flex items-start gap-2">
                  <OIcon className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{c.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}>{c.status}</span>
                      {c.campaign_type && <span className="text-[10px] text-slate-500">{c.campaign_type}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Campaign Detail */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="fm-card p-8 text-center space-y-4">
              <Megaphone className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-500">Select a campaign to view details</p>
              <div className="text-left border-t border-[#243044] pt-4 space-y-3">
                <p className="text-xs font-medium text-slate-400">Campaign Types Available:</p>
                <div className="grid grid-cols-2 gap-2">
                  {ORIGIN_TYPES.map(ot => {
                    const Icon = ot.icon
                    return (
                      <div key={ot.value} className="flex items-center gap-2 text-xs text-slate-500">
                        <Icon className="w-3 h-3 text-slate-600" />
                        {ot.label}
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-slate-600 pt-2 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  Generate individual messages from any Target Profile → Message & Marketing Studio
                </p>
              </div>
            </div>
          ) : (
            <div className="fm-card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-teal-900/20 border border-teal-700/30 rounded-lg flex items-center justify-center">
                    <OriginIcon className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-100">{selected.name}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${STATUS_COLORS[selected.status] || STATUS_COLORS.draft}`}>{selected.status}</span>
                      {selected.origin_type && (
                        <span className="text-[10px] text-slate-500">{ORIGIN_TYPES.find(o => o.value === selected.origin_type)?.label || selected.origin_type}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteMutation.mutate(selected.id)} className="btn-ghost p-1.5 text-red-400/50 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {selected.description && (
                <p className="text-sm text-slate-400">{selected.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                {selected.campaign_type && (
                  <div className="bg-[#0f172a] rounded-lg p-3 border border-[#243044]">
                    <p className="text-[10px] text-slate-500 mb-1">Campaign Type</p>
                    <p className="text-xs text-slate-300">{selected.campaign_type}</p>
                  </div>
                )}
                {selected.market_mode && (
                  <div className="bg-[#0f172a] rounded-lg p-3 border border-[#243044]">
                    <p className="text-[10px] text-slate-500 mb-1">Market Mode</p>
                    <p className="text-xs text-slate-300 capitalize">{selected.market_mode.replace('_', ' ')}</p>
                  </div>
                )}
                <div className="bg-[#0f172a] rounded-lg p-3 border border-[#243044]">
                  <p className="text-[10px] text-slate-500 mb-1">Created</p>
                  <p className="text-xs text-slate-300">{formatDate(selected.created_at)}</p>
                </div>
                <div className="bg-[#0f172a] rounded-lg p-3 border border-[#243044]">
                  <p className="text-[10px] text-slate-500 mb-1">Updated</p>
                  <p className="text-xs text-slate-300">{formatDate(selected.updated_at)}</p>
                </div>
              </div>

              <div className="border-t border-[#243044] pt-4">
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3" />
                  Generate messages from Target Profiles to attach to this campaign. Full campaign sequencing coming in a future update.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Marketing Activation Campaign" size="md">
        <div className="space-y-4">
          <div>
            <label className="fm-label">Campaign Name *</label>
            <input className="fm-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. SW Oklahoma Drought Response Outreach" />
          </div>

          <div>
            <label className="fm-label">Description</label>
            <textarea className="fm-input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of campaign goals…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="fm-label">Origin Type</label>
              <select className="fm-input" value={form.origin_type} onChange={e => setForm(p => ({ ...p, origin_type: e.target.value }))}>
                <option value="">-- Select --</option>
                {ORIGIN_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="fm-label">Campaign Type</label>
              <select className="fm-input" value={form.campaign_type} onChange={e => setForm(p => ({ ...p, campaign_type: e.target.value }))}>
                <option value="">-- Select --</option>
                {CAMPAIGN_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="fm-label">Market Mode</label>
              <select className="fm-input" value={form.market_mode} onChange={e => setForm(p => ({ ...p, market_mode: e.target.value }))}>
                <option value="commercial">Commercial</option>
                <option value="government">Government</option>
                <option value="private_client">Private Client</option>
                <option value="partner">Partner</option>
                <option value="stakeholder">Stakeholder</option>
              </select>
            </div>
            <div>
              <label className="fm-label">Status</label>
              <select className="fm-input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary" onClick={() => createMutation.mutate()} disabled={!form.name.trim() || createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create Campaign'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
