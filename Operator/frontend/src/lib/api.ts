async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }))
    throw Object.assign(new Error(err.error || 'Request failed'), { status: r.status, data: err })
  }
  return r.json()
}

const get = <T>(path: string) => req<T>('GET', path)
const post = <T>(path: string, body: unknown) => req<T>('POST', path, body)
const put = <T>(path: string, body: unknown) => req<T>('PUT', path, body)
const del = <T>(path: string) => req<T>('DELETE', path)

function qs(params: Record<string, string | number | boolean | undefined>) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const api = {
  dashboard: { get: () => get<DashboardData>('/dashboard') },

  brand: {
    get: () => get<BrandProfile>('/brand'),
    update: (data: Partial<BrandProfile>) => put<BrandProfile>('/brand', data),
  },

  campaigns: {
    list: (params?: Record<string, string>) => get<Campaign[]>(`/campaigns${params ? qs(params) : ''}`),
    get: (id: string) => get<Campaign>(`/campaigns/${id}`),
    create: (data: Partial<Campaign>) => post<Campaign>('/campaigns', data),
    update: (id: string, data: Partial<Campaign>) => put<Campaign>(`/campaigns/${id}`, data),
    delete: (id: string) => del<{ success: boolean }>(`/campaigns/${id}`),
  },

  contacts: {
    list: (params?: Record<string, string | number>) => get<ContactListResponse>(`/contacts${params ? qs(params as Record<string, string | number | boolean | undefined>) : ''}`),
    get: (id: string) => get<ContactDetail>(`/contacts/${id}`),
    create: (data: Partial<Contact>) => post<Contact>('/contacts', data),
    update: (id: string, data: Partial<Contact>) => put<Contact>(`/contacts/${id}`, data),
    delete: (id: string) => del<{ success: boolean }>(`/contacts/${id}`),
    seedDemo: () => post<{ count: number }>('/contacts/seed/demo', {}),
  },

  outreach: {
    list: (params?: Record<string, string | number>) => get<OutreachListResponse>(`/outreach${params ? qs(params as Record<string, string | number | boolean | undefined>) : ''}`),
    followUps: () => get<Contact[]>('/outreach/follow-ups'),
    create: (data: Partial<OutreachLog>) => post<OutreachLog>('/outreach', data),
    update: (id: string, data: Partial<OutreachLog>) => put<OutreachLog>(`/outreach/${id}`, data),
    delete: (id: string) => del<{ success: boolean }>(`/outreach/${id}`),
  },

  content: {
    list: (params?: Record<string, string>) => get<ContentAsset[]>(`/content${params ? qs(params) : ''}`),
    get: (id: string) => get<ContentAsset>(`/content/${id}`),
    create: (data: Partial<ContentAsset>) => post<ContentAsset>('/content', data),
    update: (id: string, data: Partial<ContentAsset>) => put<ContentAsset>(`/content/${id}`, data),
    delete: (id: string) => del<{ success: boolean }>(`/content/${id}`),
  },

  coverage: {
    list: (params?: Record<string, string>) => get<CoverageListResponse>(`/coverage${params ? qs(params) : ''}`),
    create: (data: Partial<CoverageLog>) => post<CoverageLog>('/coverage', data),
    update: (id: string, data: Partial<CoverageLog>) => put<CoverageLog>(`/coverage/${id}`, data),
    delete: (id: string) => del<{ success: boolean }>(`/coverage/${id}`),
  },

  investors: {
    list: (params?: Record<string, string>) => get<InvestorListResponse>(`/investors${params ? qs(params) : ''}`),
    get: (id: string) => get<InvestorRecord>(`/investors/${id}`),
    create: (data: Partial<InvestorRecord>) => post<InvestorRecord>('/investors', data),
    update: (id: string, data: Partial<InvestorRecord>) => put<InvestorRecord>(`/investors/${id}`, data),
    delete: (id: string) => del<{ success: boolean }>(`/investors/${id}`),
  },

  revenue: {
    list: (params?: Record<string, string>) => get<RevenueListResponse>(`/revenue${params ? qs(params) : ''}`),
    create: (data: Partial<RevenueEvent>) => post<RevenueEvent>('/revenue', data),
    update: (id: string, data: Partial<RevenueEvent>) => put<RevenueEvent>(`/revenue/${id}`, data),
    delete: (id: string) => del<{ success: boolean }>(`/revenue/${id}`),
  },

  agent: {
    context: () => get<Record<string, unknown>>('/agent/context'),
    tasks: {
      list: (params?: Record<string, string>) => get<AgentTask[]>(`/agent/tasks${params ? qs(params) : ''}`),
      create: (data: Partial<AgentTask>) => post<AgentTask>('/agent/tasks', data),
      update: (id: string, data: Partial<AgentTask>) => put<AgentTask>(`/agent/tasks/${id}`, data),
      delete: (id: string) => del<{ success: boolean }>(`/agent/tasks/${id}`),
    },
    plan: {
      get: (campaignId: string) => get<CampaignPlan | null>(`/agent/plan/${campaignId}`),
      save: (campaignId: string, data: Partial<CampaignPlan>) => post<CampaignPlan>(`/agent/plan/${campaignId}`, data),
    },
    log: {
      list: (params?: Record<string, string>) => get<AgentLogEntry[]>(`/agent/log${params ? qs(params) : ''}`),
      append: (data: Partial<AgentLogEntry>) => post<AgentLogEntry>('/agent/log', data),
    },
  },
}

