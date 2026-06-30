export type MarketMode = 'commercial' | 'government' | 'private_client' | 'partner' | 'stakeholder'

export type AgriEntityType =
  | 'county' | 'state_agency' | 'local_agency' | 'government_program'
  | 'funding_program' | 'procurement_opportunity' | 'industry_association'
  | 'university' | 'extension_office' | 'livestock_organization'
  | 'media_outlet' | 'conference' | 'event_organizer'

export type DevelopmentType =
  | 'Commercial Account' | 'County Account' | 'State Account'
  | 'Funding Source' | 'Contract Buyer' | 'Partner'
  | 'Stakeholder' | 'Media' | 'Speaking Platform'

export type ResearchType =
  | 'target_discovery' | 'ecosystem_signal' | 'county_development'
  | 'state_agency_development' | 'funding_opportunity' | 'contract_opportunity'
  | 'speaking_opportunity' | 'industry_partner_opportunity'

export type SignalType =
  | 'drought_monitor' | 'usda_report' | 'fsa_announcement' | 'nrcs_program'
  | 'market_price_alert' | 'weather_event' | 'pest_disease' | 'regulatory_change'
  | 'funding_announcement' | 'contract_solicitation' | 'grant_opportunity'
  | 'conference_event' | 'industry_trend' | 'county_initiative' | 'state_program' | 'other'

export type SignalStatus = 'new' | 'reviewed' | 'actioned' | 'archived'
export type SignalSeverity = 'low' | 'medium' | 'high' | 'critical'
export type SignalUrgency = 'low' | 'medium' | 'high' | 'immediate'

export type ExtractionApprovalStatus = 'pending' | 'approved' | 'rejected'
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
  development_type?: DevelopmentType
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
  agricultural_intelligence?: AgriculturalIntelligence
}

export interface AgriculturalIntelligence {
  new_signals: number
  high_priority_signals: number
  signals_without_action: number
  campaigns_from_signals: number
  priority_counties: { primary_location: string; target_count: number }[]
  priority_state_agencies: { name: string; primary_location: string; status: string }[]
  funding_opportunities: number
  contract_opportunities: number
  recent_signals: EcosystemSignal[]
}

export interface EcosystemSignal {
  id: string
  target_entity_id?: string
  topic: string
  signal_type: SignalType
  state?: string
  counties: string[]
  counties_json?: string
  industry?: string
  species?: string
  severity: SignalSeverity
  urgency: SignalUrgency
  source?: string
  published_date?: string
  operational_implication?: string
  funding_implication?: string
  contract_implication?: string
  marketing_implication?: string
  status: SignalStatus
  is_demo: number | boolean
  created_at: string
  updated_at: string
}

export interface BusinessDocument {
  id: string
  filename: string
  original_name: string
  file_type: string
  file_size?: number
  description?: string
  extraction_status: 'pending' | 'extracted' | 'reviewed' | 'archived'
  uploaded_at: string
}

export interface DocumentExtraction {
  id: string
  document_id: string
  document_name?: string
  extraction_type: string
  extracted_text: string
  source_page?: string
  source_section?: string
  classification: string
  readiness_status: string
  marketing_approval: number | boolean
  qualification_required: number | boolean
  allowed_channels: string[]
  prohibited_contexts: string[]
  profile_field?: string
  approval_status: ExtractionApprovalStatus
  approved_at?: string
  extracted_at: string
}

export interface BusinessProfile {
  id: string
  business_name?: string
  description?: string
  mission?: string
  products: string[]
  services: string[]
  capabilities: string[]
  target_customers: string[]
  target_industries: string[]
  geographic_markets: string[]
  pricing_notes?: string
  differentiators: string[]
  proof_points: string[]
  team_qualifications?: string
  procurement_readiness?: string
  funding_readiness?: string
  approved_claims: string[]
  restricted_claims: string[]
  calls_to_action: string[]
  updated_at: string
}
