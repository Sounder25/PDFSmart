const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw Object.assign(new Error(err.error || 'Request failed'), { status: res.status, data: err })
  }
  return res.json()
}

export const api = {
  // Targets
  targets: {
    list: (params?: Record<string, string | number | boolean>) => {
      const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
      return request<import('../types').PaginatedResponse<import('../types').TargetEntity>>(`/targets${qs}`)
    },
    get: (id: string) => request<import('../types').TargetEntity>(`/targets/${id}`),
    create: (data: Partial<import('../types').TargetEntity>) => request(`/targets`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import('../types').TargetEntity>) => request(`/targets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/targets/${id}`, { method: 'DELETE' }),
    bulkDelete: (ids: string[]) => request(`/targets/bulk/delete`, { method: 'POST', body: JSON.stringify({ ids }) }),
    bulkStatus: (ids: string[], status: string) => request(`/targets/bulk/status`, { method: 'POST', body: JSON.stringify({ ids, status }) }),
    bulkTags: (ids: string[], tag_ids: string[], action: 'add' | 'remove' = 'add') =>
      request(`/targets/bulk/tags`, { method: 'POST', body: JSON.stringify({ ids, tag_ids, action }) }),
    exportCsv: () => fetch(`${BASE}/targets/export/csv`).then(r => r.blob()),
  },

  // Contacts
  contacts: {
    list: (targetEntityId: string) => request<import('../types').Contact[]>(`/contacts?target_entity_id=${targetEntityId}`),
    create: (data: Partial<import('../types').Contact>) => request(`/contacts`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import('../types').Contact>) => request(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/contacts/${id}`, { method: 'DELETE' }),
  },

  // Opportunities
  opportunities: {
    list: (targetEntityId?: string, stage?: string) => {
      const qs = [targetEntityId && `target_entity_id=${targetEntityId}`, stage && `stage=${stage}`].filter(Boolean).join('&')
      return request<import('../types').Opportunity[]>(`/opportunities${qs ? '?' + qs : ''}`)
    },
    create: (data: Partial<import('../types').Opportunity>) => request(`/opportunities`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import('../types').Opportunity>) => request(`/opportunities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/opportunities/${id}`, { method: 'DELETE' }),
  },

  // Activities
  activities: {
    list: (targetEntityId?: string, limit = 50) => {
      const qs = [targetEntityId && `target_entity_id=${targetEntityId}`, `limit=${limit}`].filter(Boolean).join('&')
      return request<import('../types').Activity[]>(`/activities?${qs}`)
    },
    create: (data: Partial<import('../types').Activity>) => request(`/activities`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/activities/${id}`, { method: 'DELETE' }),
  },

  // Notes
  notes: {
    list: (targetEntityId: string) => request<import('../types').Note[]>(`/notes?target_entity_id=${targetEntityId}`),
    create: (targetEntityId: string, body: string) => request(`/notes`, { method: 'POST', body: JSON.stringify({ target_entity_id: targetEntityId, body }) }),
    update: (id: string, body: string) => request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify({ body }) }),
    delete: (id: string) => request(`/notes/${id}`, { method: 'DELETE' }),
  },

  // Tags
  tags: {
    list: () => request<import('../types').Tag[]>(`/tags`),
    create: (name: string, color?: string) => request(`/tags`, { method: 'POST', body: JSON.stringify({ name, color }) }),
    update: (id: string, data: { name?: string; color?: string }) => request(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/tags/${id}`, { method: 'DELETE' }),
  },

  // Research
  research: {
    profiles: {
      list: (marketMode?: string) => request<import('../types').SavedResearchProfile[]>(`/research/profiles${marketMode ? '?market_mode=' + marketMode : ''}`),
      create: (data: { name: string; market_mode: string; criteria?: Record<string, unknown>; is_default?: boolean }) =>
        request(`/research/profiles`, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Partial<import('../types').SavedResearchProfile>) =>
        request(`/research/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) => request(`/research/profiles/${id}`, { method: 'DELETE' }),
    },
    draft: {
      get: () => request<{ market_mode: string; criteria: Record<string, unknown> } | null>(`/research/draft`),
      save: (marketMode: string, criteria: Record<string, unknown>) =>
        request(`/research/draft`, { method: 'PUT', body: JSON.stringify({ market_mode: marketMode, criteria }) }),
    },
    run: (marketMode: string, criteria: Record<string, unknown>, desiredCount?: number) =>
      request<{ results: unknown[]; disclaimer: string }>(`/research/run`, {
        method: 'POST',
        body: JSON.stringify({ market_mode: marketMode, criteria, desired_count: desiredCount }),
      }),
    import: (results: unknown[]) =>
      request<{ imported: number; duplicates: number }>(`/research/import`, { method: 'POST', body: JSON.stringify({ results }) }),
  },

  // Scores
  scores: {
    get: (targetId: string) => request<import('../types').ScoreRecord | null>(`/scores/${targetId}`),
    calculate: (targetId: string) => request(`/scores/calculate/${targetId}`, { method: 'POST' }),
    model: (marketMode: string) => request<{ market_mode: string; dimensions: { key: string; name: string; max: number }[] }>(`/scores/model/${marketMode}`),
  },

  // Claims
  claims: {
    list: (targetEntityId: string) => request<import('../types').ResearchClaim[]>(`/claims?target_entity_id=${targetEntityId}`),
    create: (data: Partial<import('../types').ResearchClaim>) => request(`/claims`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/claims/${id}`, { method: 'DELETE' }),
  },

  // Dashboard
  dashboard: {
    get: () => request<import('../types').DashboardData>(`/dashboard`),
  },

  // Messages
  messages: {
    list: (targetEntityId?: string) => request<import('../types').Message[]>(`/messages${targetEntityId ? '?target_entity_id=' + targetEntityId : ''}`),
    create: (data: Partial<import('../types').Message>) => request(`/messages`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import('../types').Message>) => request(`/messages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/messages/${id}`, { method: 'DELETE' }),
    generate: (targetEntityId: string, channel?: string, tone?: string) =>
      request<{ subject: string; body: string; disclaimer: string }>(`/messages/generate`, {
        method: 'POST',
        body: JSON.stringify({ target_entity_id: targetEntityId, channel, tone }),
      }),
  },

  // Enrich
  enrich: {
    analyze: (targetId: string) => request(`/enrich/analyze/${targetId}`),
    propose: (targetId: string) => request(`/enrich/propose/${targetId}`, { method: 'POST' }),
    accept: (targetId: string, data: { accepted: unknown[]; rejected: unknown[]; claim_proposals: unknown[] }) =>
      request(`/enrich/accept/${targetId}`, { method: 'POST', body: JSON.stringify(data) }),
    history: (targetId: string) => request(`/enrich/history/${targetId}`),
  },
}
