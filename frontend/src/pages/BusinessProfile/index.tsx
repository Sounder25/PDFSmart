import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { BusinessDocument, DocumentExtraction } from '@/types'
import {
  FileUp, FileText, CheckCircle, XCircle, Clock, Trash2,
  ChevronDown, ChevronRight, Building2, AlertTriangle, Plus
} from 'lucide-react'

const CLASSIFICATION_COLORS: Record<string, string> = {
  'Current Capability': 'text-green-400 bg-green-900/20 border-green-700/30',
  'Pilot Ready': 'text-teal-400 bg-teal-900/20 border-teal-700/30',
  'Verified': 'text-blue-400 bg-blue-900/20 border-blue-700/30',
  'Performance Target': 'text-yellow-400 bg-yellow-900/20 border-yellow-700/30',
  'Planned Capability': 'text-orange-400 bg-orange-900/20 border-orange-700/30',
  'Marketing Claim': 'text-purple-400 bg-purple-900/20 border-purple-700/30',
  'Requires Verification': 'text-red-400 bg-red-900/20 border-red-700/30',
  'Restricted Claim': 'text-red-500 bg-red-900/30 border-red-600/40',
  'default': 'text-slate-400 bg-slate-800/40 border-slate-700/30',
}

function classColor(cls: string) {
  return CLASSIFICATION_COLORS[cls] || CLASSIFICATION_COLORS['default']
}

