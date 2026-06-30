interface FormProps {
  criteria: Record<string, unknown>
  onUpdate: (field: string, value: unknown) => void
}

const INDUSTRIES = ['Aerospace & Defense','Agriculture','Construction','Energy','Financial Services','Government IT','Healthcare','Industrial Manufacturing','Logistics','Professional Services','SaaS / Software','Transportation']
const SIZES = ['1-10','11-50','51-200','201-500','501-2000','2000+']
const REVENUE = ['< $1M','$1M–$5M','$5M–$25M','$25M–$100M','$100M–$500M','$500M+']

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="fm-label">{label}</label>
      {description && <p className="text-[10px] text-slate-500 mb-1.5">{description}</p>}
      {children}
    </div>
  )
}

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select className="fm-input" value={value || ''} onChange={e => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

export function CommercialForm({ criteria, onUpdate }: FormProps) {
  const g = (k: string) => (criteria[k] as string) || ''
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-100 mb-1">Commercial Research Criteria</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Industry" description="Primary industry sector to target">
          <Select value={g('industry')} onChange={v => onUpdate('industry', v)} options={INDUSTRIES} placeholder="Any industry" />
        </Field>
        <Field label="Sub-Industry / Niche">
          <input className="fm-input" value={g('subindustry')} onChange={e => onUpdate('subindustry', e.target.value)} placeholder="e.g. Precision Machining" />
        </Field>
        <Field label="Company Size (Employees)">
          <Select value={g('company_size')} onChange={v => onUpdate('company_size', v)} options={SIZES} placeholder="Any size" />
        </Field>
        <Field label="Revenue Range">
          <Select value={g('revenue_range')} onChange={v => onUpdate('revenue_range', v)} options={REVENUE} placeholder="Any revenue" />
        </Field>
        <Field label="Locations" description="State, metro, or region">
          <input className="fm-input" value={g('locations')} onChange={e => onUpdate('locations', e.target.value)} placeholder="e.g. Texas, Oklahoma, Midwest" />
        </Field>
        <Field label="Keywords">
          <input className="fm-input" value={g('keywords')} onChange={e => onUpdate('keywords', e.target.value)} placeholder="e.g. fleet management, logistics" />
        </Field>
        <Field label="Business Pain Points" description="Known challenges or needs">
          <input className="fm-input" value={g('pain_points')} onChange={e => onUpdate('pain_points', e.target.value)} placeholder="e.g. supply chain disruption, manual processes" />
        </Field>
        <Field label="Technologies">
          <input className="fm-input" value={g('technologies')} onChange={e => onUpdate('technologies', e.target.value)} placeholder="e.g. SAP, Salesforce" />
        </Field>
        <Field label="Buying Triggers" description="Events that create purchasing need">
          <input className="fm-input" value={g('buying_triggers')} onChange={e => onUpdate('buying_triggers', e.target.value)} placeholder="e.g. facility expansion, new leadership" />
        </Field>
        <Field label="Decision-Maker Titles">
          <input className="fm-input" value={g('decision_maker_titles')} onChange={e => onUpdate('decision_maker_titles', e.target.value)} placeholder="e.g. VP of Operations, CTO" />
        </Field>
        <Field label="Minimum Score Threshold">
          <input className="fm-input" type="number" min="0" max="100" value={g('min_score')} onChange={e => onUpdate('min_score', e.target.value)} placeholder="e.g. 65" />
        </Field>
        <Field label="Desired Result Count">
          <input className="fm-input" type="number" min="1" max="10" value={g('desired_count')} onChange={e => onUpdate('desired_count', e.target.value)} placeholder="5" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Include Specific Companies">
          <input className="fm-input" value={g('included_companies')} onChange={e => onUpdate('included_companies', e.target.value)} placeholder="Company names to include" />
        </Field>
        <Field label="Exclude Specific Companies">
          <input className="fm-input" value={g('excluded_companies')} onChange={e => onUpdate('excluded_companies', e.target.value)} placeholder="Company names to exclude" />
        </Field>
      </div>
    </div>
  )
}
