import { useState } from 'react'
import { MessageCircle, X, Send, Bot, User, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  'Which targets should I prioritize this week?',
  'What data gaps need attention?',
  'What outreach should I start?',
  'Give me a pipeline risk summary',
]

function generateResponse(userMsg: string, dashData: unknown): string {
  const d = dashData as { kpis?: { total_targets: number; qualified_count: number; pipeline_value: number; outreach_sent: number; active_opportunities: number }; recommendations?: { type: string; title: string; body: string }[]; needs_enrichment?: { name: string }[]; high_priority_targets?: { name: string; score?: number }[] } | null
  const lower = userMsg.toLowerCase()

  if (lower.includes('prioriti')) {
    const targets = d?.high_priority_targets?.slice(0, 3)
    if (targets?.length) {
      return `Based on current scores in your database, here are your top priorities:\n\n${targets.map((t, i) => `${i + 1}. **${t.name}** (Score: ${t.score ?? '—'})`).join('\n')}\n\nFocus on these targets for outreach first, as they represent your strongest qualification matches. This recommendation is based on stored score data.`
    }
    return `You have ${d?.kpis?.total_targets ?? 0} total targets in the system. Calculate scores on your top targets, then return here for a prioritized recommendation. Not enough scored targets exist yet to provide a reliable ranking.`
  }

  if (lower.includes('gap') || lower.includes('enrich') || lower.includes('missing')) {
    const needs = d?.needs_enrichment?.slice(0, 3)
    if (needs?.length) {
      return `I've identified ${needs.length}+ targets needing enrichment:\n\n${needs.map(n => `• **${n.name}** — low confidence or unenriched`).join('\n')}\n\nPriority enrichment actions:\n1. Add decision-maker contacts\n2. Verify location and industry\n3. Add at least one research claim\n\nThis analysis is based on your stored records.`
    }
    return 'No significant data gaps detected at this time. Continue adding targets and the system will flag enrichment opportunities automatically.'
  }

  if (lower.includes('outreach') || lower.includes('contact') || lower.includes('email')) {
    const qualified = d?.kpis?.qualified_count ?? 0
    const sent = d?.kpis?.outreach_sent ?? 0
    if (qualified > 0 && sent === 0) {
      return `You have **${qualified} qualified targets** but no outreach logged yet. Recommended next step:\n\n1. Open your highest-scoring qualified target\n2. Use "Generate Message" to create a first-touch message\n3. Log the activity after sending\n\nStart with your Priority-tier targets for the best response rate.`
    }
    return `Your pipeline shows ${d?.kpis?.outreach_sent ?? 0} outreach activities logged. Use the Message Studio to create personalized outreach for targets that haven't been contacted recently.`
  }

  if (lower.includes('pipeline') || lower.includes('risk') || lower.includes('value')) {
    const value = d?.kpis?.pipeline_value ?? 0
    return `Current pipeline snapshot:\n\n• **Estimated Value:** $${value.toLocaleString()}\n• **Active Opportunities:** ${d?.kpis?.active_opportunities ?? 0}\n• **Qualified Targets:** ${d?.kpis?.qualified_count ?? 0}\n\n⚠️ Risk factors to watch: targets without recent activity, opportunities with no expected decision date, and low-confidence records in late stages.\n\n*Note: This is a summary of stored data. Pipeline accuracy depends on keeping records current.*`
  }

  if (lower.includes('recommend')) {
    const recs = d?.recommendations?.filter(r => r.type !== 'info')
    if (recs?.length) {
      return `Here are my current strategic recommendations based on your data:\n\n${recs.map((r, i) => `${i + 1}. **${r.title}**\n   ${r.body}`).join('\n\n')}`
    }
    return 'Add more targets and activity data to unlock data-driven strategic recommendations. Not enough activity exists yet to calculate a reliable recommendation.'
  }

  return `I can help with target prioritization, data gaps, outreach strategy, opportunity qualification, stakeholder mapping, pipeline risks, and data quality.\n\nTry asking:\n• "Which targets should I prioritize?"\n• "What gaps need attention?"\n• "What's my pipeline risk?"\n\n*Note: This assistant provides simulated responses based on your stored application data. Connect a live AI provider in Settings for real AI-powered analysis.*`
}

export function AIAssistant({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello. I\'m your Market Director assistant. I can help you prioritize targets, identify data gaps, recommend outreach strategies, and analyze your pipeline — all based on your stored records.\n\nWhat would you like to explore?',
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: dashData } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.dashboard.get() })

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    const response = generateResponse(text, dashData ?? null)
    setMessages(prev => [...prev, { role: 'assistant', content: response }])
    setLoading(false)
  }

  if (!open) return null

  return (
    <div className="fixed right-0 top-0 h-full w-[380px] bg-[#0f172a] border-l border-[#243044] shadow-2xl z-50 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#243044] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Ask Your Market Director</p>
            <p className="text-[10px] text-slate-500">Context-aware · Simulated responses</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Disclaimer */}
      <div className="px-4 py-2 bg-amber-950/30 border-b border-amber-800/20 shrink-0">
        <div className="flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-amber-400">Simulated responses based on stored data. Connect a live AI provider in Settings to enable real AI analysis.</p>
        </div>
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-2 border-b border-[#243044] shrink-0">
        <div className="flex flex-wrap gap-1">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => { setInput(p) }}
              className="text-[10px] px-2 py-1 bg-[#253347] hover:bg-[#2d3d57] text-slate-400 hover:text-slate-200 rounded border border-[#334155] transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-2.5', msg.role === 'user' && 'flex-row-reverse')}>
            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              msg.role === 'assistant' ? 'bg-teal-600' : 'bg-slate-700')}>
              {msg.role === 'assistant' ? <Bot className="w-3.5 h-3.5 text-white" /> : <User className="w-3.5 h-3.5 text-slate-300" />}
            </div>
            <div className={cn('rounded-lg px-3 py-2 max-w-[85%] text-xs',
              msg.role === 'assistant' ? 'bg-[#1e293b] text-slate-200' : 'bg-teal-600/20 text-slate-200 border border-teal-600/30')}>
              {msg.content.split('\n').map((line, j) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={j} className="font-semibold text-slate-100">{line.replace(/\*\*/g, '')}</p>
                }
                const parts = line.split(/(\*\*[^*]+\*\*)/)
                return (
                  <p key={j} className="leading-relaxed">
                    {parts.map((part, k) =>
                      part.startsWith('**') ? <strong key={k} className="text-slate-100">{part.replace(/\*\*/g, '')}</strong> : part
                    )}
                  </p>
                )
              })}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-[#1e293b] rounded-lg px-3 py-2">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[#243044] shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Ask about your targets, pipeline, or strategy…"
            className="fm-input flex-1 text-xs py-2"
          />
          <button onClick={send} disabled={!input.trim() || loading} className="btn-primary px-3 py-2">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
