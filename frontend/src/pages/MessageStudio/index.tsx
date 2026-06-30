import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { cn, formatDateTime } from '@/lib/utils'
import {
  MessageSquare, Plus, Trash2, Send, FileText, Mail, Phone,
  Loader2, AlertTriangle, X, Filter, ChevronDown,
} from 'lucide-react'
import type { Message } from '@/types'

const CHANNELS = ['email', 'phone', 'linkedin', 'letter', 'in_person']
const TONES = ['professional', 'consultative', 'partnership', 'formal', 'casual']
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-700/30 text-slate-400 border-slate-600/30',
  ready: 'bg-teal-900/30 text-teal-400 border-teal-700/30',
  sent: 'bg-emerald-900/30 text-emerald-400 border-emerald-700/30',
  archived: 'bg-slate-800/30 text-slate-500 border-slate-700/30',
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === 'email') return <Mail className="w-3.5 h-3.5" />
  if (channel === 'phone') return <Phone className="w-3.5 h-3.5" />
  if (channel === 'linkedin') return <MessageSquare className="w-3.5 h-3.5" />
  return <FileText className="w-3.5 h-3.5" />
}

export function MessageStudio() {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [filterChannel, setFilterChannel] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const qc = useQueryClient()

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: () => api.messages.list(),
  })

  const deleteMessage = useMutation({
    mutationFn: (id: string) => api.messages.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] })
      if (selectedMessage) setSelectedMessage(null)
      toast.success('Message deleted')
    },
    onError: () => toast.error('Failed to delete message'),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.messages.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
    onError: () => toast.error('Failed to update status'),
  })

  const filtered = (messages as Message[]).filter(m =>
    (!filterChannel || m.channel === filterChannel) &&
    (!filterStatus || m.status === filterStatus)
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Message Studio</h1>
          <p className="text-xs text-slate-500 mt-1">Draft, review, and manage outreach messages across all market modes</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="demo-banner text-xs py-1">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Messages generated in demo mode require editing before sending
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Messages', value: (messages as Message[]).length, color: 'text-slate-200' },
          { label: 'Drafts', value: (messages as Message[]).filter(m => m.status === 'draft').length, color: 'text-slate-400' },
          { label: 'Ready to Send', value: (messages as Message[]).filter(m => m.status === 'ready').length, color: 'text-teal-400' },
          { label: 'Sent', value: (messages as Message[]).filter(m => m.status === 'sent').length, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="fm-card p-3 text-center">
            <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="fm-card p-3 flex items-center gap-3">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <select className="fm-input py-1 text-xs w-40" value={filterChannel} onChange={e => setFilterChannel(e.target.value)}>
          <option value="">All Channels</option>
          {CHANNELS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ')}</option>)}
        </select>
        <select className="fm-input py-1 text-xs w-40" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['draft','ready','sent','archived'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} message{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-teal-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="fm-card p-12 text-center">
          <MessageSquare className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-1">No messages yet</p>
          <p className="text-xs text-slate-600">Generate messages from a Target Profile using the "Generate Message" action</p>
        </div>
      ) : (
        <div className="grid grid-cols-[320px_1fr] gap-4">
          {/* Message list */}
          <div className="space-y-2">
            {filtered.map((m: Message) => (
              <div
                key={m.id}
                onClick={() => setSelectedMessage(m)}
                className={cn(
                  'fm-card p-3 cursor-pointer transition-colors',
                  selectedMessage?.id === m.id ? 'border-teal-500/50 bg-teal-950/10' : 'hover:border-slate-600/50'
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="text-slate-500 mt-0.5"><ChannelIcon channel={m.channel} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', STATUS_COLORS[m.status] || STATUS_COLORS.draft)}>{m.status}</span>
                      <span className="text-[10px] text-slate-500 capitalize">{m.tone}</span>
                    </div>
                    {m.subject && <p className="text-xs font-medium text-slate-200 truncate">{m.subject}</p>}
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{m.body.substring(0, 80)}…</p>
                    <p className="text-[10px] text-slate-600 mt-1">{formatDateTime(m.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message detail */}
          {selectedMessage ? (
            <div className="fm-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ChannelIcon channel={selectedMessage.channel} />
                    <span className="text-xs text-slate-400 capitalize">{selectedMessage.channel.replace('_', ' ')} · {selectedMessage.tone}</span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', STATUS_COLORS[selectedMessage.status] || STATUS_COLORS.draft)}>{selectedMessage.status}</span>
                  </div>
                  {selectedMessage.subject && <h2 className="text-sm font-semibold text-slate-100 mb-1">{selectedMessage.subject}</h2>}
                  <p className="text-[10px] text-slate-600">{formatDateTime(selectedMessage.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedMessage.status === 'draft' && (
                    <button className="btn-secondary text-xs py-1" onClick={() => updateStatus.mutate({ id: selectedMessage.id, status: 'ready' })}>
                      Mark Ready
                    </button>
                  )}
                  <button className="btn-ghost p-1.5 text-slate-500 hover:text-red-400" onClick={() => deleteMessage.mutate(selectedMessage.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="fm-label">Message Body</label>
                <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {selectedMessage.body}
                </div>
              </div>

              <div className="bg-amber-950/20 border border-amber-700/30 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-400/80">This message was generated in Demo Research Mode. Review and personalize before sending. Never send AI-generated outreach without human review.</p>
              </div>
            </div>
          ) : (
            <div className="fm-card flex items-center justify-center text-slate-600 text-xs">
              Select a message to view its content
            </div>
          )}
        </div>
      )}
    </div>
  )
}
