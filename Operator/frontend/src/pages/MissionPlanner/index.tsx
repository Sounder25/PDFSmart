import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type AgentTask, type CampaignPlan } from '@/lib/api'
import { toast } from 'sonner'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { cn, formatDate } from '@/lib/utils'
import { Map, Plus, Trash2, Check, Clock, ChevronDown, ChevronRight, Bot, User, AlertCircle, ShieldOff, Shield } from 'lucide-react'
import type { EligibleContact, ExcludedContact, AgentRules } from '@/lib/api'

const TASK_TYPES = ['general','draft_content','send_outreach','follow_up','generate_image','research','review','schedule','meeting']
const PRIORITIES = ['urgent','high','medium','low']
const PRIORITY_COLORS: Record<string, string> = { urgent: 'text-red-400', high: 'text-orange-400', medium: 'text-amber-400', low: 'text-slate-500' }
const STATUS_COLORS: Record<string, string> = { pending: 'text-slate-400', in_progress: 'text-brand-400', complete: 'text-green-400', cancelled: 'text-slate-600', blocked: 'text-red-400' }
const EMPTY_TASK = { title: '', description: '', type: 'general', assigned_to: 'human', priority: 'medium', due_date: '', campaign_id: '', contact_id: '' }

export function MissionPlanner() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'tasks' | 'plans' | 'log' | 'rules'>('tasks')
  const [showAddTask, setShowAddTask] = useState(false)
  const [editingTask, setEditingTask] = useState<AgentTask | null>(null)
  const [deletingTask, setDeletingTask] = useState<AgentTask | null>(null)
  const [taskForm, setTaskForm] = useState({ ...EMPTY_TASK })
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const tf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setTaskForm(p => ({ ...p, [k]: e.target.value }))

  const { data: tasks = [] } = useQuery({ queryKey: ['agent-tasks'], queryFn: () => api.agent.tasks.list() })
  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: () => api.campaigns.list() })
  const { data: log = [] } = useQuery({ queryKey: ['agent-log'], queryFn: () => api.agent.log.list({ limit: '100' }) })
  const { data: eligible } = useQuery({ queryKey: ['agent-eligible'], queryFn: () => api.agent.eligible() })
  const { data: rules, refetch: refetchRules } = useQuery<AgentRules>({ queryKey: ['agent-rules'], queryFn: () => api.agent.rules.get() })
  const { data: plan } = useQuery({
    queryKey: ['campaign-plan', selectedCampaign],
    queryFn: () => api.agent.plan.get(selectedCampaign),
    enabled: !!selectedCampaign
  })

  const createTask = useMutation({
    mutationFn: () => api.agent.tasks.create(taskForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agent-tasks'] }); setShowAddTask(false); setTaskForm({ ...EMPTY_TASK }); toast.success('Task added') },
    onError: () => toast.error('Failed'),
  })

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AgentTask> }) => api.agent.tasks.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agent-tasks'] }); setEditingTask(null); toast.success('Updated') },
  })

  const deleteTask = useMutation({
    mutationFn: (id: string) => api.agent.tasks.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agent-tasks'] }); toast.success('Deleted') },
  })

  const updateRules = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.agent.rules.update(data),
    onSuccess: () => { refetchRules(); qc.invalidateQueries({ queryKey: ['agent-eligible'] }); toast.success('Rules saved') },
  })

  const today = new Date().toISOString().split('T')[0]
  const overdue = tasks.filter(t => t.status === 'pending' && t.due_date && t.due_date < today)
  const pending = tasks.filter(t => t.status === 'pending' && !(t.due_date && t.due_date < today))
  const inProgress = tasks.filter(t => t.status === 'in_progress')
  const done = tasks.filter(t => ['complete','cancelled'].includes(t.status)).slice(0, 20)

  const togglePhase = (id: string) => setExpandedPhases(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Map className="w-5 h-5 text-brand-400" />Mission Planner
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {tasks.filter(t => t.status === 'pending').length} pending · {overdue.length > 0 ? `${overdue.length} overdue · ` : ''}
            Agent socket ready
          </p>
        </div>
        <button className="btn-primary text-xs" onClick={() => setShowAddTask(true)}><Plus className="w-3.5 h-3.5" />Add Task</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1f2d40]">
        {(['tasks','plans','rules','log'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={cn('px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px',
              activeTab === t ? 'border-brand-500 text-brand-300' : 'border-transparent text-slate-500 hover:text-slate-300'
            )}>
            {t === 'log' ? 'Agent Log' : t === 'plans' ? 'Campaign Plans' : t === 'rules' ? `Outreach Rules${eligible ? ` · ${eligible.eligible.length} eligible` : ''}` : 'Task Queue'}
          </button>
        ))}
      </div>

      {/* Task Queue */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {overdue.length > 0 && (
            <div className="op-card p-4 border-red-800/20">
              <h2 className="text-xs font-semibold text-red-400 flex items-center gap-1.5 mb-3">
                <AlertCircle className="w-3.5 h-3.5" />{overdue.length} Overdue
              </h2>
              <TaskList tasks={overdue} onComplete={id => updateTask.mutate({ id, data: { status: 'complete' } })} onDelete={setDeletingTask} onEdit={t => { setEditingTask(t); setTaskForm({ title: t.title, description: t.description || '', type: t.type, assigned_to: t.assigned_to, priority: t.priority, due_date: t.due_date || '', campaign_id: t.campaign_id || '', contact_id: t.contact_id || '' }) }} />
            </div>
          )}

          {inProgress.length > 0 && (
            <div className="op-card p-4">
              <h2 className="text-xs font-semibold text-brand-300 mb-3">In Progress ({inProgress.length})</h2>
              <TaskList tasks={inProgress} onComplete={id => updateTask.mutate({ id, data: { status: 'complete' } })} onDelete={setDeletingTask} onEdit={t => { setEditingTask(t); setTaskForm({ title: t.title, description: t.description || '', type: t.type, assigned_to: t.assigned_to, priority: t.priority, due_date: t.due_date || '', campaign_id: t.campaign_id || '', contact_id: t.contact_id || '' }) }} />
            </div>
          )}

          {pending.length > 0 && (
            <div className="op-card p-4">
              <h2 className="text-xs font-semibold text-slate-400 mb-3">Pending ({pending.length})</h2>
              <TaskList tasks={pending} onComplete={id => updateTask.mutate({ id, data: { status: 'complete' } })} onDelete={setDeletingTask} onEdit={t => { setEditingTask(t); setTaskForm({ title: t.title, description: t.description || '', type: t.type, assigned_to: t.assigned_to, priority: t.priority, due_date: t.due_date || '', campaign_id: t.campaign_id || '', contact_id: t.contact_id || '' }) }} />
            </div>
          )}

          {tasks.length === 0 && (
            <div className="op-card p-12 text-center">
              <Map className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No tasks yet</p>
              <p className="text-xs text-slate-700 mt-1">Tasks you or Hermes create will queue here</p>
              <button className="btn-primary text-xs mt-4" onClick={() => setShowAddTask(true)}><Plus className="w-3 h-3" />Add first task</button>
            </div>
          )}

          {done.length > 0 && (
            <div className="op-card p-4">
              <h2 className="text-xs font-semibold text-slate-600 mb-3">Recently Completed</h2>
              <div className="space-y-1.5">
                {done.map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-xs text-slate-600 line-through">
                    <Check className="w-3 h-3 text-green-700 shrink-0" />
                    <span>{t.title}</span>
                    {t.campaign_name && <span className="text-slate-700 no-underline">· {t.campaign_name}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Campaign Plans */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select className="op-input max-w-xs" value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)}>
              <option value="">— Select a campaign —</option>
              {campaigns.map((c: { id: string; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {selectedCampaign && !plan && (
            <div className="op-card p-8 text-center">
              <Map className="w-7 h-7 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No plan yet for this campaign</p>
              <p className="text-xs text-slate-700 mt-1">Hermes will write the plan here when it runs. You can also see it taking shape phase by phase.</p>
            </div>
          )}

          {plan && <PlanView plan={plan} expandedPhases={expandedPhases} togglePhase={togglePhase} />}

          {!selectedCampaign && (
            <div className="op-card p-8 text-center">
              <p className="text-sm text-slate-500">Select a campaign to view its plan</p>
            </div>
          )}
        </div>
      )}

      {/* Outreach Rules */}
      {activeTab === 'rules' && rules && (
        <div className="space-y-4">
          {/* Rule config */}
          <div className="op-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2"><Shield className="w-4 h-4 text-brand-400" />Hermes Outreach Rules</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="op-label">Min days between contacts to same person</label>
                <input className="op-input" type="number" key={`mdb-${rules.min_days_between_outreach}`} defaultValue={rules.min_days_between_outreach}
                  onBlur={e => updateRules.mutate({ min_days_between_outreach: Number(e.target.value) })} />
              </div>
              <div>
                <label className="op-label">Cooldown after "declined" (days)</label>
                <input className="op-input" type="number" key={`cd-${rules.cooldown_days_after_decline}`} defaultValue={rules.cooldown_days_after_decline}
                  onBlur={e => updateRules.mutate({ cooldown_days_after_decline: Number(e.target.value) })} />
              </div>
              <div>
                <label className="op-label">Cooldown after "no response" (days)</label>
                <input className="op-input" type="number" key={`nr-${rules.cooldown_days_after_no_response}`} defaultValue={rules.cooldown_days_after_no_response}
                  onBlur={e => updateRules.mutate({ cooldown_days_after_no_response: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <input type="checkbox" id="require_email" className="w-4 h-4 accent-brand-500" defaultChecked={!!rules.require_email}
                  onChange={e => updateRules.mutate({ require_email: e.target.checked ? 1 : 0 })} />
                <label htmlFor="require_email" className="text-xs text-slate-300">Require email address to contact</label>
              </div>
            </div>
            <div className="text-[10px] text-slate-600 pt-1">Rules auto-save on blur. Hermes reads these every time it wakes up.</div>
          </div>

          {/* Eligible contacts */}
          {eligible && (
            <>
              <div className="op-card p-4">
                <h2 className="text-xs font-semibold text-green-400 mb-3 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />{eligible.eligible.length} Contacts Eligible for Outreach
                </h2>
                <div className="grid grid-cols-2 gap-1.5">
                  {eligible.eligible.map((c: EligibleContact) => (
                    <div key={c.id} className="flex items-center gap-2 text-xs bg-slate-800/20 rounded-lg px-3 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-slate-200 truncate">{c.name}</p>
                        <p className="text-[10px] text-slate-600 truncate">{c.organization || c.type}</p>
                      </div>
                      <span className="text-[10px] text-slate-600 shrink-0">{c.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {eligible.excluded.length > 0 && (
                <div className="op-card p-4">
                  <h2 className="text-xs font-semibold text-red-400/70 mb-3 flex items-center gap-2">
                    <ShieldOff className="w-3.5 h-3.5" />{eligible.excluded.length} Excluded
                  </h2>
                  <div className="space-y-1.5">
                    {eligible.excluded.map((c: ExcludedContact) => (
                      <div key={c.id} className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-red-900/5 border border-red-900/10">
                        <ShieldOff className="w-3 h-3 text-red-500/50 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="text-slate-400">{c.name}</span>
                          {c.organization && <span className="text-slate-600"> · {c.organization}</span>}
                        </div>
                        <span className="text-[10px] text-red-400/60 shrink-0 text-right max-w-[180px]">{c.exclusion_reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Agent Log */}
      {activeTab === 'log' && (
        <div className="op-card overflow-hidden">
          {log.length === 0 ? (
            <div className="p-12 text-center">
              <Bot className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Agent log is empty</p>
              <p className="text-xs text-slate-700 mt-1">Every action Hermes takes gets recorded here</p>
            </div>
          ) : (
            <div className="divide-y divide-[#161f30]">
              {log.map(entry => (
                <div key={entry.id} className="px-4 py-3 flex items-start gap-3 text-xs">
                  <Bot className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 font-medium">{entry.action}</p>
                    {entry.details && <p className="text-slate-600 mt-0.5 truncate">{entry.details}</p>}
                    {entry.campaign_name && <p className="text-brand-500/70 text-[10px] mt-0.5">{entry.campaign_name}</p>}
                  </div>
                  <span className="text-[10px] text-slate-600 shrink-0">{formatDate(entry.created_at, true)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Task Modal */}
      <Modal open={showAddTask || !!editingTask} onClose={() => { setShowAddTask(false); setEditingTask(null); setTaskForm({ ...EMPTY_TASK }) }} title={editingTask ? 'Edit Task' : 'Add Task'} size="md">
        <div className="space-y-3">
          <div><label className="op-label">Title *</label><input className="op-input" value={taskForm.title} onChange={tf('title')} placeholder="What needs to happen?" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="op-label">Type</label>
              <select className="op-input" value={taskForm.type} onChange={tf('type')}>
                {TASK_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select>
            </div>
            <div><label className="op-label">Assigned To</label>
              <select className="op-input" value={taskForm.assigned_to} onChange={tf('assigned_to')}>
                <option value="human">Me</option>
                <option value="agent">Hermes</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="op-label">Priority</label>
              <select className="op-input" value={taskForm.priority} onChange={tf('priority')}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div><label className="op-label">Due Date</label><input className="op-input" type="date" value={taskForm.due_date} onChange={tf('due_date')} /></div>
          </div>
          <div><label className="op-label">Campaign (optional)</label>
            <select className="op-input" value={taskForm.campaign_id} onChange={tf('campaign_id')}>
              <option value="">None</option>
              {campaigns.map((c: { id: string; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="op-label">Description</label><textarea className="op-input resize-none" rows={3} value={taskForm.description} onChange={tf('description')} placeholder="What specifically needs to be done?" /></div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button className="btn-secondary" onClick={() => { setShowAddTask(false); setEditingTask(null) }}>Cancel</button>
          <button className="btn-primary" disabled={!taskForm.title || createTask.isPending || updateTask.isPending}
            onClick={() => editingTask ? updateTask.mutate({ id: editingTask.id, data: taskForm }) : createTask.mutate()}>
            {editingTask ? 'Save' : 'Add Task'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deletingTask} onClose={() => setDeletingTask(null)} title="Delete this task?" confirmLabel="Delete" danger
        onConfirm={() => { deleteTask.mutate(deletingTask!.id); setDeletingTask(null) }} />
    </div>
  )
}

function TaskList({ tasks, onComplete, onDelete, onEdit }: {
  tasks: AgentTask[]
  onComplete: (id: string) => void
  onDelete: (t: AgentTask) => void
  onEdit: (t: AgentTask) => void
}) {
  return (
    <div className="space-y-1.5">
      {tasks.map(t => (
        <div key={t.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/20 hover:bg-slate-800/40 transition-colors group">
          <button onClick={() => onComplete(t.id)} className="mt-0.5 w-4 h-4 rounded border border-slate-600 hover:border-green-500 hover:bg-green-900/20 shrink-0 flex items-center justify-center transition-colors">
            <Check className="w-2.5 h-2.5 text-green-500 opacity-0 group-hover:opacity-60" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-200 font-medium">{t.title}</span>
              <span className={cn('text-[10px] font-bold', PRIORITY_COLORS[t.priority])}>{t.priority}</span>
              {t.assigned_to === 'agent' ? <Bot className="w-3 h-3 text-brand-400" /> : <User className="w-3 h-3 text-slate-600" />}
              {t.status === 'in_progress' && <span className={cn('text-[10px]', STATUS_COLORS.in_progress)}>in progress</span>}
            </div>
            {t.description && <p className="text-[10px] text-slate-600 mt-0.5 truncate">{t.description}</p>}
            <div className="flex items-center gap-2 mt-0.5">
              {t.campaign_name && <span className="text-[10px] text-brand-500/70">{t.campaign_name}</span>}
              {t.due_date && <span className="text-[10px] flex items-center gap-0.5 text-slate-600"><Clock className="w-2.5 h-2.5" />{formatDate(t.due_date, true)}</span>}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="btn-ghost p-1 text-xs" onClick={() => onEdit(t)}>Edit</button>
            <button className="btn-ghost p-1 text-red-400/40 hover:text-red-400" onClick={() => onDelete(t)}><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
      ))}
    </div>
  )
}

function PlanView({ plan, expandedPhases, togglePhase }: { plan: CampaignPlan; expandedPhases: Set<string>; togglePhase: (id: string) => void }) {
  return (
    <div className="space-y-3">
      {plan.summary && (
        <div className="op-card p-4">
          <p className="op-label mb-1">Plan Summary</p>
          <p className="text-sm text-slate-300">{plan.summary}</p>
          {plan.goal && <p className="text-xs text-slate-500 mt-2"><span className="text-slate-400 font-medium">Goal:</span> {plan.goal}</p>}
          {plan.strategy && <p className="text-xs text-slate-500 mt-1"><span className="text-slate-400 font-medium">Strategy:</span> {plan.strategy}</p>}
          <p className="text-[10px] text-slate-700 mt-2">Written by {plan.created_by}</p>
        </div>
      )}

      {plan.phases.length === 0 && <div className="op-card p-6 text-center text-xs text-slate-600">No phases defined yet</div>}

      {plan.phases.map((phase, i) => (
        <div key={phase.id} className="op-card overflow-hidden">
          <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors" onClick={() => togglePhase(phase.id)}>
            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
              phase.status === 'complete' ? 'bg-green-900/30 text-green-400' : phase.status === 'in_progress' ? 'bg-brand-900/30 text-brand-400' : 'bg-slate-800 text-slate-500'
            )}>{i + 1}</div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-slate-200">{phase.name}</p>
              {(phase.start_date || phase.end_date) && (
                <p className="text-[10px] text-slate-600">{phase.start_date ? formatDate(phase.start_date, true) : '?'} → {phase.end_date ? formatDate(phase.end_date, true) : '?'}</p>
              )}
            </div>
            <span className="text-[10px] text-slate-600">{phase.milestones.length} milestone{phase.milestones.length !== 1 ? 's' : ''}</span>
            {expandedPhases.has(phase.id) ? <ChevronDown className="w-3.5 h-3.5 text-slate-600" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
          </button>

          {expandedPhases.has(phase.id) && (
            <div className="border-t border-[#1f2d40] px-4 py-3 space-y-2">
              {phase.description && <p className="text-xs text-slate-500 mb-3">{phase.description}</p>}
              {phase.milestones.length === 0 && <p className="text-xs text-slate-700">No milestones</p>}
              {phase.milestones.map(m => (
                <div key={m.id} className="flex items-start gap-2 text-xs">
                  <div className={cn('w-2 h-2 rounded-full mt-1 shrink-0', m.status === 'complete' ? 'bg-green-500' : m.status === 'missed' ? 'bg-red-500' : 'bg-slate-600')} />
                  <div>
                    <span className={cn(m.status === 'complete' ? 'text-slate-600 line-through' : 'text-slate-300')}>{m.name}</span>
                    {m.due_date && <span className="text-[10px] text-slate-600 ml-2">{formatDate(m.due_date, true)}</span>}
                    {m.description && <p className="text-[10px] text-slate-600 mt-0.5">{m.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
