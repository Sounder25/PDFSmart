import type { ResearchType } from '@/types'

const SIGNAL_TYPES = [
  { value: 'drought_monitor', label: 'Drought Monitor' },
  { value: 'usda_report', label: 'USDA Report' },
  { value: 'fsa_announcement', label: 'FSA Announcement' },
  { value: 'nrcs_program', label: 'NRCS Program' },
  { value: 'market_price_alert', label: 'Market Price Alert' },
  { value: 'weather_event', label: 'Weather Event' },
  { value: 'pest_disease', label: 'Pest / Disease' },
  { value: 'regulatory_change', label: 'Regulatory Change' },
  { value: 'funding_announcement', label: 'Funding Announcement' },
  { value: 'contract_solicitation', label: 'Contract Solicitation' },
  { value: 'grant_opportunity', label: 'Grant Opportunity' },
  { value: 'conference_event', label: 'Conference / Event' },
  { value: 'industry_trend', label: 'Industry Trend' },
  { value: 'county_initiative', label: 'County Initiative' },
  { value: 'state_program', label: 'State Program' },
  { value: 'other', label: 'Other' },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY'
]

interface Props {
  criteria: Record<string, unknown>
  onUpdate: (field: string, value: unknown) => void
}

export const RESEARCH_TYPE_LABELS: Record<ResearchType, string> = {
  target_discovery: 'Target Discovery',
  ecosystem_signal: 'Ecosystem Signal',
  county_development: 'County Development',
  state_agency_development: 'State Agency Development',
  funding_opportunity: 'Funding Opportunity',
  contract_opportunity: 'Contract Opportunity',
  speaking_opportunity: 'Speaking Opportunity',
  industry_partner_opportunity: 'Industry / Partner Opportunity',
}

export function EcosystemSignalForm({ criteria, onUpdate }: Props) {
  const counties = (criteria.counties as string[]) || []
  const signalTypes = (criteria.signal_types as string[]) || []

  const toggleSignalType = (type: string) => {
    const next = signalTypes.includes(type)
      ? signalTypes.filter(t => t !== type)
      : [...signalTypes, type]
    onUpdate('signal_types', next)
  }

  const toggleCounty = (county: string) => {
    const clean = county.trim()
    if (!clean) return
    if (!counties.includes(clean)) onUpdate('counties', [...counties, clean])
  }

  const removeCounty = (county: string) => {
    onUpdate('counties', counties.filter(c => c !== county))
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-[#243044] pb-4 mb-4">
        <h3 className="text-sm font-semibold text-teal-400 mb-1">Agricultural Ecosystem Signal Research</h3>
        <p className="text-xs text-slate-500">Search for drought alerts, USDA announcements, funding opportunities, market conditions, and other signals relevant to your agricultural markets.</p>
      </div>

      {/* Topic / Keyword */}
      <div>
        <label className="fm-label">Topic or Keyword</label>
        <input
          className="fm-input"
          placeholder="e.g. drought, EQIP signup, fall armyworm, cattle prices"
          value={(criteria.topic as string) || ''}
          onChange={e => onUpdate('topic', e.target.value)}
        />
      </div>

      {/* Signal Types */}
      <div>
        <label className="fm-label">Signal Types <span className="text-slate-500 font-normal">(select all that apply)</span></label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {SIGNAL_TYPES.map(st => (
            <button
              key={st.value}
              onClick={() => toggleSignalType(st.value)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                signalTypes.includes(st.value)
                  ? 'bg-teal-600/20 border-teal-500 text-teal-300'
                  : 'border-[#334155] text-slate-400 hover:border-teal-500/50 hover:text-slate-300'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* State */}
      <div>
        <label className="fm-label">State</label>
        <select
          className="fm-input"
          value={(criteria.state as string) || ''}
          onChange={e => onUpdate('state', e.target.value)}
        >
          <option value="">All States</option>
          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Counties */}
      <div>
        <label className="fm-label">Counties <span className="text-slate-500 font-normal">(optional)</span></label>
        <div className="flex gap-2">
          <input
            className="fm-input"
            placeholder="Type county name and press Enter"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                toggleCounty((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = ''
              }
            }}
          />
        </div>
        {counties.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {counties.map(c => (
              <span key={c} className="inline-flex items-center gap-1 text-xs bg-blue-900/30 text-blue-300 border border-blue-700/30 px-2 py-0.5 rounded">
                {c}
                <button onClick={() => removeCounty(c)} className="text-blue-400 hover:text-blue-200">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Industry / Commodity */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="fm-label">Industry / Commodity</label>
          <select
            className="fm-input"
            value={(criteria.industry as string) || ''}
            onChange={e => onUpdate('industry', e.target.value)}
          >
            <option value="">Any</option>
            <option value="Cattle / Beef">Cattle / Beef</option>
            <option value="Row Crops">Row Crops</option>
            <option value="Small Grains">Small Grains</option>
            <option value="Specialty Crops">Specialty Crops</option>
            <option value="Swine">Swine</option>
            <option value="Poultry">Poultry</option>
            <option value="Dairy">Dairy</option>
            <option value="Aquaculture">Aquaculture</option>
            <option value="Forestry">Forestry</option>
            <option value="Horticulture">Horticulture</option>
            <option value="General Agriculture">General Agriculture</option>
          </select>
        </div>
        <div>
          <label className="fm-label">Species / Crop <span className="text-slate-500 font-normal">(optional)</span></label>
          <input
            className="fm-input"
            placeholder="e.g. corn, Angus cattle, wheat"
            value={(criteria.species as string) || ''}
            onChange={e => onUpdate('species', e.target.value)}
          />
        </div>
      </div>

      {/* Severity / Urgency */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="fm-label">Minimum Severity</label>
          <select
            className="fm-input"
            value={(criteria.min_severity as string) || ''}
            onChange={e => onUpdate('min_severity', e.target.value)}
          >
            <option value="">Any</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="fm-label">Minimum Urgency</label>
          <select
            className="fm-input"
            value={(criteria.min_urgency as string) || ''}
            onChange={e => onUpdate('min_urgency', e.target.value)}
          >
            <option value="">Any</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="immediate">Immediate</option>
          </select>
        </div>
      </div>

      {/* Implication filters */}
      <div>
        <label className="fm-label">Require Implications</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {[
            { key: 'require_funding', label: 'Funding Implication' },
            { key: 'require_contract', label: 'Contract Implication' },
            { key: 'require_marketing', label: 'Marketing Implication' },
            { key: 'require_operational', label: 'Operational Implication' },
          ].map(item => (
            <label key={item.key} className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={!!(criteria[item.key])}
                onChange={e => onUpdate(item.key, e.target.checked)}
                className="rounded"
              />
              {item.label}
            </label>
          ))}
        </div>
      </div>

      {/* Count */}
      <div>
        <label className="fm-label">Result Count</label>
        <select
          className="fm-input"
          value={(criteria.desired_count as number) || 3}
          onChange={e => onUpdate('desired_count', parseInt(e.target.value))}
        >
          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} signal{n > 1 ? 's' : ''}</option>)}
        </select>
      </div>
    </div>
  )
}
