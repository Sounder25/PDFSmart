import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type RevenueEvent } from '@/lib/api'
import { toast } from 'sonner'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { formatCurrency, formatDate, REVENUE_TYPE_LABELS } from '@/lib/utils'
import { DollarSign, Plus, Trash2, BookOpen, Mic, Handshake, TrendingUp } from 'lucide-react'

const REVENUE_TYPES = Object.keys(REVENUE_TYPE_LABELS)
const TYPE_ICONS: Record<string, React.ElementType> = { book_sale: BookOpen, bulk_book_order: BookOpen, speaking_fee: Mic, partnership: Handshake, consulting: TrendingUp, investment_received: DollarSign }
const EMPTY = { type: 'book_sale', amount: '', quantity: '1', description: '', event_date: new Date().toISOString().split('T')[0] }

export function Revenue() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [deleting, setDeleting] = useState<RevenueEvent | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  const { data } = useQuery({ queryKey: ['revenue'], queryFn: () => api.revenue.list() })

  const createMut = useMutation({
    mutationFn: () => api.revenue.create({ ...form, amount: Number(form.amount), quantity: Number(form.quantity) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['revenue'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setShowAdd(false); setForm({ ...EMPTY }); toast.success('Revenue recorded') },
    onError: () => toast.error('Failed'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.revenue.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['revenue'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Deleted') },
  })

  const events = data?.data || []
  const summary = data?.summary || []
  const grandTotal = data?.grand_total ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-400" />Revenue Board</h1>
          <p className="text-xs text-slate-500 mt-1">All revenue from book, speaking, consulting, and investment</p>
        </div>
        <button className="btn-primary text-xs" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" />Record Revenue</button>
      </div>

      {/* Grand total */}
      <div className="op-card p-5 flex items-center gap-6">
        <div>
          <div className="text-3xl font-bold text-emerald-300 tracking-tight">{formatCurrency(grandTotal)}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total Revenue</div>
        </div>
        <div className="flex gap-4 flex-wrap">
          {summary.map(s => {
            const Icon = TYPE_ICONS[s.type] || DollarSign
            return (
              <div key={s.type} className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-slate-500" />
                <div>
                  <div className="text-sm font-bold text-slate-200">{formatCurrency(s.total, true)}</div>
                  <div className="text-[10px] text-slate-600">{REVENUE_TYPE_LABELS[s.type] || s.type}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Events list */}
      {events.length === 0 ? (
        <div className="op-card p-12 text-center">
          <DollarSign className="w-7 h-7 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No revenue recorded yet</p>
          <p className="text-xs text-slate-700 mt-1">Track book sales, speaking fees, consulting, and investment received here</p>
          <button className="btn-primary text-xs mt-4" onClick={() => setShowAdd(true)}><Plus className="w-3 h-3" />Record first revenue</button>
        </div>
      ) : (
        <div className="op-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1f2d40]">
                {['Type', 'Description', 'Amount', 'Qty', 'Date', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map(e => {
                const Icon = TYPE_ICONS[e.type] || DollarSign
                return (
                  <tr key={e.id} className="border-b border-[#161f30] hover:bg-white/2 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-emerald-400/60" />
                        <span className="text-slate-400">{REVENUE_TYPE_LABELS[e.type] || e.type}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 max-w-48 truncate">{e.description || e.contact_name || '—'}</td>
                    <td className="px-3 py-2.5 font-bold text-emerald-300">{formatCurrency(e.amount)}</td>
                    <td className="px-3 py-2.5 text-slate-500">{e.quantity > 1 ? e.quantity : '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500">{formatDate(e.event_date, true)}</td>
                    <td className="px-3 py-2.5">
                      <button className="btn-ghost p-1 text-red-400/40 hover:text-red-400" onClick={() => setDeleting(e)}><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setForm({ ...EMPTY }) }} title="Record Revenue" size="sm">
        <div className="space-y-3">
          <div><label className="op-label">Type</label>
            <select className="op-input" value={form.type} onChange={f('type')}>
              {REVENUE_TYPES.map(t => <option key={t} value={t}>{REVENUE_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="op-label">Amount ($) *</label><input className="op-input" type="number" value={form.amount} onChange={f('amount')} placeholder="0.00" /></div>
            <div><label className="op-label">Quantity</label><input className="op-input" type="number" value={form.quantity} onChange={f('quantity')} min="1" /></div>
          </div>
          <div><label className="op-label">Description</label><input className="op-input" value={form.description} onChange={f('description')} placeholder="e.g. Amazon book sale, Speaking at Farm Bureau" /></div>
          <div><label className="op-label">Date</label><input className="op-input" type="date" value={form.event_date} onChange={f('event_date')} /></div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn-primary" onClick={() => createMut.mutate()} disabled={!form.amount || createMut.isPending}>{createMut.isPending ? 'Saving…' : 'Record'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete this revenue entry?" confirmLabel="Delete" danger onConfirm={() => { deleteMut.mutate(deleting!.id); setDeleting(null) }} />
    </div>
  )
}
