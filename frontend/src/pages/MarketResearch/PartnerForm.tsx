interface FormProps { criteria: Record<string, unknown>; onUpdate: (f: string, v: unknown) => void }
function F({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return <div><label className="fm-label">{label}</label>{description && <p className="text-[10px] text-slate-500 mb-1.5">{description}</p>}{children}</div>
}
const ORG_TYPES = ['Prime Contractor','Subcontractor','University / Research Inst.','Association','Nonprofit','Referral Partner','Industry Organization','Technical Partner','Distributor','Reseller']
const OBJECTIVES = ['Co-Prime on Federal Contract','Subcontractor Relationship','Channel Partner','Referral Agreement','Joint Venture','Research Collaboration','Grant Co-Applicant','Distribution Agreement']
export function PartnerForm({ criteria, onUpdate }: FormProps) {
  const g = (k: string) => (criteria[k] as string) || ''
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-100 mb-1">Partner Research Criteria</h3>
      <div className="grid grid-cols-2 gap-3">
        <F label="Organization Type"><select className="fm-input" value={g('org_type')} onChange={e => onUpdate('org_type', e.target.value)}><option value="">Any</option>{ORG_TYPES.map(t => <option key={t}>{t}</option>)}</select></F>
        <F label="Industry / Mission Area"><input className="fm-input" value={g('industry')} onChange={e => onUpdate('industry', e.target.value)} placeholder="e.g. AgTech, Federal IT, Conservation" /></F>
        <F label="Geographic Reach"><input className="fm-input" value={g('geography')} onChange={e => onUpdate('geography', e.target.value)} placeholder="e.g. Oklahoma, National, Federal" /></F>
        <F label="Desired Capability" description="What they bring to the relationship"><input className="fm-input" value={g('capability')} onChange={e => onUpdate('capability', e.target.value)} placeholder="e.g. IDIQ vehicles, producer networks" /></F>
        <F label="Access to Target Customers"><input className="fm-input" value={g('market_access')} onChange={e => onUpdate('market_access', e.target.value)} placeholder="e.g. 10,000 farmer members" /></F>
        <F label="Partnership Objective"><select className="fm-input" value={g('objective')} onChange={e => onUpdate('objective', e.target.value)}><option value="">Any</option>{OBJECTIVES.map(o => <option key={o}>{o}</option>)}</select></F>
        <F label="Influence Level" description="How influential in target market?"><select className="fm-input" value={g('influence')} onChange={e => onUpdate('influence', e.target.value)}><option value="">Any</option>{['Low','Medium','High','Industry Leader'].map(l => <option key={l}>{l}</option>)}</select></F>
        <F label="Validation Value" description="Scientific, market, or reputational validation"><select className="fm-input" value={g('validation')} onChange={e => onUpdate('validation', e.target.value)}><option value="">Any</option>{['None','Low','Medium','High'].map(l => <option key={l}>{l}</option>)}</select></F>
        <F label="Funding Relevance"><input className="fm-input" value={g('funding')} onChange={e => onUpdate('funding', e.target.value)} placeholder="e.g. SBIR, USDA grants" /></F>
        <F label="Minimum Score"><input className="fm-input" type="number" min="0" max="100" value={g('min_score')} onChange={e => onUpdate('min_score', e.target.value)} placeholder="e.g. 60" /></F>
      </div>
    </div>
  )
}
