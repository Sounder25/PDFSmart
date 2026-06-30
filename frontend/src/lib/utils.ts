import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'
import type { MarketMode, ScoreClassification, TargetStatus, ConfidenceLevel, DataClassification } from '../types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value?: number | null, compact = false): string {
  if (value == null) return '—'
  if (compact) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export function formatDate(dateStr?: string | null, relative = false): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (relative) return formatDistanceToNow(d, { addSuffix: true })
    return format(d, 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try { return format(new Date(dateStr), 'MMM d, yyyy h:mm a') } catch { return dateStr }
}

export const MARKET_MODE_LABELS: Record<MarketMode, string> = {
  commercial: 'Commercial',
  government: 'Government',
  private_client: 'Private Client',
  partner: 'Partner',
  stakeholder: 'Stakeholder',
}

export const MARKET_MODE_COLORS: Record<MarketMode, string> = {
  commercial: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  government: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  private_client: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  partner: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  stakeholder: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

export const STATUS_LABELS: Record<TargetStatus, string> = {
  new: 'New',
  researching: 'Researching',
  qualified: 'Qualified',
  active: 'Active',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
  inactive: 'Inactive',
  disqualified: 'Disqualified',
}

export const STATUS_COLORS: Record<TargetStatus, string> = {
  new: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  researching: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  qualified: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  active: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  proposal: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  won: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  lost: 'bg-red-500/20 text-red-300 border-red-500/30',
  inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  disqualified: 'bg-red-900/20 text-red-400 border-red-900/30',
}

export const SCORE_COLORS: Record<ScoreClassification, string> = {
  priority: 'text-emerald-400',
  strong: 'text-teal-400',
  possible: 'text-amber-400',
  low_priority: 'text-slate-400',
}

export const SCORE_BG: Record<ScoreClassification, string> = {
  priority: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  strong: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  possible: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  low_priority: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

export const SCORE_LABELS: Record<ScoreClassification, string> = {
  priority: 'Priority',
  strong: 'Strong',
  possible: 'Possible',
  low_priority: 'Low Priority',
}

export const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  low: 'text-red-400',
  medium: 'text-amber-400',
  high: 'text-teal-400',
  verified: 'text-emerald-400',
}

export const CLASSIFICATION_COLORS: Record<DataClassification, string> = {
  verified: 'bg-emerald-500/20 text-emerald-300',
  sourced: 'bg-teal-500/20 text-teal-300',
  inferred: 'bg-amber-500/20 text-amber-300',
  user_provided: 'bg-blue-500/20 text-blue-300',
  simulated: 'bg-purple-500/20 text-purple-300',
  unknown: 'bg-slate-500/20 text-slate-400',
}

export function scoreToClassification(score?: number): ScoreClassification {
  if (!score) return 'low_priority'
  if (score >= 85) return 'priority'
  if (score >= 70) return 'strong'
  if (score >= 55) return 'possible'
  return 'low_priority'
}

export function truncate(str: string, maxLen = 80): string {
  if (!str || str.length <= maxLen) return str
  return str.slice(0, maxLen) + '…'
}

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  company: 'Company',
  government_agency: 'Gov. Agency',
  government_program: 'Gov. Program',
  contracting_office: 'Contracting Office',
  public_opportunity: 'Public Opportunity',
  individual: 'Individual',
  property: 'Property',
  nonprofit: 'Nonprofit',
  university: 'University',
  association: 'Association',
  prime_contractor: 'Prime Contractor',
  subcontractor: 'Subcontractor',
  champion: 'Champion',
  referral_source: 'Referral Source',
  regulatory_body: 'Regulatory Body',
}

export const ALL_STATUSES: TargetStatus[] = ['new','researching','qualified','active','proposal','won','lost','inactive','disqualified']
export const ALL_MARKET_MODES: MarketMode[] = ['commercial','government','private_client','partner','stakeholder']