export function BusinessProfile() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'review'>('documents')
  const [selectedDoc, setSelectedDoc] = useState<BusinessDocument | null>(null)
  const [expandedExtractions, setExpandedExtractions] = useState<Set<string>>(new Set())
  const [addExtractionDoc, setAddExtractionDoc] = useState<string | null>(null)
  const [newExtraction, setNewExtraction] = useState({ extracted_text: '', classification: 'Unknown', readiness_status: 'Unknown', profile_field: '', source_page: '', source_section: '' })

  const { data: profile } = useQuery({ queryKey: ['business-profile'], queryFn: () => api.business.profile.get() })
  const { data: docs = [] } = useQuery({ queryKey: ['business-documents'], queryFn: () => api.business.documents.list() })
  const { data: pending = [] } = useQuery({ queryKey: ['extractions-pending'], queryFn: () => api.business.extractions.pending() })
  const { data: docExtractions = [] } = useQuery({
    queryKey: ['doc-extractions', selectedDoc?.id],
    queryFn: () => selectedDoc ? api.business.extractions.list(selectedDoc.id) : Promise.resolve([]),
    enabled: !!selectedDoc,
  })
  const { data: classifications } = useQuery({ queryKey: ['biz-classifications'], queryFn: () => api.business.meta.classifications() })
  const { data: readinessStatuses } = useQuery({ queryKey: ['biz-readiness'], queryFn: () => api.business.meta.readinessStatuses() })
  const { data: profileFields } = useQuery({ queryKey: ['biz-profile-fields'], queryFn: () => api.business.meta.profileFields() })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = async () => {
          try {
            const b64 = (reader.result as string).split(',')[1]
            await api.business.documents.upload({
              original_name: file.name,
              file_type: file.type,
              file_size: file.size,
              content_base64: b64,
            })
            resolve()
          } catch (e) { reject(e) }
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-documents'] })
      toast.success('Document uploaded')
    },
    onError: () => toast.error('Upload failed'),
  })

  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => api.business.documents.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-documents'] })
      if (selectedDoc) setSelectedDoc(null)
      toast.success('Document deleted')
    },
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approved' | 'rejected' }) =>
      api.business.extractions.update(id, { approval_status: action }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['extractions-pending'] })
      qc.invalidateQueries({ queryKey: ['doc-extractions', selectedDoc?.id] })
      toast.success(vars.action === 'approved' ? 'Claim approved' : 'Claim rejected')
    },
  })

  const bulkApproveMutation = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: 'approved' | 'rejected' }) =>
      api.business.extractions.bulkApprove(ids, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['extractions-pending'] })
      toast.success('Bulk action applied')
    },
  })

  const addExtractionMutation = useMutation({
    mutationFn: (docId: string) => api.business.extractions.create(docId, {
      ...newExtraction,
      extraction_type: 'claim',
    } as Partial<DocumentExtraction>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doc-extractions', addExtractionDoc] })
      qc.invalidateQueries({ queryKey: ['extractions-pending'] })
      setAddExtractionDoc(null)
      setNewExtraction({ extracted_text: '', classification: 'Unknown', readiness_status: 'Unknown', profile_field: '', source_page: '', source_section: '' })
      toast.success('Extraction added')
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadMutation.mutate(file)
    e.target.value = ''
  }

  const toggleExtraction = (id: string) => {
    setExpandedExtractions(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const pendingIds = pending.map(p => p.id)

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-400" />
            Business & Capability Profile
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Upload company documents, review extracted claims, build your verified business profile</p>
        </div>
        <div className="flex gap-2">
          {pending.length > 0 && (
            <span className="text-xs bg-amber-600/20 text-amber-400 border border-amber-600/30 px-2 py-1 rounded-full">
              {pending.length} pending review
            </span>
          )}
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange}
            accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.txt,.md,.csv" />
          <button className="btn-primary text-xs" onClick={() => fileRef.current?.click()} disabled={uploadMutation.isPending}>
            <FileUp className="w-3.5 h-3.5" />
            {uploadMutation.isPending ? 'Uploading…' : 'Upload Document'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-[#243044]">
        {(['documents', 'review', 'profile'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab === 'documents' && `Documents (${docs.length})`}
            {tab === 'review' && (
              <span className="flex items-center gap-1.5">
                Review Queue
                {pending.length > 0 && <span className="w-4 h-4 bg-amber-600 text-white rounded-full text-[10px] flex items-center justify-center">{pending.length}</span>}
              </span>
            )}
            {tab === 'profile' && 'Business Profile'}
          </button>
        ))}
      </div>

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Document List */}
          <div className="lg:col-span-1 space-y-2">
            {docs.length === 0 && (
              <div className="fm-card p-8 text-center">
                <FileUp className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No documents uploaded yet</p>
                <p className="text-xs text-slate-600 mt-1">Upload investor decks, capability statements, SOPs, and more</p>
              </div>
            )}
            {docs.map(doc => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`fm-card p-3 cursor-pointer transition-colors ${selectedDoc?.id === doc.id ? 'border-teal-500/50 bg-teal-900/5' : 'hover:border-[#334155]'}`}
              >
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{doc.original_name}</p>
                    <p className="text-[10px] text-slate-500">{doc.file_type} · {doc.file_size ? `${Math.round(doc.file_size / 1024)}KB` : 'Unknown size'}</p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 inline-block ${
                      doc.extraction_status === 'reviewed' ? 'text-green-400 bg-green-900/20' :
                      doc.extraction_status === 'extracted' ? 'text-blue-400 bg-blue-900/20' :
                      'text-slate-500 bg-slate-800/40'
                    }`}>{doc.extraction_status}</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteDocMutation.mutate(doc.id) }}
                    className="btn-ghost p-1 text-red-400/50 hover:text-red-400 shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Extraction Detail */}
          <div className="lg:col-span-2">
            {!selectedDoc ? (
              <div className="fm-card p-8 text-center">
                <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Select a document to view extractions</p>
              </div>
            ) : (
              <div className="fm-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200">{selectedDoc.original_name}</h3>
                  <button
                    className="btn-secondary text-xs py-1 px-2.5"
                    onClick={() => setAddExtractionDoc(selectedDoc.id)}
                  >
                    <Plus className="w-3 h-3" />
                    Add Extraction
                  </button>
                </div>

                {docExtractions.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-xs text-slate-500">No extractions yet. Add claims extracted from this document.</p>
                  </div>
                )}

                {docExtractions.map(ext => (
                  <div key={ext.id} className={`border rounded-lg overflow-hidden ${
                    ext.approval_status === 'approved' ? 'border-green-700/30' :
                    ext.approval_status === 'rejected' ? 'border-red-700/30 opacity-60' :
                    'border-[#334155]'
                  }`}>
                    <div
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/2"
                      onClick={() => toggleExtraction(ext.id)}
                    >
                      {expandedExtractions.has(ext.id) ? <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${classColor(ext.classification)}`}>{ext.classification}</span>
                      <p className="text-xs text-slate-300 truncate flex-1">{ext.extracted_text}</p>
                      {ext.approval_status === 'approved' && <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />}
                      {ext.approval_status === 'rejected' && <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                      {ext.approval_status === 'pending' && (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={e => { e.stopPropagation(); approveMutation.mutate({ id: ext.id, action: 'approved' }) }} className="btn-ghost p-1 text-green-400" title="Approve"><CheckCircle className="w-3 h-3" /></button>
                          <button onClick={e => { e.stopPropagation(); approveMutation.mutate({ id: ext.id, action: 'rejected' }) }} className="btn-ghost p-1 text-red-400" title="Reject"><XCircle className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                    {expandedExtractions.has(ext.id) && (
                      <div className="px-3 pb-3 space-y-2 border-t border-[#243044] pt-2">
                        <p className="text-xs text-slate-400">{ext.extracted_text}</p>
                        <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
                          {ext.source_page && <span>Page: {ext.source_page}</span>}
                          {ext.source_section && <span>Section: {ext.source_section}</span>}
                          <span>Readiness: <span className="text-slate-300">{ext.readiness_status}</span></span>
                          {ext.profile_field && <span>Profile Field: <span className="text-teal-400">{ext.profile_field}</span></span>}
                          {ext.marketing_approval ? <span className="text-green-400">Marketing Approved</span> : <span className="text-amber-400">Marketing: Conditional</span>}
                        </div>
                        {ext.allowed_channels.length > 0 && (
                          <div className="text-[10px]">
                            <span className="text-slate-500">Allowed channels: </span>
                            <span className="text-green-400">{ext.allowed_channels.join(', ')}</span>
                          </div>
                        )}
                        {ext.prohibited_contexts.length > 0 && (
                          <div className="text-[10px]">
                            <span className="text-slate-500">Prohibited: </span>
                            <span className="text-red-400">{ext.prohibited_contexts.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Extraction Form */}
                {addExtractionDoc === selectedDoc.id && (
                  <div className="border border-teal-600/30 rounded-lg p-3 space-y-3 bg-teal-900/5">
                    <h4 className="text-xs font-semibold text-teal-400">Add Extracted Claim</h4>
                    <textarea
                      className="fm-input text-xs"
                      rows={3}
                      placeholder="Enter the extracted text / claim from this document…"
                      value={newExtraction.extracted_text}
                      onChange={e => setNewExtraction(prev => ({ ...prev, extracted_text: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="fm-label text-[10px]">Classification</label>
                        <select className="fm-input text-xs" value={newExtraction.classification} onChange={e => setNewExtraction(prev => ({ ...prev, classification: e.target.value }))}>
                          {(classifications?.classifications || []).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="fm-label text-[10px]">Readiness Status</label>
                        <select className="fm-input text-xs" value={newExtraction.readiness_status} onChange={e => setNewExtraction(prev => ({ ...prev, readiness_status: e.target.value }))}>
                          {(readinessStatuses?.readiness_statuses || []).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="fm-label text-[10px]">Profile Field</label>
                        <select className="fm-input text-xs" value={newExtraction.profile_field} onChange={e => setNewExtraction(prev => ({ ...prev, profile_field: e.target.value }))}>
                          <option value="">-- None --</option>
                          {(profileFields?.profile_fields || []).map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="fm-label text-[10px]">Source Page</label>
                        <input className="fm-input text-xs" placeholder="e.g. 3, 12-14" value={newExtraction.source_page} onChange={e => setNewExtraction(prev => ({ ...prev, source_page: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button className="btn-secondary text-xs" onClick={() => setAddExtractionDoc(null)}>Cancel</button>
                      <button className="btn-primary text-xs" onClick={() => addExtractionMutation.mutate(addExtractionDoc)} disabled={!newExtraction.extracted_text.trim() || addExtractionMutation.isPending}>
                        {addExtractionMutation.isPending ? 'Adding…' : 'Add Claim'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Queue Tab */}
      {activeTab === 'review' && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="fm-card p-8 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Review queue is clear</p>
              <p className="text-xs text-slate-600 mt-1">All extracted claims have been reviewed</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-sm text-slate-400">{pending.length} claims pending your review</p>
                <button
                  className="btn-secondary text-xs py-1 px-2.5 text-green-400 border-green-700/30"
                  onClick={() => bulkApproveMutation.mutate({ ids: pendingIds, action: 'approved' })}
                  disabled={bulkApproveMutation.isPending}
                >
                  <CheckCircle className="w-3 h-3" />
                  Approve All
                </button>
                <button
                  className="btn-secondary text-xs py-1 px-2.5 text-red-400 border-red-700/30"
                  onClick={() => bulkApproveMutation.mutate({ ids: pendingIds, action: 'rejected' })}
                  disabled={bulkApproveMutation.isPending}
                >
                  <XCircle className="w-3 h-3" />
                  Reject All
                </button>
              </div>

              {pending.map(ext => (
                <div key={ext.id} className="fm-card p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${classColor(ext.classification)}`}>{ext.classification}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-800/40 border border-slate-700/30 px-1.5 py-0.5 rounded">{ext.readiness_status}</span>
                        {ext.document_name && <span className="text-[10px] text-slate-600">from: {ext.document_name}</span>}
                        {ext.profile_field && <span className="text-[10px] text-teal-400">→ {ext.profile_field}</span>}
                      </div>
                      <p className="text-sm text-slate-200">{ext.extracted_text}</p>
                      {ext.source_page && <p className="text-[10px] text-slate-500 mt-1">Page {ext.source_page}{ext.source_section ? ` · ${ext.source_section}` : ''}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        className="btn-secondary text-xs py-1 px-3 text-green-400 border-green-700/30 hover:bg-green-900/20"
                        onClick={() => approveMutation.mutate({ id: ext.id, action: 'approved' })}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3" />
                        Approve
                      </button>
                      <button
                        className="btn-secondary text-xs py-1 px-3 text-red-400 border-red-700/30 hover:bg-red-900/20"
                        onClick={() => approveMutation.mutate({ id: ext.id, action: 'rejected' })}
                        disabled={approveMutation.isPending}
                      >
                        <XCircle className="w-3 h-3" />
                        Reject
                      </button>
                    </div>
                  </div>
                  {(ext.allowed_channels.length > 0 || ext.prohibited_contexts.length > 0) && (
                    <div className="text-[10px] border-t border-[#243044] pt-2 flex gap-4">
                      {ext.allowed_channels.length > 0 && <span><span className="text-slate-500">Allowed: </span><span className="text-green-400">{ext.allowed_channels.join(', ')}</span></span>}
                      {ext.prohibited_contexts.length > 0 && <span><span className="text-slate-500">Prohibited: </span><span className="text-red-400">{ext.prohibited_contexts.join(', ')}</span></span>}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          {!profile ? (
            <div className="fm-card p-8 text-center">
              <Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Business profile not yet created</p>
            </div>
          ) : (
            <ProfileView profile={profile} onUpdate={(data) => {
              api.business.profile.update(data).then(() => {
                qc.invalidateQueries({ queryKey: ['business-profile'] })
                toast.success('Profile updated')
              }).catch(() => toast.error('Update failed'))
            }} />
          )}
        </div>
      )}
    </div>
  )
}

function ProfileView({ profile, onUpdate }: { profile: ReturnType<typeof api.business.profile.get> extends Promise<infer T> ? T : never; onUpdate: (data: object) => void }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [editVal, setEditVal] = useState<string | string[]>('')

  const startEdit = (field: string, val: string | string[]) => {
    setEditing(field)
    setEditVal(val)
  }

  const saveField = (field: string) => {
    onUpdate({ [field]: editVal })
    setEditing(null)
  }

  const sections = [
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'mission', label: 'Mission Statement', type: 'text' },
    { key: 'products', label: 'Products', type: 'list' },
    { key: 'services', label: 'Services', type: 'list' },
    { key: 'capabilities', label: 'Capabilities', type: 'list' },
    { key: 'target_customers', label: 'Target Customers', type: 'list' },
    { key: 'target_industries', label: 'Target Industries', type: 'list' },
    { key: 'geographic_markets', label: 'Geographic Markets', type: 'list' },
    { key: 'differentiators', label: 'Differentiators', type: 'list' },
    { key: 'proof_points', label: 'Proof Points', type: 'list' },
    { key: 'pricing_notes', label: 'Pricing Notes', type: 'text' },
    { key: 'procurement_readiness', label: 'Procurement Readiness', type: 'text' },
    { key: 'funding_readiness', label: 'Funding Readiness', type: 'text' },
    { key: 'approved_claims', label: 'Approved Claims', type: 'list' },
    { key: 'restricted_claims', label: 'Restricted Claims', type: 'list' },
    { key: 'calls_to_action', label: 'Calls to Action', type: 'list' },
  ] as const

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {sections.map(sec => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawVal = (profile as any)[sec.key]
        const isEmpty = !rawVal || (Array.isArray(rawVal) && rawVal.length === 0)

        return (
          <div key={sec.key} className="fm-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-300">{sec.label}</h4>
              <button onClick={() => startEdit(sec.key, rawVal || (sec.type === 'list' ? [] : ''))} className="btn-ghost p-1 text-xs text-slate-500">Edit</button>
            </div>

            {editing === sec.key ? (
              <div className="space-y-2">
                {sec.type === 'list' ? (
                  <textarea
                    className="fm-input text-xs"
                    rows={4}
                    value={Array.isArray(editVal) ? (editVal as string[]).join('\n') : editVal}
                    onChange={e => setEditVal(e.target.value.split('\n').filter(Boolean))}
                    placeholder="One item per line"
                  />
                ) : (
                  <textarea className="fm-input text-xs" rows={3} value={editVal as string} onChange={e => setEditVal(e.target.value)} />
                )}
                <div className="flex gap-2">
                  <button className="btn-primary text-xs py-1" onClick={() => saveField(sec.key)}>Save</button>
                  <button className="btn-secondary text-xs py-1" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </div>
            ) : isEmpty ? (
              <p className="text-xs text-slate-600 italic">Not set</p>
            ) : sec.type === 'list' ? (
              <ul className="space-y-1">
                {(rawVal as string[]).map((item, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                    <span className="text-teal-500 mt-0.5">·</span>{item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">{rawVal as string}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
