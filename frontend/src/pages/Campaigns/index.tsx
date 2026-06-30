import { Megaphone, Clock, Zap, Users, ArrowRight, CheckCircle } from 'lucide-react'

const PLANNED_FEATURES = [
  { icon: Users, title: 'Multi-Target Campaigns', desc: 'Group targets into campaigns by market mode, geography, or tags and manage outreach at scale.' },
  { icon: Zap, title: 'Automated Sequence Steps', desc: 'Define touchpoint sequences with timing rules — e.g., email on Day 1, follow-up call on Day 7.' },
  { icon: CheckCircle, title: 'Compliance Tracking', desc: 'Track consent status, opt-outs, and CAN-SPAM / TCPA compliance for every contact in the campaign.' },
  { icon: Clock, title: 'Send Scheduling', desc: 'Schedule messages for optimal delivery windows and track open and response rates.' },
]

export function Campaigns() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Campaigns</h1>
        <p className="text-xs text-slate-500 mt-1">Multi-step outreach campaigns with compliance tracking</p>
      </div>

      {/* Coming Soon Banner */}
      <div className="fm-card p-8 text-center space-y-4 border-teal-500/20">
        <div className="w-16 h-16 bg-teal-950/40 border border-teal-700/30 rounded-2xl flex items-center justify-center mx-auto">
          <Megaphone className="w-8 h-8 text-teal-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-200 mb-1">Campaigns — Phase 2</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Campaign management is on the Phase 2 roadmap. You can already generate individual outreach messages from any Target Profile using the Generate Message action.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-teal-400 bg-teal-950/30 border border-teal-700/30 px-3 py-1.5 rounded-full">
          <Clock className="w-3 h-3" />
          Planned for Phase 2
        </div>
      </div>

      {/* Planned features */}
      <div className="grid grid-cols-2 gap-4">
        {PLANNED_FEATURES.map(f => {
          const Icon = f.icon
          return (
            <div key={f.title} className="fm-card p-4 opacity-60">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-300 mb-0.5">{f.title}</h3>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Workaround callout */}
      <div className="fm-card p-4 bg-slate-800/20">
        <div className="flex items-start gap-3">
          <ArrowRight className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-slate-200 mb-1">In the meantime</p>
            <p className="text-xs text-slate-400">
              Navigate to any <strong className="text-slate-300">Target Profile</strong> and use the <strong className="text-slate-300">Generate Message</strong> button to create channel-specific outreach. Saved drafts appear in Message Studio where you can review and mark them ready to send.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
