interface FormProps { criteria: Record<string, unknown>; onUpdate: (f: string, v: unknown) => void }
function F({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return <div><label className="fm-label">{label}</label>{description && <p className="text-[10px] text-slate-500 mb-1.5">{description}</p>}{children}</div>
}
const TYPES = ['Champion','Legislator','Regulator','Extension Personnel','Veterinarian','Advisor','Influencer','Community Leader','Validation Partner','Academic Expert']
const DESIRED_SUPPORT = ['Endorsement','Funding Access','Policy Influence','Introductions','Technical Validation','Community Credibility','Media / PR','Regulatory Guidance']
export function StakeholderForm({ criteria, onUpdate }: FormProps) {
  const g = (k: string) => (criteria[k] as string) || ''
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-100 mb-1">Stakeholder Research Criteria</h3>
      <div className="grid grid-cols-2 gap-3">
        <F label="Stakeholder Type"><select className="fm-input" value={g('stakeholder_type')} onChange={e => onUpdate('stakeholder_type', e.target.value)}><option value="">Any</option>{TYPES.map(t => <option key={t}>{t}</option>)}</select></F>
        <F label="Mission Alignment"><input className="fm-input" value={g('mission')} onChange={e => onUpdate('mission', e.target.value)} placeholder="e.g. agricultural sustainability, rural development" /></F>
        <F label="Geographic Jurisdiction"><input className="fm-input" value={g('jurisdiction')} onChange={e => onUpdate('jurisdiction', e.target.value)} placeholder="e.g. Oklahoma, District 3" /></F>
        <F label="Influence Level"><select className="fm-input" value={g('influence')} onChange={e => onUpdate('influence', e.target.value)}><option value="">Any</option>{['Local','State','Regional','National'].map(l => <option key={l}>{l}</option>)}</select></F>
        <F label="Authority / Access"><select className="fm-input" value={g('authority')} onChange={e => onUpdate('authority', e.target.value)}><option value="">Any</option>{['Advisory','Gatekeeping','Decision-Making','Regulatory'].map(a => <option key={a}>{a}</option>)}</select></F>
        <F label="Network Access"><input className="fm-input" value={g('network')} onChange={e => onUpdate('network', e.target.value)} placeholder="e.g. producer associations, agency leaders" /></F>
        <F label="Public Credibility"><select className="fm-input" value={g('credibility')} onChange={e => onUpdate('credibility', e.target.value)}><option value="">Any</option>{['Low','Medium','High','Nationally Recognized'].map(c => <option key={c}>{c}</option>)}</select></F>
        <F label="Desired Support Type"><select className="fm-input" value={g('support_type')} onChange={e => onUpdate('support_type', e.target.value)}><option value="">Any</option>{DESIRED_SUPPORT.map(s => <option key={s}>{s}</option>)}</select></F>
        <F label="Relationship Strength (Current)"><select className="fm-input" value={g('relationship')} onChange={e => onUpdate('relationship', e.target.value)}><option value="">Any</option>{['None (Cold)','Awareness','Acquaintance','Working Relationship','Advocate'].map(r => <option key={r}>{r}</option>)}</select></F>
        <F label="Minimum Score"><input className="fm-input" type="number" min="0" max="100" value={g('min_score')} onChange={e => onUpdate('min_score', e.target.value)} placeholder="e.g. 60" /></F>
      </div>
    </div>
  )
}
