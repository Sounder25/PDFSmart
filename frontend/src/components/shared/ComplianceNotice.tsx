import { ShieldCheck } from 'lucide-react'
import type { MarketMode } from '@/types'

const NOTICES: Record<MarketMode, { title: string; items: string[] }> = {
  commercial: {
    title: 'Commercial Outreach Compliance',
    items: [
      'Ensure outreach complies with CAN-SPAM requirements (unsubscribe mechanism, physical address).',
      'Review applicable state privacy laws before using prospect data.',
      'Only use publicly available data in accordance with responsible data-use principles.',
      'Respect platform terms of service for any channel used (LinkedIn, email providers, etc.).',
    ],
  },
  government: {
    title: 'Government Engagement Compliance',
    items: [
      'Procurement integrity laws prohibit unauthorized disclosure of proposal or bid information.',
      'Agency ethics rules may restrict gifts, entertainment, and personal communications with officials.',
      'If engaging legislators or their staff, review applicable lobbying disclosure requirements.',
      'Do not misrepresent your organization\'s eligibility, certifications, or past performance.',
      'Follow agency-specific communication protocols for pre-solicitation contact.',
    ],
  },
  private_client: {
    title: 'Private Client Contact Compliance',
    items: [
      'Obtain appropriate consent before initiating direct marketing communications.',
      'TCPA requires prior express written consent for autodialed or prerecorded calls/texts to mobile phones.',
      'Honor Do Not Call registry obligations for phone outreach.',
      'Disclose the commercial nature of your contact in all initial communications.',
      'Respect stated communication preferences and opt-out requests promptly.',
    ],
  },
  partner: {
    title: 'Partner & Alliance Compliance',
    items: [
      'Disclose any conflicts of interest to prospective partners.',
      'Be transparent about your organization\'s representation and authority.',
      'Do not claim endorsements or affiliations that have not been formally established.',
      'Review teaming agreement requirements before any joint-pursuit commitments.',
    ],
  },
  stakeholder: {
    title: 'Stakeholder Engagement Compliance',
    items: [
      'If engaging legislators, staff, or regulators, understand applicable lobbying disclosure thresholds.',
      'Be transparent about the organization and interests you represent.',
      'Do not claim false endorsements from stakeholders or imply unearned support.',
      'Conflict-of-interest policies may apply when engaging advisory or oversight stakeholders.',
    ],
  },
}

export function ComplianceNotice({ marketMode }: { marketMode: MarketMode }) {
  const notice = NOTICES[marketMode]
  if (!notice) return null
  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-teal-400" />
        <span className="text-xs font-semibold text-teal-300">{notice.title}</span>
      </div>
      <ul className="space-y-1.5">
        {notice.items.map((item, i) => (
          <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-600 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