// Types
export interface BrandProfile {
  id: string; company_name?: string; founder_name?: string; tagline?: string; mission?: string
  origin_story?: string; problem_statement?: string; solution_statement?: string; elevator_pitch?: string
  book_title?: string; book_subtitle?: string; book_description?: string; book_status?: string
  book_price?: number; book_link?: string
  primary_audiences?: string[]; key_differentiators?: string[]; proof_points?: string[]
  cta_investor?: string; cta_customer?: string; cta_reader?: string; website?: string; linkedin?: string
  updated_at: string
}

export interface Campaign {
  id: string; name: string; type: string; status: string; goal?: string
  target_audience?: string; budget?: number; start_date?: string; end_date?: string
  description?: string; notes?: string; created_at: string; updated_at: string
  outreach_count?: number; asset_count?: number
}

export interface Contact {
  id: string; name: string; type: string; audience_segment?: string
  organization?: string; title?: string; email?: string; phone?: string
  website?: string; location?: string; status: string
  last_contacted?: string; next_follow_up?: string; notes?: string
  is_demo?: number; created_at: string; updated_at: string
}

export interface ContactDetail extends Contact {
  outreach: OutreachLog[]; investor?: InvestorRecord; coverage: CoverageLog[]
}

export interface ContactListResponse { data: Contact[]; total: number; page: number }

export interface OutreachLog {
  id: string; contact_id: string; campaign_id?: string; channel: string; direction: string
  subject?: string; body_preview?: string; outcome: string; follow_up_date?: string
  notes?: string; sent_at: string; created_at: string
  contact_name?: string; contact_type?: string; organization?: string; campaign_name?: string
}

export interface OutreachListResponse { data: OutreachLog[]; total: number; page: number }

export interface ContentAsset {
  id: string; title: string; type: string; audience: string
  content?: string; notes?: string; is_approved: number; campaign_id?: string
  created_at: string; updated_at: string
}

export interface CoverageLog {
  id: string; contact_id?: string; type: string; outlet_name?: string; headline?: string
  url?: string; reach_estimate?: number; sentiment: string; published_date?: string
  notes?: string; created_at: string; contact_name?: string; organization?: string
}

export interface CoverageListResponse { data: CoverageLog[]; totals: { count: number; total_reach: number } }

export interface InvestorRecord {
  id: string; contact_id: string; stage: string; ask_amount?: number; committed_amount?: number
  last_activity?: string; next_action?: string; next_action_date?: string; notes?: string
  created_at: string; updated_at: string
  name?: string; organization?: string; email?: string; phone?: string
  location?: string; audience_segment?: string; contact_notes?: string
}

export interface InvestorListResponse { data: InvestorRecord[]; summary: { stage: string; count: number; ask_total: number; committed_total: number }[] }

export interface RevenueEvent {
  id: string; type: string; amount: number; quantity: number
  contact_id?: string; campaign_id?: string; description?: string
  event_date: string; created_at: string
  contact_name?: string; campaign_name?: string
}

export interface RevenueListResponse { data: RevenueEvent[]; summary: { type: string; count: number; total: number; units: number }[]; grand_total: number }

export interface AgentTask {
  id: string; title: string; description?: string; type: string
  assigned_to: string; priority: string; status: string
  due_date?: string; campaign_id?: string; contact_id?: string; milestone_id?: string
  result?: string; created_by: string; created_at: string; updated_at: string
  campaign_name?: string; contact_name?: string
}

export interface CampaignMilestone {
  id: string; phase_id: string; name: string; description?: string
  due_date?: string; status: string; notes?: string; created_at: string
}

export interface CampaignPhase {
  id: string; plan_id: string; name: string; description?: string
  start_date?: string; end_date?: string; order_index: number; status: string
  milestones: CampaignMilestone[]
}

export interface CampaignPlan {
  id: string; campaign_id: string; summary?: string; goal?: string; strategy?: string
  created_by: string; created_at: string; updated_at: string
  phases: CampaignPhase[]
}

export interface AgentLogEntry {
  id: string; agent_name: string; action: string; details?: string
  campaign_id?: string; task_id?: string; created_at: string
  campaign_name?: string
}

export interface DashboardData {
  brand: { company_name?: string; founder_name?: string; tagline?: string; mission?: string }
  kpis: {
    total_contacts: number; warm_contacts: number; active_contacts: number
    active_campaigns: number; total_campaigns: number
    outreach_7d: number; outreach_total: number; response_count: number
    coverage_count: number; total_reach: number
    total_revenue: number; book_revenue: number
    total_committed: number; total_ask: number
    active_investor_conversations: number; total_investors: number
    follow_ups_due: number
  }
  recent_outreach: OutreachLog[]
  recent_coverage: CoverageLog[]
  upcoming_follow_ups: Contact[]
  investor_pipeline: { stage: string; count: number }[]
}
