import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { PageSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScoreBadge } from '@/components/shared/ScoreBadge'
import { MarketModeBadge } from '@/components/shared/MarketModeIcon'
import { DemoBanner } from '@/components/shared/DemoDataBanner'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import {
  formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS,
  MARKET_MODE_LABELS, ALL_STATUSES, ALL_MARKET_MODES
} from '@/lib/utils'
import {
  Target, Search, Filter, Plus, ChevronUp, ChevronDown,
  Eye, Trash2, Tag, CheckSquare, Square, Download,
  RefreshCw, ChevronLeft, ChevronRight, AlertTriangle, MapPin
} from 'lucide-react'
import type { TargetEntity, MarketMode, TargetStatus } from '@/types'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 25

export function TargetsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [mode, setMode] = useState<MarketMode | ''>(searchParams.get('mode') as MarketMode || '')
  const [status, setStatus] = useState<TargetStatus | ''>(searchParams.get('status') as TargetStatus || '')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteModal, setDeleteModal] = useState(false)
  const [bulkStatusModal, setBulkStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState<TargetStatus>('active')
  const [tagsModal, setTagsModal] = useState(false)
  const [addModal, setAddModal] = useState(false)

  // Sync search param from URL
  useEffect(() => {
    const s = searchParams.get('search')
    const m = searchParams.get('mode')
    if (s) setSearch(s)
    if (m) setMode(m as MarketMode)
  }, [])

  const params: Record<string, string | number> = { page, limit: PAGE_SIZE, sort_by: sortBy, sort_dir: sortDir }
  if (search) params.search = search
  if (mode) params.market_mode = mode
  if (status) params.status = status

  const { data, isLoading } = useQuery({
    queryKey: ['targets', params],
    queryFn: () => api.targets.list(params),
  })

  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => api.tags.list() })

  const deleteMut = useMutation({
    mutationFn: (ids: string[]) => api.targets.bulkDelete(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['targets'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Targets deleted')
      setSelected(new Set())
    },
  })

  const statusMut = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) => api.targets.bulkStatus(ids, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['targets'] })
      toast.success('Status updated')
      setSelected(new Set())
    },
  })

  const exportCsv = async () => {
    const blob = await api.targets.exportCsv()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'forgemark-targets.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const targets = data?.data || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }
  const toggleAll = () => {
    if (selected.size === targets.length) setSelected(new Set())
    else setSelected(new Set(targets.map(t => t.id)))
  }

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'ASC' ? 'DESC' : 'ASC')
    else { setSortBy(col); setSortDir('DESC') }
    setPage(1)
  }

  const SortIcon = ({ col }: { col: string }) => (
    sortBy === col ? (sortDir === 'ASC' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null
  )

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Targets & Opportunities</h1>
          <p className="text-xs text-slate-500 mt-0.5">{total} total records</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={exportCsv}>
            <Download className="w-3.5 h-3.5" />CSV
          </button>
          <button className="btn-primary text-xs" onClick={() => setAddModal(true)}>
            <Plus className="w-3.5 h-3.5" />New Target
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="fm-card p-3 mb-4 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            className="fm-input pl-9 py-1.5"
            placeholder="Search targets…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        <select className="fm-input w-auto py-1.5 text-xs" value={mode} onChange={e => { setMode(e.target.value as MarketMode | ''); setPage(1) }}>
          <option value="">All Modes</option>
          {ALL_MARKET_MODES.map(m => <option key={m} value={m}>{MARKET_MODE_LABELS[m]}</option>)}
        </select>

        <select className="fm-input w-auto py-1.5 text-xs" value={status} onChange={e => { setStatus(e.target.value as TargetStatus | ''); setPage(1) }}>
          <option value="">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>

        {(search || mode || status) && (
          <button className="btn-ghost text-xs text-slate-500" onClick={() => { setSearch(''); setMode(''); setStatus(''); setPage(1) }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="fm-card px-3 py-2 mb-3 flex items-center gap-3 bg-teal-950/20 border-teal-800/40">
          <span className="text-xs text-teal-300">{selected.size} selected</span>
          <button className="btn-secondary text-xs py-1 px-2" onClick={() => setBulkStatusModal(true)}>
            <RefreshCw className="w-3 h-3" />Change Status
          </button>
          <button className="btn-danger text-xs py-1 px-2" onClick={() => setDeleteModal(true)}>
            <Trash2 className="w-3 h-3" />Delete
          </button>
          <button className="btn-ghost text-xs text-slate-500" onClick={() => setSelected(new Set())}>
            Deselect all
          </button>
        </div>
      )}

      {/* Table */}
      <div className="fm-card overflow-hidden">
        {isLoading ? <PageSpinner /> : targets.length === 0 ? (
          <EmptyState icon={Target} title="No targets found"
            description="Run market research to discover and add targets, or adjust your filters."
            action={<button className="btn-primary text-xs" onClick={() => navigate('/research')}>Run Research</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#243044]">
                  <th className="px-3 py-2.5 text-left">
                    <button onClick={toggleAll}>
                      {selected.size === targets.length && selected.size > 0
                        ? <CheckSquare className="w-3.5 h-3.5 text-teal-400" />
                        : <Square className="w-3.5 h-3.5 text-slate-600" />}
                    </button>
                  </th>
                  {[
                    { label: 'Name', col: 'name' },
                    { label: 'Mode', col: 'market_mode' },
                    { label: 'Location', col: null },
                    { label: 'Contact / Role', col: null },
                    { label: 'Score', col: null },
                    { label: 'Status', col: 'status' },
                    { label: 'Value', col: 'estimated_value' },
                    { label: 'Updated', col: 'updated_at' },
                    { label: '', col: null },
                  ].map(({ label, col }) => (
                    <th
                      key={label}
                      className={cn('px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider', col && 'cursor-pointer hover:text-slate-300')}
                      onClick={() => col && handleSort(col)}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        {col && <SortIcon col={col} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {targets.map(t => (
                  <tr key={t.id} className={cn('border-b border-[#1e2d42] hover:bg-white/3 transition-colors', selected.has(t.id) && 'bg-teal-950/10')}>
                    <td className="px-3 py-2.5">
                      <button onClick={() => toggleSelect(t.id)}>
                        {selected.has(t.id)
                          ? <CheckSquare className="w-3.5 h-3.5 text-teal-400" />
                          : <Square className="w-3.5 h-3.5 text-slate-600" />}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 max-w-48">
                      <button className="text-left group" onClick={() => navigate(`/targets/${t.id}`)}>
                        <div className="font-medium text-slate-200 group-hover:text-teal-300 truncate">{t.name}</div>
                        <div className="text-[10px] text-slate-600 truncate">{t.industry || t.entity_type?.replace('_', ' ')}</div>
                      </button>
                      {t.is_demo ? <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-400 bg-amber-950/40 border border-amber-700/30 px-1 py-0.5 rounded"><AlertTriangle className="w-2 h-2" />DEMO</span> : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <MarketModeBadge mode={t.market_mode} showLabel={false} />
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 max-w-28">
                      {t.primary_location ? (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />{t.primary_location}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 max-w-32 truncate">
                      {t.primary_contact_name || t.primary_contact_title || '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <ScoreBadge score={t.score ?? undefined} />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn('px-2 py-0.5 rounded border text-[10px] font-medium', STATUS_COLORS[t.status])}>
                        {STATUS_LABELS[t.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">{formatCurrency(t.estimated_value, true)}</td>
                    <td className="px-3 py-2.5 text-slate-500">{formatDate(t.updated_at, true)}</td>
                    <td className="px-3 py-2.5">
                      <button className="btn-ghost p-1" onClick={() => navigate(`/targets/${t.id}`)} title="View profile">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#243044]">
            <span className="text-xs text-slate-500">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div className="flex items-center gap-1">
              <button className="btn-ghost p-1.5" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs text-slate-400 px-2">Page {page} of {totalPages}</span>
              <button className="btn-ghost p-1.5" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={deleteModal} onClose={() => setDeleteModal(false)}
        title={`Delete ${selected.size} target${selected.size !== 1 ? 's' : ''}?`}
        description="This action cannot be undone. All associated data will also be deleted."
        confirmLabel="Delete" danger
        onConfirm={() => deleteMut.mutate([...selected])}
      />

      <Modal open={bulkStatusModal} onClose={() => setBulkStatusModal(false)} title="Update Status" size="sm">
        <div className="space-y-3">
          <p className="text-xs text-slate-400">Update status for {selected.size} selected target{selected.size !== 1 ? 's' : ''}:</p>
          <select className="fm-input" value={newStatus} onChange={e => setNewStatus(e.target.value as TargetStatus)}>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <div className="flex gap-2 justify-end">
            <button className="btn-secondary" onClick={() => setBulkStatusModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={() => { statusMut.mutate({ ids: [...selected], status: newStatus }); setBulkStatusModal(false) }}>Update</button>
          </div>
        </div>
      </Modal>

      <AddTargetModal open={addModal} onClose={() => setAddModal(false)} onCreated={() => { qc.invalidateQueries({ queryKey: ['targets'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) }} />
    </div>
  )
}

function AddTargetModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ market_mode: 'commercial', entity_type: 'company', name: '', primary_location: '', industry: '', estimated_value: '' })
  const [error, setError] = useState('')
  const [dupeWarning, setDupeWarning] = useState<{ id: string; name: string } | null>(null)
  const [merging, setMerging] = useState(false)

  const resetForm = () => {
    setForm({ market_mode: 'commercial', entity_type: 'company', name: '', primary_location: '', industry: '', estimated_value: '' })
    setDupeWarning(null)
    setError('')
    setMerging(false)
  }

  const buildPayload = (forceCreate = false) => ({
    ...form,
    market_mode: form.market_mode as import('@/types').MarketMode,
    estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined,
    ...(forceCreate ? { force_create: true } : {}),
  })

  const submit = async () => {
    setError('')
    setDupeWarning(null)
    if (!form.name.trim()) { setError('Name is required'); return }
    try {
      await api.targets.create(buildPayload())
      toast.success('Target created')
      onCreated()
      onClose()
      resetForm()
    } catch (e: unknown) {
      const err = e as { data?: { duplicate?: boolean; existing?: { id: string; name: string } }; message?: string }
      if (err.data?.duplicate) {
        setDupeWarning(err.data.existing || null)
      } else {
        setError(err.message || 'Failed to create target')
      }
    }
  }

  const addSeparately = async () => {
    setError('')
    try {
      await api.targets.create(buildPayload(true))
      toast.success('Target created separately')
      onCreated()
      onClose()
      resetForm()
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err.message || 'Failed to create target')
    }
  }

  const mergeIntoExisting = async () => {
    if (!dupeWarning) return
    setMerging(true)
    setError('')
    try {
      const created = (await api.targets.create(buildPayload(true))) as unknown as { id: string }
      await api.targets.merge(dupeWarning.id, created.id)
      toast.success('Research merged into existing target')
      onCreated()
      onClose()
      resetForm()
      navigate(`/targets/${dupeWarning.id}`)
    } catch {
      toast.error('Merge failed')
      setMerging(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Target" size="md">
      {dupeWarning && (
        <div className="mb-3 bg-amber-950/40 border border-amber-700/40 rounded-md p-3">
          <p className="text-xs text-amber-300 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
            Possible duplicate detected: <strong>{dupeWarning.name}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary text-xs py-1" onClick={() => window.open(`/targets/${dupeWarning.id}`, '_blank')}>View Existing</button>
            <button className="btn-primary text-xs py-1" onClick={mergeIntoExisting} disabled={merging}>
              {merging ? 'Merging…' : 'Merge Research'}
            </button>
            <button className="btn-secondary text-xs py-1" onClick={addSeparately}>Add Separately</button>
            <button className="btn-ghost text-xs py-1" onClick={() => setDupeWarning(null)}>Cancel</button>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Merge Research will combine this record's data into the existing target and navigate to it.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div><label className="fm-label">Market Mode *</label>
          <select className="fm-input" value={form.market_mode} onChange={e => setForm(f => ({ ...f, market_mode: e.target.value }))}>
            {ALL_MARKET_MODES.map(m => <option key={m} value={m}>{MARKET_MODE_LABELS[m]}</option>)}
          </select>
        </div>
        <div><label className="fm-label">Entity Type *</label>
          <select className="fm-input" value={form.entity_type} onChange={e => setForm(f => ({ ...f, entity_type: e.target.value }))}>
            {['company','government_agency','government_program','individual','property','nonprofit','university','association','prime_contractor','champion'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div className="col-span-2"><label className="fm-label">Name *</label>
          <input className="fm-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Organization or individual name" />
        </div>
        <div><label className="fm-label">Primary Location</label>
          <input className="fm-input" value={form.primary_location} onChange={e => setForm(f => ({ ...f, primary_location: e.target.value }))} placeholder="City, State" />
        </div>
        <div><label className="fm-label">Industry</label>
          <input className="fm-input" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} placeholder="e.g. Agriculture, Defense" />
        </div>
        <div className="col-span-2"><label className="fm-label">Estimated Value ($)</label>
          <input className="fm-input" type="number" value={form.estimated_value} onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))} placeholder="e.g. 50000" />
        </div>
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      <div className="flex gap-2 justify-end mt-4">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}>Create Target</button>
      </div>
    </Modal>
  )
}
