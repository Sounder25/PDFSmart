export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(v?: number | null, compact = false) {
  if (v == null || isNaN(v)) return '—'
  if (compact && v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (compact && v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

export function formatDate(d?: string | null, short = false) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  if (short) return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function timeAgo(d?: string | null) {
  if (!d) return '—'
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(d, true)
}

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  investor: 'Investor', media: 'Media / Press', customer: 'Customer',
  official: 'Government Official', partner: 'Partner / Ally',
  reader: 'Reader', influencer: 'Influencer', general: 'General',
}

export const CONTACT_TYPE_COLORS: Record<string, string> = {
  investor: 'text-brand-300 bg-brand-900/20 border-brand-700/40',
  media: 'text-purple-300 bg-purple-900/20 border-purple-700/40',
  customer: 'text-teal-300 bg-teal-900/20 border-teal-700/40',
  official: 'text-blue-300 bg-blue-900/20 border-blue-700/40',
  partner: 'text-green-300 bg-green-900/20 border-green-700/40',
  reader: 'text-slate-300 bg-slate-800/40 border-slate-700/40',
  influencer: 'text-pink-300 bg-pink-900/20 border-pink-700/40',
  general: 'text-slate-400 bg-slate-800/30 border-slate-700/30',
}

export const CONTACT_STATUS_COLORS: Record<string, string> = {
  cold: 'text-slate-400 bg-slate-800/30 border-slate-700/30',
  warm: 'text-amber-300 bg-amber-900/20 border-amber-700/40',
  active: 'text-green-300 bg-green-900/20 border-green-700/40',
  won: 'text-teal-300 bg-teal-900/20 border-teal-700/40',
  lost: 'text-red-400 bg-red-900/20 border-red-700/40',
}

export const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  book_launch: 'Book Launch', investor_round: 'Investor Round',
  brand_awareness: 'Brand Awareness', farmer_outreach: 'Farmer Outreach',
  government_outreach: 'Gov / Policy', media_push: 'Media Push',
  customer_acquisition: 'Customer Acquisition', speaking: 'Speaking & Events', general: 'General',
}

export const CAMPAIGN_TYPE_COLORS: Record<string, string> = {
  book_launch: 'text-brand-300 bg-brand-900/20 border-brand-700/40',
  investor_round: 'text-emerald-300 bg-emerald-900/20 border-emerald-700/40',
  brand_awareness: 'text-purple-300 bg-purple-900/20 border-purple-700/40',
  farmer_outreach: 'text-teal-300 bg-teal-900/20 border-teal-700/40',
  government_outreach: 'text-blue-300 bg-blue-900/20 border-blue-700/40',
  media_push: 'text-pink-300 bg-pink-900/20 border-pink-700/40',
  customer_acquisition: 'text-cyan-300 bg-cyan-900/20 border-cyan-700/40',
  speaking: 'text-amber-300 bg-amber-900/20 border-amber-700/40',
  general: 'text-slate-400 bg-slate-800/30 border-slate-700/30',
}

export const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  planning: 'text-slate-400 bg-slate-800/30 border-slate-700/30',
  active: 'text-green-300 bg-green-900/20 border-green-700/40',
  paused: 'text-amber-300 bg-amber-900/20 border-amber-700/40',
  completed: 'text-blue-300 bg-blue-900/20 border-blue-700/40',
  archived: 'text-slate-500 bg-slate-900/20 border-slate-800/30',
}

export const INVESTOR_STAGE_LABELS: Record<string, string> = {
  identified: 'Identified', introduced: 'Introduced', pitch_sent: 'Pitch Sent',
  meeting_scheduled: 'Meeting Scheduled', follow_up: 'Following Up',
  due_diligence: 'Due Diligence', committed: 'Committed', closed: 'Closed', passed: 'Passed',
}

export const INVESTOR_STAGE_COLORS: Record<string, string> = {
  identified: 'text-slate-400', introduced: 'text-blue-400', pitch_sent: 'text-purple-400',
  meeting_scheduled: 'text-brand-400', follow_up: 'text-amber-400',
  due_diligence: 'text-teal-400', committed: 'text-green-400', closed: 'text-emerald-400', passed: 'text-red-400',
}

export const OUTCOME_COLORS: Record<string, string> = {
  pending: 'text-slate-500', no_response: 'text-slate-500',
  responded: 'text-blue-400', interested: 'text-brand-400',
  meeting_booked: 'text-green-400', declined: 'text-red-400',
  coverage_secured: 'text-purple-400',
}

export const CHANNEL_ICONS: Record<string, string> = {
  email: '✉', phone: '📞', linkedin: '💼', in_person: '🤝',
  event: '🎤', social: '📱', podcast_pitch: '🎤️', press_pitch: '📰',
}

export const REVENUE_TYPE_LABELS: Record<string, string> = {
  book_sale: 'Book Sale', bulk_book_order: 'Bulk Book Order',
  speaking_fee: 'Speaking Fee', partnership: 'Partnership',
  consulting: 'Consulting', investment_received: 'Investment Received',
}

export const SEGMENT_LABELS: Record<string, string> = {
  farmer: 'Farmer', rancher: 'Rancher', land_manager: 'Land Manager',
  city_official: 'City Official', county_official: 'County Official',
  state_official: 'State Official', journalist: 'Journalist',
  podcaster: 'Podcaster', vc: 'VC', angel: 'Angel Investor',
  family_office: 'Family Office', general: 'General',
}
