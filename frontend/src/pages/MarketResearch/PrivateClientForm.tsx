interface FormProps { criteria: Record<string, unknown>; onUpdate: (f: string, v: unknown) => void }
function F({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return <div><label className="fm-label">{label}</label>{description && <p className="text-[10px] text-slate-500 mb-1.5">{description}</p>}{children}</div>
}
const CUSTOMER_TYPES = ['Individual Landowner','Farmer / Rancher','Property Manager','Absentee Landowner','Rural Resident','Urban Homeowner','Business Owner']
const PROPERTY_TYPES = ['Rangeland','Row Crop','Pasture','Timber','Mixed Use','Residential','Commercial Property']
const LAND_USES = ['Cattle Grazing','Row Crop Production','Hay Production','Conservation','Hunting & Recreation','Timber Harvest','Idle / Fallow']
const URGENCY = ['Immediate','This Season','Within 6 Months','Within a Year','No Set Timeline']
const CHANNELS = ['Phone','Email','Direct Mail','In Person','Referral','Text']
const CONSENT = ['Confirmed Consent','Referral Introduction','Public Solicitation','Not Yet Determined']
export function PrivateClientForm({ criteria, onUpdate }: FormProps) {
  const g = (k: string) => (criteria[k] as string) || ''
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-100 mb-1">Private Client Research Criteria</h3>
      <div className="grid grid-cols-2 gap-3">
        <F label="Service Location" description="City, county, or zip codes"><input className="fm-input" value={g('service_location')} onChange={e => onUpdate('service_location', e.target.value)} placeholder="e.g. Kerr County, TX" /></F>
        <F label="Service Radius"><input className="fm-input" value={g('radius')} onChange={e => onUpdate('radius', e.target.value)} placeholder="e.g. 50 miles from Kerrville, TX" /></F>
        <F label="Customer Type"><select className="fm-input" value={g('customer_type')} onChange={e => onUpdate('customer_type', e.target.value)}><option value="">Any</option>{CUSTOMER_TYPES.map(t => <option key={t}>{t}</option>)}</select></F>
        <F label="Property Type"><select className="fm-input" value={g('property_type')} onChange={e => onUpdate('property_type', e.target.value)}><option value="">Any</option>{PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}</select></F>
        <F label="Acreage Range"><input className="fm-input" value={g('acreage')} onChange={e => onUpdate('acreage', e.target.value)} placeholder="e.g. 100–1000 acres" /></F>
        <F label="Land Use / Operation Type"><select className="fm-input" value={g('land_use')} onChange={e => onUpdate('land_use', e.target.value)}><option value="">Any</option>{LAND_USES.map(l => <option key={l}>{l}</option>)}</select></F>
        <F label="Problem / Service Need" description="What problem are they experiencing?"><input className="fm-input" value={g('problem')} onChange={e => onUpdate('problem', e.target.value)} placeholder="e.g. pasture restoration, brush control" /></F>
        <F label="Urgency Level"><select className="fm-input" value={g('urgency')} onChange={e => onUpdate('urgency', e.target.value)}><option value="">Any</option>{URGENCY.map(u => <option key={u}>{u}</option>)}</select></F>
        <F label="Estimated Budget"><input className="fm-input" value={g('budget')} onChange={e => onUpdate('budget', e.target.value)} placeholder="e.g. $5,000–$25,000" /></F>
        <F label="Referral Source"><input className="fm-input" value={g('referral_source')} onChange={e => onUpdate('referral_source', e.target.value)} placeholder="e.g. Extension Agent, Veterinarian" /></F>
        <F label="Preferred Contact Channel"><select className="fm-input" value={g('channel')} onChange={e => onUpdate('channel', e.target.value)}><option value="">Any</option>{CHANNELS.map(c => <option key={c}>{c}</option>)}</select></F>
        <F label="Consent Status" description="Contact consent basis"><select className="fm-input" value={g('consent')} onChange={e => onUpdate('consent', e.target.value)}><option value="">Not specified</option>{CONSENT.map(c => <option key={c}>{c}</option>)}</select></F>
        <F label="Minimum Score"><input className="fm-input" type="number" min="0" max="100" value={g('min_score')} onChange={e => onUpdate('min_score', e.target.value)} placeholder="e.g. 60" /></F>
        <F label="Desired Result Count"><input className="fm-input" type="number" min="1" max="10" value={g('desired_count')} onChange={e => onUpdate('desired_count', e.target.value)} placeholder="5" /></F>
      </div>
    </div>
  )
}
