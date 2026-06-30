interface FormProps { criteria: Record<string, unknown>; onUpdate: (f: string, v: unknown) => void }

const GOV_LEVELS = ['Federal','State','County','Municipal','Tribal']
const MISSION_AREAS = ['Agriculture','Defense','Education','Energy','Environment','Health','Housing','IT & Technology','Infrastructure','Law Enforcement','Research & Development','Transportation']
const OPP_TYPES = ['Sources Sought','RFI','RFP','RFQ','Grant','Cooperative Agreement','Pilot','Direct Agency Outreach','Prime-Contractor Teaming','Legislative or Policy Engagement']
const SET_ASIDES = ['None','Small Business','8(a)','HUBZone','SDVOSB','WOSB','EDWOSB','AbilityOne']

function F({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="fm-label">{label}</label>
      {description && <p className="text-[10px] text-slate-500 mb-1.5">{description}</p>}
      {children}
    </div>
  )
}

export function GovernmentForm({ criteria, onUpdate }: FormProps) {
  const g = (k: string) => (criteria[k] as string) || ''
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-100 mb-1">Government Research Criteria</h3>
      <div className="grid grid-cols-2 gap-3">
        <F label="Government Level">
          <select className="fm-input" value={g('gov_level')} onChange={e => onUpdate('gov_level', e.target.value)}>
            <option value="">Any level</option>
            {GOV_LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
        </F>
        <F label="Agency / Department">
          <input className="fm-input" value={g('agency')} onChange={e => onUpdate('agency', e.target.value)} placeholder="e.g. USDA, DoD, State DOT" />
        </F>
        <F label="Mission Area" description="Primary mission focus">
          <select className="fm-input" value={g('mission_area')} onChange={e => onUpdate('mission_area', e.target.value)}>
            <option value="">Any mission</option>
            {MISSION_AREAS.map(m => <option key={m}>{m}</option>)}
          </select>
        </F>
        <F label="Jurisdiction / State">
          <input className="fm-input" value={g('jurisdiction')} onChange={e => onUpdate('jurisdiction', e.target.value)} placeholder="e.g. Oklahoma, National" />
        </F>
        <F label="NAICS Code(s)">
          <input className="fm-input" value={g('naics_codes')} onChange={e => onUpdate('naics_codes', e.target.value)} placeholder="e.g. 541710, 541690" />
        </F>
        <F label="PSC Code(s)">
          <input className="fm-input" value={g('psc_codes')} onChange={e => onUpdate('psc_codes', e.target.value)} placeholder="e.g. A001, R499" />
        </F>
        <F label="Contract Value Range">
          <input className="fm-input" value={g('contract_value')} onChange={e => onUpdate('contract_value', e.target.value)} placeholder="e.g. $50K–$500K" />
        </F>
        <F label="Set-Aside Type">
          <select className="fm-input" value={g('set_aside')} onChange={e => onUpdate('set_aside', e.target.value)}>
            <option value="">Any</option>
            {SET_ASIDES.map(s => <option key={s}>{s}</option>)}
          </select>
        </F>
        <F label="Opportunity Type">
          <select className="fm-input" value={g('opportunity_type')} onChange={e => onUpdate('opportunity_type', e.target.value)}>
            <option value="">Any type</option>
            {OPP_TYPES.map(o => <option key={o}>{o}</option>)}
          </select>
        </F>
        <F label="Fiscal Year Timing">
          <input className="fm-input" value={g('fiscal_year')} onChange={e => onUpdate('fiscal_year', e.target.value)} placeholder="e.g. FY2026, Q1 FY2027" />
        </F>
        <F label="Target Stakeholder Roles">
          <input className="fm-input" value={g('stakeholder_roles')} onChange={e => onUpdate('stakeholder_roles', e.target.value)} placeholder="e.g. Contracting Officer, Program Manager" />
        </F>
        <F label="Funding Source">
          <input className="fm-input" value={g('funding_source')} onChange={e => onUpdate('funding_source', e.target.value)} placeholder="e.g. ARPA-E, USDA AMS, Title II" />
        </F>
        <F label="Minimum Score">
          <input className="fm-input" type="number" min="0" max="100" value={g('min_score')} onChange={e => onUpdate('min_score', e.target.value)} placeholder="e.g. 60" />
        </F>
        <F label="Desired Result Count">
          <input className="fm-input" type="number" min="1" max="10" value={g('desired_count')} onChange={e => onUpdate('desired_count', e.target.value)} placeholder="5" />
        </F>
      </div>
    </div>
  )
}
