export type MarketMode = 'commercial' | 'government' | 'private_client' | 'partner' | 'stakeholder'
export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'verified'
export type VerificationStatus = 'unverified' | 'partial' | 'sourced' | 'verified'
export type DataClassification = 'verified' | 'sourced' | 'inferred' | 'user_provided' | 'simulated' | 'unknown'
export type ScoreClassification = 'priority' | 'strong' | 'possible' | 'low_priority'

export type TargetStatus =
  | 'new' | 'researching' | 'qualified' | 'active'
  | 'proposal' | 'won' | 'lost' | 'inactive' | 'disqualified'

export type OpportunityStage =
  | 'identified' | 'qualifying' | 'proposal'
  | 'negotiation' | 'closed_won' | 'closed_lost'

export type ActivityType =
  | 'note' | 'email' | 'call' | 'meeting' | 'research'
  | 'enrichment' | 'status_change' | 'message_sent' | 'import' | 'system'

export interface Tag {
  id: string
  name: string
  color: string
  usage_count?: number
  created_at: string
}

export interface TargetEntity {
  id: string
  market_mode: MarketMode
  entity_type: string
  name: string
  description?: string
  website?: string
  domain?: string
  primary_location?: string
  service_area?: string
  status: TargetStatus
  estimated_value?: number
  confidence_level: ConfidenceLevel
  verification_status: VerificationStatus
  is_demo: number | boolean
  tags_json: string
  industry?: string
  subindustry?: string
  naics_code?: string
  psc_code?: string
  fiscal_year?: string
  acquisition_path?: string
  set_aside_type?: string
  opportunity_type?: string
  priority_rank?: number
  created_at: string
  updated_at: string
  last_enriched_at?: string
  // Joined fields
  score?: number
  score_classification?: ScoreClassification
  primary_contact_title?: string
  primary_contact_name?: string
  last_activity_at?: string
  tags?: Tag[]
}

export interface Contact {
  id: string
  target_entity_id: string
  name?: string
  title?: string
  department?: string
  role_type: string
  email?: string
  phone?: string
  linkedin_url?: string
  public_contact_path?: string
  confidence_level: ConfidenceLevel
  verification_status: VerificationStatus
  is_primary: number | boolean
  is_recommended_role: number | boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface Opportunity {
  id: string
  target_entity_id: string
  opportunity_type: string
  title: string
  description?: string
  estimated_value?: number
  probability: number
  stage: OpportunityStage
  acquisition_path?: string
  funding_source?: string
  expected_decision_date?: string
  fiscal_year?: string
  created_at: string
  updated_at: string
}

export interface ResearchClaim {
  id: string
  target_entity_id: string
  claim_type: string
  claim_text: string
  classification: DataClassification
  confidence_level: ConfidenceLevel
  verification_status: string
  created_at: string
  updated_at: string
  sources?: ResearchSource[]
}

export interface ResearchSource {
  id: string
  research_claim_id: string
  source_name: string
  source_url?: string
  publisher?: string
  published_date?: string
  retrieved_date?: string
  source_type?: string
  source_quality?: string
  summary?: string
  created_at: string
}

export interface ScoreRecord {
  id: string
  target_entity_id: string
  scoring_model: string
  total_score: number
  score_classification: ScoreClassification
  confidence_level: ConfidenceLevel
  calculated_at: string
  dimensions?: ScoreDimension[]
}

export interface ScoreDimension {
  id: string
  score_record_id: string
  dimension_name: string
  points_earned: number
  maximum_points: number
  explanation?: string
  supporting_claim_ids?: string
  confidence_level: ConfidenceLevel
  missing_data_penalty: number
}

export interface Activity {
  id: string
  target_entity_id: string
  activity_type: ActivityType
  channel?: string
  description: string
  outcome?: string
  performed_by?: string
  created_at: string
  // Joined
  target_name?: string
  market_mode?: MarketMode
}

export interface Note {
  id: string
  target_entity_id: string
  body: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  target_entity_id?: string
  channel: string
  tone: string
  subject?: string
  body: string
  status: string
  variant?: string
  created_at: string
  sent_at?: string
}

export interface SavedResearchProfile {
  id: string
  name: string
  market_mode: MarketMode
  criteria_json: string
  criteria?: Record<string, unknown>
  is_default: number | boolean
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface DashboardData {
  kpis: {
    total_targets: number
    new_this_month: number
    active_opportunities: number
    outreach_sent: number
    qualified_count: number
    pipeline_value: number
  }
  market_distribution: { market_mode: string; count: number }[]
  status_distribution: { status: string; count: number }[]
  stage_distribution: { stage: string; count: number; value: number }[]
  high_priority_targets: TargetEntity[]
  needs_enrichment: TargetEntity[]
  recent_activity: Activity[]
  recommendations: { type: string; priority: string; title: string; body: string }[]
  data_quality_warnings: { type: string; message: string }[]
}
