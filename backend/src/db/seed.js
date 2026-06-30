import { getDb } from './database.js'
import { v4 as uuidv4 } from 'uuid'

function seed() {
  const db = getDb()

  const existing = db.prepare('SELECT COUNT(*) as cnt FROM target_entities WHERE is_demo = 1').get()
  if (existing.cnt > 0) {
    console.log('Demo data already seeded. Skipping.')
    return
  }

  console.log('Seeding demo data...')

  // --- TAGS ---
  const tags = [
    { id: uuidv4(), name: 'High Priority', color: '#10b981' },
    { id: uuidv4(), name: 'Federal', color: '#3b82f6' },
    { id: uuidv4(), name: 'Manufacturing', color: '#f59e0b' },
    { id: uuidv4(), name: 'SaaS', color: '#8b5cf6' },
    { id: uuidv4(), name: 'Partner Opportunity', color: '#14b8a6' },
    { id: uuidv4(), name: 'Needs Enrichment', color: '#ef4444' },
    { id: uuidv4(), name: 'Decision Ready', color: '#06b6d4' },
    { id: uuidv4(), name: 'Government', color: '#64748b' },
  ]
  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (id, name, color) VALUES (?, ?, ?)')
  tags.forEach(t => insertTag.run(t.id, t.name, t.color))

  const tagMap = {}
  tags.forEach(t => { tagMap[t.name] = t.id })

  // Helper to insert a target and return its id
  function insertTarget(t) {
    const id = uuidv4()
    db.prepare(`
      INSERT INTO target_entities (
        id, market_mode, entity_type, name, description, website, domain,
        primary_location, service_area, status, estimated_value,
        confidence_level, verification_status, is_demo, tags_json,
        industry, subindustry, naics_code, psc_code, opportunity_type,
        created_at, updated_at, last_enriched_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, 1, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `).run(
      id, t.market_mode, t.entity_type, t.name, t.description, t.website, t.domain,
      t.primary_location, t.service_area, t.status, t.estimated_value,
      t.confidence_level, t.verification_status, JSON.stringify(t.tags || []),
      t.industry || null, t.subindustry || null, t.naics_code || null, t.psc_code || null, t.opportunity_type || null,
      t.created_at || new Date().toISOString(), t.updated_at || new Date().toISOString(), t.last_enriched_at || null
    )
    return id
  }

  function insertScore(targetId, model, score, dims) {
    const rid = uuidv4()
    const classification = score >= 85 ? 'priority' : score >= 70 ? 'strong' : score >= 55 ? 'possible' : 'low_priority'
    db.prepare(`
      INSERT INTO score_records (id, target_entity_id, scoring_model, total_score, score_classification, confidence_level)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(rid, targetId, model, score, classification, 'medium')
    dims.forEach(d => {
      db.prepare(`
        INSERT INTO score_dimensions (id, score_record_id, dimension_name, points_earned, maximum_points, explanation, confidence_level, missing_data_penalty)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), rid, d.name, d.earned, d.max, d.explanation, d.confidence || 'medium', d.penalty || 0)
    })
  }

  function insertContact(targetId, c) {
    db.prepare(`
      INSERT INTO contacts (id, target_entity_id, name, title, department, role_type, email, phone, confidence_level, verification_status, is_primary, is_recommended_role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), targetId, c.name || null, c.title, c.department || null, c.role_type, c.email || null, c.phone || null,
      c.confidence || 'medium', c.verification || 'partial', c.is_primary ? 1 : 0, c.is_recommended ? 1 : 0)
  }

  function insertActivity(targetId, a) {
    db.prepare(`
      INSERT INTO activities (id, target_entity_id, activity_type, channel, description, outcome, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), targetId, a.type, a.channel || null, a.description, a.outcome || null, a.date || new Date().toISOString())
  }

  function insertClaim(targetId, c) {
    db.prepare(`
      INSERT INTO research_claims (id, target_entity_id, claim_type, claim_text, classification, confidence_level)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), targetId, c.type, c.text, c.classification || 'inferred', c.confidence || 'medium')
  }

  function insertOpportunity(targetId, o) {
    db.prepare(`
      INSERT INTO opportunities (id, target_entity_id, opportunity_type, title, description, estimated_value, probability, stage, acquisition_path, expected_decision_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), targetId, o.type || 'direct_sale', o.title, o.description || null, o.value || null, o.probability || 50, o.stage || 'identified', o.path || null, o.decision_date || null)
  }

  function assignTags(targetId, tagNames) {
    tagNames.forEach(name => {
      const tagId = tagMap[name]
      if (tagId) {
        db.prepare('INSERT OR IGNORE INTO target_tags (target_entity_id, tag_id) VALUES (?, ?)').run(targetId, tagId)
      }
    })
  }

  // ======================================================
  // COMMERCIAL TARGETS (4)
  // ======================================================

  // C1 — Apex Precision Manufacturing
  const c1 = insertTarget({
    market_mode: 'commercial', entity_type: 'company',
    name: 'Apex Precision Manufacturing Co.',
    description: 'Mid-size precision parts manufacturer supplying aerospace and defense OEMs. Operates three facilities in the Midwest. Available context suggests the company may be evaluating production-optimization software following a recent facility expansion.',
    website: 'https://apexprecision.demo', domain: 'apexprecision.demo',
    primary_location: 'Wichita, KS', service_area: 'Midwest, National',
    status: 'qualified', estimated_value: 240000, confidence_level: 'medium',
    verification_status: 'partial', industry: 'Aerospace & Defense Manufacturing',
    subindustry: 'Precision Parts', naics_code: '332999',
    created_at: '2026-05-10T09:00:00Z', updated_at: '2026-06-15T14:30:00Z',
    last_enriched_at: '2026-06-01T10:00:00Z',
    tags: ['High Priority', 'Manufacturing']
  })
  insertScore(c1, 'commercial', 82, [
    { name: 'Strategic & Industry Fit', earned: 17, max: 20, explanation: 'Strong alignment with precision manufacturing sector. Company profile matches target customer criteria closely.', confidence: 'high' },
    { name: 'Business Need Alignment', earned: 16, max: 20, explanation: 'Available context suggests recent facility expansion may indicate operational challenges that align with offered solutions.', confidence: 'medium' },
    { name: 'Budget Indicators', earned: 11, max: 15, explanation: 'Mid-size company with defense contracts; capital investment patterns inferred from public records suggest budget availability.', confidence: 'medium', penalty: 2 },
    { name: 'Decision-Maker Accessibility', earned: 12, max: 15, explanation: 'Operations leadership identified through public sources. Direct access path available.', confidence: 'medium' },
    { name: 'Trigger Event Strength', earned: 8, max: 10, explanation: 'Facility expansion and increased headcount are positive buying signals. Timing appears favorable.', confidence: 'high' },
    { name: 'Contactability', earned: 9, max: 10, explanation: 'Company has public contact channels; recommended decision-maker roles identified.', confidence: 'medium' },
    { name: 'Evidence Quality & Freshness', earned: 9, max: 10, explanation: 'Research completed within 60 days. Multiple claim types present.', confidence: 'high' },
  ])
  insertContact(c1, { title: 'VP of Operations', role_type: 'decision_maker', department: 'Operations', confidence: 'medium', verification: 'partial', is_primary: true })
  insertContact(c1, { title: 'Director of Procurement', role_type: 'influencer', department: 'Procurement', confidence: 'low', verification: 'unverified', is_recommended: true })
  insertClaim(c1, { type: 'company_size', text: 'Organization employs approximately 280–340 employees across three facilities. This should be verified before outreach.', classification: 'inferred', confidence: 'medium' })
  insertClaim(c1, { type: 'trigger_event', text: 'Available context suggests a facility expansion completed in early 2026 may have introduced production scheduling complexity.', classification: 'inferred', confidence: 'medium' })
  insertClaim(c1, { type: 'revenue', text: 'Annual revenue is estimated in the $45M–$80M range based on company size and industry norms. This is an inference and has not been independently verified.', classification: 'inferred', confidence: 'low' })
  insertActivity(c1, { type: 'research', description: 'Initial research profile created. Company identified through manufacturing sector targeting.', date: '2026-05-10T09:00:00Z' })
  insertActivity(c1, { type: 'enrichment', description: 'Target enriched with facility expansion context and industry peer data.', date: '2026-06-01T10:00:00Z' })
  insertActivity(c1, { type: 'status_change', description: 'Status updated from Researching to Qualified based on score of 82.', date: '2026-06-15T14:30:00Z' })
  insertOpportunity(c1, { title: 'Production Optimization Software License', type: 'direct_sale', value: 240000, probability: 55, stage: 'qualifying', path: 'Direct Sales', decision_date: '2026-09-30' })
  assignTags(c1, ['High Priority', 'Manufacturing'])

  // C2 — CloudVault Analytics
  const c2 = insertTarget({
    market_mode: 'commercial', entity_type: 'company',
    name: 'CloudVault Analytics, Inc.',
    description: 'B2B SaaS company providing data analytics and business intelligence tools to mid-market financial services firms. Available context suggests they may be evaluating integration partners to expand platform capabilities.',
    website: 'https://cloudvault.demo', domain: 'cloudvault.demo',
    primary_location: 'Austin, TX', service_area: 'National',
    status: 'active', estimated_value: 95000, confidence_level: 'high',
    verification_status: 'partial', industry: 'Financial Technology',
    subindustry: 'Business Intelligence SaaS', naics_code: '511210',
    created_at: '2026-04-20T11:00:00Z', updated_at: '2026-06-20T09:00:00Z',
    last_enriched_at: '2026-05-28T15:00:00Z',
    tags: ['SaaS', 'High Priority']
  })
  insertScore(c2, 'commercial', 76, [
    { name: 'Strategic & Industry Fit', earned: 15, max: 20, explanation: 'SaaS company in financial services; product category alignment is moderate to strong.', confidence: 'high' },
    { name: 'Business Need Alignment', earned: 15, max: 20, explanation: 'Integration-partner signals align well with offering. Platform expansion appears to be an active initiative.', confidence: 'medium' },
    { name: 'Budget Indicators', earned: 12, max: 15, explanation: 'Series B funding history inferred from public tech-sector sources. Specific amounts unverified.', confidence: 'medium', penalty: 1 },
    { name: 'Decision-Maker Accessibility', earned: 11, max: 15, explanation: 'CTO and Head of Partnerships are common titles at companies of this type. Specific individuals not confirmed.', confidence: 'low', penalty: 2 },
    { name: 'Trigger Event Strength', earned: 7, max: 10, explanation: 'Platform expansion initiative is a moderate buying signal.', confidence: 'medium' },
    { name: 'Contactability', earned: 8, max: 10, explanation: 'Public contact channels available; tech-company contact norms apply.', confidence: 'medium' },
    { name: 'Evidence Quality & Freshness', earned: 8, max: 10, explanation: 'Research completed within 45 days. Confidence is higher on technology and company-type claims.', confidence: 'high' },
  ])
  insertContact(c2, { title: 'Chief Technology Officer', role_type: 'decision_maker', department: 'Engineering', confidence: 'low', verification: 'unverified', is_recommended: true })
  insertContact(c2, { title: 'Head of Partnerships', role_type: 'influencer', department: 'Business Development', confidence: 'low', verification: 'unverified', is_recommended: true })
  insertClaim(c2, { type: 'technology', text: 'Available context suggests the platform is built on a cloud-native architecture. Technology stack details have not been independently verified.', classification: 'inferred', confidence: 'low' })
  insertActivity(c2, { type: 'research', description: 'Target identified through SaaS B2B research run.', date: '2026-04-20T11:00:00Z' })
  insertActivity(c2, { type: 'status_change', description: 'Status updated to Active — initial outreach sequence initiated.', date: '2026-06-20T09:00:00Z' })
  insertOpportunity(c2, { title: 'Platform Integration Partnership', type: 'partnership', value: 95000, probability: 40, stage: 'qualifying', path: 'Partnership Channel' })
  assignTags(c2, ['SaaS', 'High Priority'])

  // C3 — Meridian Agri Supply
  const c3 = insertTarget({
    market_mode: 'commercial', entity_type: 'company',
    name: 'Meridian Agri Supply Group',
    description: 'Regional agricultural input distributor serving independent farmers and co-ops across three states. The organization may be experiencing margin pressure from supply-chain disruptions, which could create interest in procurement or logistics optimization.',
    website: 'https://meridianagri.demo', domain: 'meridianagri.demo',
    primary_location: 'Abilene, TX', service_area: 'TX, OK, KS',
    status: 'researching', estimated_value: 60000, confidence_level: 'low',
    verification_status: 'unverified', industry: 'Agricultural Distribution',
    naics_code: '424590',
    created_at: '2026-06-01T08:00:00Z', updated_at: '2026-06-01T08:00:00Z',
    tags: ['Needs Enrichment']
  })
  insertScore(c3, 'commercial', 58, [
    { name: 'Strategic & Industry Fit', earned: 12, max: 20, explanation: 'Agricultural distribution aligns with sector coverage, but is not a primary target industry. Fit is moderate.', confidence: 'medium' },
    { name: 'Business Need Alignment', earned: 12, max: 20, explanation: 'Supply-chain and margin pressure signals are inferred; not confirmed by direct evidence.', confidence: 'low', penalty: 3 },
    { name: 'Budget Indicators', earned: 7, max: 15, explanation: 'No direct budget signals available. Regional distributor scale suggests moderate budget capacity.', confidence: 'low', penalty: 5 },
    { name: 'Decision-Maker Accessibility', earned: 8, max: 15, explanation: 'Decision-maker titles not yet identified. Enrichment recommended.', confidence: 'low', penalty: 4 },
    { name: 'Trigger Event Strength', earned: 5, max: 10, explanation: 'General industry supply-chain challenges cited. No company-specific trigger identified.', confidence: 'low', penalty: 2 },
    { name: 'Contactability', earned: 7, max: 10, explanation: 'Company has public channels but specific contact information not available.', confidence: 'low' },
    { name: 'Evidence Quality & Freshness', earned: 7, max: 10, explanation: 'Limited evidence available. Record needs enrichment.', confidence: 'low', penalty: 2 },
  ])
  insertClaim(c3, { type: 'industry_context', text: 'Available context suggests regional agricultural distributors in this geography have experienced supply-chain disruptions. This claim applies broadly to the sector and should be verified for this specific organization.', classification: 'inferred', confidence: 'low' })
  insertActivity(c3, { type: 'research', description: 'Target identified through agricultural sector research. Requires enrichment before outreach.', date: '2026-06-01T08:00:00Z' })
  assignTags(c3, ['Needs Enrichment'])

  // C4 — Consolidated Fleet Services
  const c4 = insertTarget({
    market_mode: 'commercial', entity_type: 'company',
    name: 'Consolidated Fleet Services LLC',
    description: 'Commercial fleet maintenance and management provider servicing municipal and private fleets. Operates regionally with contracts across 14 counties. Available context suggests the company may be expanding its managed-services model.',
    website: 'https://consolidatedfleet.demo', domain: 'consolidatedfleet.demo',
    primary_location: 'Oklahoma City, OK', service_area: 'OK, TX, AR',
    status: 'proposal', estimated_value: 180000, confidence_level: 'medium',
    verification_status: 'partial', industry: 'Fleet Management Services',
    naics_code: '811191',
    created_at: '2026-03-15T10:00:00Z', updated_at: '2026-06-25T16:00:00Z',
    last_enriched_at: '2026-05-20T09:00:00Z',
    tags: ['Decision Ready']
  })
  insertScore(c4, 'commercial', 88, [
    { name: 'Strategic & Industry Fit', earned: 18, max: 20, explanation: 'Strong fit. Fleet services is a primary vertical. Company size and service model match ideal customer profile.', confidence: 'high' },
    { name: 'Business Need Alignment', earned: 17, max: 20, explanation: 'Managed-services expansion and county-contract model create clear alignment with offered solutions.', confidence: 'high' },
    { name: 'Budget Indicators', earned: 13, max: 15, explanation: 'Multi-county municipal contracts indicate stable recurring revenue and budget availability.', confidence: 'medium' },
    { name: 'Decision-Maker Accessibility', earned: 13, max: 15, explanation: 'Primary decision-maker role identified. Initial conversation has occurred.', confidence: 'high' },
    { name: 'Trigger Event Strength', earned: 9, max: 10, explanation: 'Managed-services expansion is an active and confirmed business initiative.', confidence: 'high' },
    { name: 'Contactability', earned: 9, max: 10, explanation: 'Active engagement in progress.', confidence: 'high' },
    { name: 'Evidence Quality & Freshness', earned: 9, max: 10, explanation: 'Research current; multiple interaction touchpoints logged.', confidence: 'high' },
  ])
  insertContact(c4, { title: 'Director of Business Development', role_type: 'decision_maker', department: 'Business Development', confidence: 'high', verification: 'partial', is_primary: true })
  insertClaim(c4, { type: 'business_model', text: 'Organization is actively expanding its managed-services contract base. Available context from initial engagement suggests this is an ongoing strategic initiative.', classification: 'user_provided', confidence: 'high' })
  insertActivity(c4, { type: 'research', description: 'Target identified through fleet services sector research.', date: '2026-03-15T10:00:00Z' })
  insertActivity(c4, { type: 'call', channel: 'phone', description: 'Initial discovery call completed. Strong interest in managed services expansion.', outcome: 'positive', date: '2026-05-05T14:00:00Z' })
  insertActivity(c4, { type: 'email', channel: 'email', description: 'Proposal document sent following discovery call.', outcome: 'sent', date: '2026-06-10T09:00:00Z' })
  insertActivity(c4, { type: 'status_change', description: 'Status updated to Proposal following submission.', date: '2026-06-25T16:00:00Z' })
  insertOpportunity(c4, { title: 'Fleet Management Software & Services', type: 'direct_sale', value: 180000, probability: 70, stage: 'proposal', path: 'Direct Sales', decision_date: '2026-08-15' })
  assignTags(c4, ['Decision Ready'])

  // ======================================================
  // GOVERNMENT TARGETS (3)
  // ======================================================

  // G1 — USDA Agricultural Research Service
  const g1 = insertTarget({
    market_mode: 'government', entity_type: 'government_agency',
    name: 'USDA Agricultural Research Service — Plains Area',
    description: 'Federal agricultural research agency responsible for developing scientific knowledge to solve agricultural problems. Plains Area office oversees research stations across six states. Available context suggests active interest in precision agriculture and data-collection technologies.',
    website: 'https://ars.usda.gov', domain: 'usda.gov',
    primary_location: 'Fort Collins, CO', service_area: 'Plains Region (CO, KS, NE, ND, SD, WY)',
    status: 'researching', estimated_value: 750000, confidence_level: 'medium',
    verification_status: 'partial', industry: 'Federal Government',
    naics_code: '541710', psc_code: 'A001',
    opportunity_type: 'RFP',
    created_at: '2026-04-01T09:00:00Z', updated_at: '2026-06-10T11:00:00Z',
    last_enriched_at: '2026-05-15T10:00:00Z',
    tags: ['Federal', 'Government', 'High Priority']
  })
  insertScore(g1, 'government', 79, [
    { name: 'Mission Alignment', earned: 12, max: 15, explanation: 'Strong mission fit. Agency focus on agricultural innovation aligns closely with proposed capabilities.', confidence: 'high' },
    { name: 'Requirement Relevance', earned: 12, max: 15, explanation: 'Precision agriculture and data-collection needs are documented in agency strategic materials.', confidence: 'medium' },
    { name: 'Funding Availability', earned: 11, max: 15, explanation: 'Agency has consistent appropriations. Available context suggests active R&D budget for technology acquisition.', confidence: 'medium' },
    { name: 'Procurement Maturity', earned: 11, max: 15, explanation: 'Agency has established procurement office and history of technology contracts.', confidence: 'medium' },
    { name: 'Acquisition Pathway', earned: 8, max: 10, explanation: 'SBIR and direct R&D contracting pathways are plausible. Specific vehicle not yet confirmed.', confidence: 'low', penalty: 1 },
    { name: 'Eligibility & Compliance', earned: 8, max: 10, explanation: 'No known eligibility barriers. Compliance requirements typical of civilian federal procurement.', confidence: 'medium' },
    { name: 'Stakeholder Access', earned: 9, max: 10, explanation: 'Research station contacts are generally accessible through public channels.', confidence: 'medium' },
    { name: 'Competitive Position', earned: 4, max: 5, explanation: 'Competitive landscape not yet characterized. Should be verified before proposal development.', confidence: 'low', penalty: 1 },
    { name: 'Evidence Quality', earned: 4, max: 5, explanation: 'Research is current and draws from public agency materials.', confidence: 'medium' },
  ])
  insertContact(g1, { title: 'Contracting Officer', role_type: 'contracting_officer', department: 'Acquisition & Property Management', confidence: 'low', verification: 'unverified', is_recommended: true })
  insertContact(g1, { title: 'Research Leader — Precision Agriculture', role_type: 'technical_poc', department: 'Research', confidence: 'low', verification: 'unverified', is_recommended: true })
  insertClaim(g1, { type: 'mission', text: 'Agency mission includes developing scientific knowledge and technology to solve agricultural problems of broad scope and high priority.', classification: 'sourced', confidence: 'high' })
  insertClaim(g1, { type: 'budget', text: 'Available context suggests the Plains Area office maintains an active research technology budget. Specific appropriation amounts should be verified through USAspending.gov.', classification: 'inferred', confidence: 'medium' })
  insertActivity(g1, { type: 'research', description: 'Government target identified through precision agriculture sector targeting.', date: '2026-04-01T09:00:00Z' })
  insertActivity(g1, { type: 'enrichment', description: 'Agency mission and research priority context enriched from public sources.', date: '2026-05-15T10:00:00Z' })
  insertOpportunity(g1, { title: 'Precision Agriculture Data Platform — R&D Contract', type: 'rfp', value: 750000, probability: 30, stage: 'identified', path: 'SBIR Phase II or Direct R&D Contract', decision_date: '2026-12-01' })
  assignTags(g1, ['Federal', 'Government', 'High Priority'])

  // G2 — Pawnee County, OK
  const g2 = insertTarget({
    market_mode: 'government', entity_type: 'government_agency',
    name: 'Pawnee County Government — IT & Infrastructure',
    description: 'County government serving approximately 16,000 residents in north-central Oklahoma. Available context suggests the county is evaluating digital infrastructure upgrades ahead of the next fiscal year. The county commission has discussed modernization priorities in public session records.',
    website: 'https://pawneecounty.demo', domain: 'pawneecounty.ok.gov',
    primary_location: 'Pawnee, OK', service_area: 'Pawnee County, OK',
    status: 'qualified', estimated_value: 120000, confidence_level: 'medium',
    verification_status: 'partial', industry: 'County Government',
    opportunity_type: 'RFQ',
    created_at: '2026-05-05T10:00:00Z', updated_at: '2026-06-18T13:00:00Z',
    last_enriched_at: '2026-06-05T09:00:00Z',
    tags: ['Government', 'Decision Ready']
  })
  insertScore(g2, 'government', 71, [
    { name: 'Mission Alignment', earned: 11, max: 15, explanation: 'County government modernization initiative aligns with digital infrastructure offering.', confidence: 'medium' },
    { name: 'Requirement Relevance', earned: 11, max: 15, explanation: 'IT infrastructure needs are consistent with county scale and modernization discussion.', confidence: 'medium' },
    { name: 'Funding Availability', earned: 10, max: 15, explanation: 'County budget cycles are predictable. Fiscal year timing suggests near-term procurement activity.', confidence: 'medium', penalty: 1 },
    { name: 'Procurement Maturity', earned: 10, max: 15, explanation: 'County-level procurement is less mature than federal; longer relationship development expected.', confidence: 'medium' },
    { name: 'Acquisition Pathway', earned: 7, max: 10, explanation: 'RFQ pathway is most likely based on county size. Cooperative purchasing agreements may apply.', confidence: 'medium' },
    { name: 'Eligibility & Compliance', earned: 8, max: 10, explanation: 'No eligibility barriers identified.', confidence: 'medium' },
    { name: 'Stakeholder Access', earned: 7, max: 10, explanation: 'County IT director is typically accessible; specific individual not yet identified.', confidence: 'low', penalty: 1 },
    { name: 'Competitive Position', earned: 4, max: 5, explanation: 'Small county may have limited vendor options; competitive position may be favorable.', confidence: 'low' },
    { name: 'Evidence Quality', earned: 3, max: 5, explanation: 'Evidence is moderate. Commission meeting context is inferred.', confidence: 'medium', penalty: 1 },
  ])
  insertContact(g2, { title: 'County IT Director', role_type: 'technical_poc', department: 'Information Technology', confidence: 'low', verification: 'unverified', is_recommended: true })
  insertContact(g2, { title: 'County Administrator', role_type: 'decision_maker', department: 'Administration', confidence: 'low', verification: 'unverified', is_recommended: true })
  insertClaim(g2, { type: 'procurement_signal', text: 'Available context suggests the county commission has discussed digital infrastructure modernization in recent public session records. This should be verified directly before outreach.', classification: 'inferred', confidence: 'medium' })
  insertActivity(g2, { type: 'research', description: 'County identified through municipal government targeting for IT infrastructure.', date: '2026-05-05T10:00:00Z' })
  insertOpportunity(g2, { title: 'County IT Infrastructure Modernization', type: 'rfq', value: 120000, probability: 45, stage: 'qualifying', path: 'Direct County Procurement or State Co-op Contract' })
  assignTags(g2, ['Government', 'Decision Ready'])

  // G3 — DOE Tribal Energy Program
  const g3 = insertTarget({
    market_mode: 'government', entity_type: 'government_program',
    name: 'DOE Office of Indian Energy Policy and Programs',
    description: 'Federal program that maximizes the development and deployment of energy solutions for the benefit of American Indians and Alaska Natives. Administers grants and technical assistance for tribal energy projects. Available context suggests active grant cycles for renewable energy feasibility studies.',
    website: 'https://energy.gov/indianenergy', domain: 'energy.gov',
    primary_location: 'Washington, DC', service_area: 'National (Tribal Lands)',
    status: 'researching', estimated_value: 400000, confidence_level: 'medium',
    verification_status: 'partial', industry: 'Federal Government',
    naics_code: '541690', psc_code: 'A001',
    opportunity_type: 'Grant',
    created_at: '2026-05-20T08:00:00Z', updated_at: '2026-06-12T10:00:00Z',
    tags: ['Federal', 'Government']
  })
  insertScore(g3, 'government', 65, [
    { name: 'Mission Alignment', earned: 10, max: 15, explanation: 'Program focus on tribal energy development aligns with renewable energy and feasibility study capabilities.', confidence: 'medium' },
    { name: 'Requirement Relevance', earned: 10, max: 15, explanation: 'Feasibility studies and technology assessments align with grant objectives.', confidence: 'medium' },
    { name: 'Funding Availability', earned: 10, max: 15, explanation: 'DOE has consistent appropriations for tribal energy. Grant amounts vary by cycle.', confidence: 'medium' },
    { name: 'Procurement Maturity', earned: 9, max: 15, explanation: 'Grant program has established application process. Competitive.', confidence: 'high' },
    { name: 'Acquisition Pathway', earned: 6, max: 10, explanation: 'Grant pathway is clear; eligibility and partnership requirements should be confirmed.', confidence: 'medium' },
    { name: 'Eligibility & Compliance', earned: 5, max: 10, explanation: 'Tribal-partnership requirements must be confirmed. Eligibility depends on teaming structure.', confidence: 'low', penalty: 2 },
    { name: 'Stakeholder Access', earned: 7, max: 10, explanation: 'DOE program office contacts accessible through public channels.', confidence: 'medium' },
    { name: 'Competitive Position', earned: 4, max: 5, explanation: 'Grant competition likely includes established tribal energy consultants.', confidence: 'low', penalty: 1 },
    { name: 'Evidence Quality', earned: 4, max: 5, explanation: 'Evidence from public DOE sources. Active grant cycles should be confirmed at energy.gov.', confidence: 'medium' },
  ])
  insertActivity(g3, { type: 'research', description: 'Government program identified through tribal energy grant research.', date: '2026-05-20T08:00:00Z' })
  assignTags(g3, ['Federal', 'Government'])

  // ======================================================
  // PRIVATE CLIENT TARGETS (3)
  // ======================================================

  // P1 — Redrock Ridge Ranch
  const p1 = insertTarget({
    market_mode: 'private_client', entity_type: 'property',
    name: 'Redrock Ridge Ranch (Private Client)',
    description: 'Large-acreage cattle and hay operation in the Texas Hill Country. Available context suggests the property owner may be experiencing pasture management challenges following drought conditions. Need severity appears high based on regional agricultural conditions.',
    domain: null, website: null,
    primary_location: 'Kerrville, TX', service_area: 'Kerr County, TX',
    status: 'qualified', estimated_value: 18000, confidence_level: 'medium',
    verification_status: 'partial', industry: 'Agriculture — Livestock & Hay',
    created_at: '2026-05-28T09:00:00Z', updated_at: '2026-06-22T11:00:00Z',
    tags: ['High Priority']
  })
  insertScore(p1, 'private_client', 78, [
    { name: 'Need Severity', earned: 16, max: 20, explanation: 'Drought conditions in the region create high need severity for pasture management and soil restoration services.', confidence: 'high' },
    { name: 'Geographic Serviceability', earned: 16, max: 20, explanation: 'Property is within service radius. Access routes confirmed.', confidence: 'high' },
    { name: 'Customer or Property Fit', earned: 12, max: 15, explanation: 'Cattle and hay operation matches ideal client profile. Acreage estimate is consistent with service tier.', confidence: 'medium' },
    { name: 'Urgency', earned: 11, max: 15, explanation: 'Drought-driven urgency is real and timely. Decision timeline is likely within this growing season.', confidence: 'medium' },
    { name: 'Estimated Opportunity Value', earned: 8, max: 10, explanation: 'Multi-acre treatment and follow-up service creates recurring value potential.', confidence: 'medium' },
    { name: 'Contactability & Consent', earned: 7, max: 10, explanation: 'Contact path exists; consent confirmation needed before direct outreach.', confidence: 'medium', penalty: 1 },
    { name: 'Referral Strength', earned: 4, max: 5, explanation: 'Weak referral signal. No strong referral connection established.', confidence: 'low' },
    { name: 'Evidence Quality', earned: 4, max: 5, explanation: 'Regional drought data is verifiable. Property-specific details inferred.', confidence: 'medium' },
  ])
  insertContact(p1, { title: 'Property Owner', role_type: 'decision_maker', confidence: 'medium', verification: 'partial', is_primary: true })
  insertClaim(p1, { type: 'need', text: 'Available context suggests drought conditions in Kerr County have reduced pasture quality significantly. The property may be experiencing overgrazing pressure as a result. This should be confirmed at initial contact.', classification: 'inferred', confidence: 'medium' })
  insertActivity(p1, { type: 'research', description: 'Private client identified through property-based targeting in drought-affected counties.', date: '2026-05-28T09:00:00Z' })
  insertActivity(p1, { type: 'status_change', description: 'Status updated to Qualified based on regional need indicators.', date: '2026-06-22T11:00:00Z' })
  assignTags(p1, ['High Priority'])

  // P2 — Rolling Meadows Property
  const p2 = insertTarget({
    market_mode: 'private_client', entity_type: 'property',
    name: 'Rolling Meadows Landholding (Private Client)',
    description: 'Absentee-owned pasture land with fencing and pond infrastructure. Owner has not managed the property actively in several years. Available context suggests interest in property improvement for potential lease or sale preparation.',
    primary_location: 'Stillwater, OK', service_area: 'Payne County, OK',
    status: 'new', estimated_value: 8500, confidence_level: 'low',
    verification_status: 'unverified', industry: 'Land Management',
    created_at: '2026-06-10T14:00:00Z', updated_at: '2026-06-10T14:00:00Z',
    tags: ['Needs Enrichment']
  })
  insertScore(p2, 'private_client', 52, [
    { name: 'Need Severity', earned: 11, max: 20, explanation: 'Absentee ownership and deferred maintenance create potential need, but severity is unconfirmed.', confidence: 'low', penalty: 3 },
    { name: 'Geographic Serviceability', earned: 15, max: 20, explanation: 'Property is within service radius.', confidence: 'high' },
    { name: 'Customer or Property Fit', earned: 8, max: 15, explanation: 'Property type fits, but owner intent is unclear.', confidence: 'low', penalty: 2 },
    { name: 'Urgency', earned: 5, max: 15, explanation: 'No urgency signals detected. Timeline is uncertain.', confidence: 'low', penalty: 4 },
    { name: 'Estimated Opportunity Value', earned: 5, max: 10, explanation: 'Value estimate is low based on property size and scope of likely services.', confidence: 'low' },
    { name: 'Contactability & Consent', earned: 4, max: 10, explanation: 'Owner contact path not yet confirmed. Consent status unknown.', confidence: 'low', penalty: 3 },
    { name: 'Referral Strength', earned: 2, max: 5, explanation: 'No referral connection.', confidence: 'low' },
    { name: 'Evidence Quality', earned: 2, max: 5, explanation: 'Very limited evidence. Enrichment required.', confidence: 'low', penalty: 2 },
  ])
  insertActivity(p2, { type: 'research', description: 'Private client property identified. Requires enrichment and contact path development.', date: '2026-06-10T14:00:00Z' })
  assignTags(p2, ['Needs Enrichment'])

  // P3 — Hawthorne Family Farm
  const p3 = insertTarget({
    market_mode: 'private_client', entity_type: 'individual',
    name: 'Hawthorne Family Farm (Private Client)',
    description: 'Third-generation family row-crop operation. Available context from referral source indicates the family is looking to transition a portion of acreage to conservation practices and may qualify for cost-share programs. Urgency is moderate — decision expected before planting season.',
    primary_location: 'Enid, OK', service_area: 'Garfield County, OK',
    status: 'active', estimated_value: 24000, confidence_level: 'high',
    verification_status: 'partial', industry: 'Agriculture — Row Crops',
    created_at: '2026-04-15T09:00:00Z', updated_at: '2026-06-28T10:00:00Z',
    last_enriched_at: '2026-05-30T11:00:00Z',
    tags: ['High Priority', 'Decision Ready']
  })
  insertScore(p3, 'private_client', 86, [
    { name: 'Need Severity', earned: 17, max: 20, explanation: 'Conservation transition need confirmed through referral source. Genuine program-driven motivation.', confidence: 'high' },
    { name: 'Geographic Serviceability', earned: 18, max: 20, explanation: 'Within primary service area. Low travel burden.', confidence: 'high' },
    { name: 'Customer or Property Fit', earned: 13, max: 15, explanation: 'Row-crop acreage is ideal for conservation practice conversion.', confidence: 'high' },
    { name: 'Urgency', earned: 13, max: 15, explanation: 'Pre-planting-season deadline creates real urgency. Decision timeline is near-term.', confidence: 'high' },
    { name: 'Estimated Opportunity Value', earned: 8, max: 10, explanation: 'Multi-acre conservation plan plus annual monitoring creates recurring value.', confidence: 'medium' },
    { name: 'Contactability & Consent', earned: 9, max: 10, explanation: 'Referral introduction provides warm contact path and implied consent.', confidence: 'high' },
    { name: 'Referral Strength', earned: 4, max: 5, explanation: 'Strong referral from trusted agricultural professional.', confidence: 'high' },
    { name: 'Evidence Quality', earned: 4, max: 5, explanation: 'Referral-sourced information is high quality. Property details inferred.', confidence: 'high' },
  ])
  insertContact(p3, { title: 'Farm Operator (Decision Maker)', role_type: 'decision_maker', confidence: 'high', verification: 'partial', is_primary: true })
  insertClaim(p3, { type: 'need', text: 'Referral source indicates the family is actively seeking conservation program enrollment assistance for a portion of their row-crop acreage. This is user-provided information and is treated as high confidence.', classification: 'user_provided', confidence: 'high' })
  insertActivity(p3, { type: 'research', description: 'Private client identified through trusted agricultural professional referral.', date: '2026-04-15T09:00:00Z' })
  insertActivity(p3, { type: 'call', channel: 'phone', description: 'Introduction call completed. Family expressed strong interest in conservation cost-share options.', outcome: 'positive', date: '2026-05-02T10:00:00Z' })
  insertActivity(p3, { type: 'meeting', description: 'On-site farm visit conducted. Acreage assessed for conservation practice eligibility.', outcome: 'positive', date: '2026-05-30T09:00:00Z' })
  assignTags(p3, ['High Priority', 'Decision Ready'])

  // ======================================================
  // PARTNER TARGETS (3)
  // ======================================================

  // PA1 — Great Plains Technology Coalition
  const pa1 = insertTarget({
    market_mode: 'partner', entity_type: 'nonprofit',
    name: 'Great Plains Technology Coalition',
    description: 'Regional nonprofit technology consortium connecting rural businesses with technology resources, training, and grants. Available context suggests the coalition maintains relationships with state extension offices, rural development organizations, and USDA programs.',
    website: 'https://gptechcoalition.demo', domain: 'gptechcoalition.demo',
    primary_location: 'Amarillo, TX', service_area: 'TX, OK, NM, CO Panhandles',
    status: 'active', estimated_value: 75000, confidence_level: 'medium',
    verification_status: 'partial', industry: 'Technology Nonprofit',
    created_at: '2026-03-20T09:00:00Z', updated_at: '2026-06-15T10:00:00Z',
    last_enriched_at: '2026-04-28T11:00:00Z',
    tags: ['Partner Opportunity', 'High Priority']
  })
  insertScore(pa1, 'partner', 81, [
    { name: 'Strategic Alignment', earned: 16, max: 20, explanation: 'Coalition mission and network align well with rural market access objectives.', confidence: 'high' },
    { name: 'Capability Complement', earned: 12, max: 15, explanation: 'Coalition provides convening, training, and network access that complements technical offerings.', confidence: 'medium' },
    { name: 'Market Access', earned: 13, max: 15, explanation: 'Direct access to rural business and agricultural networks across the region.', confidence: 'medium' },
    { name: 'Influence & Credibility', earned: 12, max: 15, explanation: 'Established nonprofit with government relationships carries strong credibility in the target region.', confidence: 'medium' },
    { name: 'Mutual Benefit', earned: 12, max: 15, explanation: 'Clear mutual benefit in joint programming and grant co-applications.', confidence: 'medium' },
    { name: 'Relationship Feasibility', earned: 8, max: 10, explanation: 'Partnership outreach has been initiated. Receptivity appears positive.', confidence: 'medium' },
    { name: 'Geographic Relevance', earned: 4, max: 5, explanation: 'Coverage area matches primary target geography.', confidence: 'high' },
    { name: 'Evidence Quality', earned: 4, max: 5, explanation: 'Evidence is current and includes organizational context.', confidence: 'medium' },
  ])
  insertContact(pa1, { title: 'Executive Director', role_type: 'decision_maker', confidence: 'medium', verification: 'partial', is_primary: true })
  insertActivity(pa1, { type: 'research', description: 'Partner identified through regional nonprofit and technology sector research.', date: '2026-03-20T09:00:00Z' })
  insertActivity(pa1, { type: 'email', channel: 'email', description: 'Partnership inquiry email sent to Executive Director.', outcome: 'sent', date: '2026-05-10T10:00:00Z' })
  assignTags(pa1, ['Partner Opportunity', 'High Priority'])

  // PA2 — Ironclad Systems Group
  const pa2 = insertTarget({
    market_mode: 'partner', entity_type: 'prime_contractor',
    name: 'Ironclad Systems Group LLC',
    description: 'Defense and government IT prime contractor with established GSA schedule and multiple agency IDIQ vehicles. Available context suggests the company is actively seeking subcontractors with agricultural technology and rural development expertise.',
    website: 'https://ironcladsg.demo', domain: 'ironcladsg.demo',
    primary_location: 'Vienna, VA', service_area: 'National (Federal)',
    status: 'researching', estimated_value: 350000, confidence_level: 'low',
    verification_status: 'unverified', industry: 'Government IT Contracting',
    created_at: '2026-06-08T11:00:00Z', updated_at: '2026-06-08T11:00:00Z',
    tags: ['Federal', 'Partner Opportunity']
  })
  insertScore(pa2, 'partner', 63, [
    { name: 'Strategic Alignment', earned: 13, max: 20, explanation: 'Federal IT prime with USDA program connections is a plausible teaming partner. Alignment is moderate.', confidence: 'medium' },
    { name: 'Capability Complement', earned: 10, max: 15, explanation: 'Prime contractor infrastructure complements specialty capabilities.', confidence: 'medium' },
    { name: 'Market Access', earned: 10, max: 15, explanation: 'GSA schedule and IDIQ vehicles provide federal market access.', confidence: 'medium' },
    { name: 'Influence & Credibility', earned: 9, max: 15, explanation: 'Federal contractor credibility is established but specific agency relationships not yet confirmed.', confidence: 'low', penalty: 2 },
    { name: 'Mutual Benefit', earned: 8, max: 15, explanation: 'Mutual benefit exists in theory; specific teaming opportunity not yet identified.', confidence: 'low', penalty: 3 },
    { name: 'Relationship Feasibility', earned: 5, max: 10, explanation: 'No relationship established. Cold outreach required.', confidence: 'low', penalty: 2 },
    { name: 'Geographic Relevance', earned: 4, max: 5, explanation: 'National federal focus.', confidence: 'medium' },
    { name: 'Evidence Quality', earned: 4, max: 5, explanation: 'Research is recent. Key claims need verification.', confidence: 'low', penalty: 1 },
  ])
  insertActivity(pa2, { type: 'research', description: 'Prime contractor identified through federal teaming partner research.', date: '2026-06-08T11:00:00Z' })
  assignTags(pa2, ['Federal', 'Partner Opportunity'])

  // PA3 — Oklahoma State University Extension
  const pa3 = insertTarget({
    market_mode: 'partner', entity_type: 'university',
    name: 'Oklahoma State University — Cooperative Extension Service',
    description: 'Land-grant university extension network with county offices across Oklahoma. Provides agricultural research, education, and outreach to farmers, ranchers, and rural communities. Strong relationship with USDA and state agricultural programs.',
    website: 'https://extension.okstate.edu', domain: 'okstate.edu',
    primary_location: 'Stillwater, OK', service_area: 'Oklahoma (77 county offices)',
    status: 'active', estimated_value: 110000, confidence_level: 'high',
    verification_status: 'sourced', industry: 'University Extension',
    created_at: '2026-02-10T09:00:00Z', updated_at: '2026-06-20T12:00:00Z',
    last_enriched_at: '2026-05-01T10:00:00Z',
    tags: ['Partner Opportunity', 'High Priority']
  })
  insertScore(pa3, 'partner', 91, [
    { name: 'Strategic Alignment', earned: 19, max: 20, explanation: 'Extension mission of agricultural education and outreach is a near-perfect complement to rural market strategy.', confidence: 'high' },
    { name: 'Capability Complement', earned: 14, max: 15, explanation: 'Extension network provides trusted third-party validation, education channels, and co-branding opportunities.', confidence: 'high' },
    { name: 'Market Access', earned: 14, max: 15, explanation: '77 county offices provide direct access to the entire Oklahoma agricultural community.', confidence: 'high' },
    { name: 'Influence & Credibility', earned: 14, max: 15, explanation: 'OSU Extension is highly trusted by Oklahoma farmers and ranchers.', confidence: 'high' },
    { name: 'Mutual Benefit', earned: 14, max: 15, explanation: 'Active collaboration in field demonstrations and co-research offers clear mutual benefit.', confidence: 'high' },
    { name: 'Relationship Feasibility', earned: 8, max: 10, explanation: 'Existing positive relationship with two county agents. Partnership MOU in development.', confidence: 'high' },
    { name: 'Geographic Relevance', earned: 5, max: 5, explanation: 'Primary service geography matches exactly.', confidence: 'high' },
    { name: 'Evidence Quality', earned: 3, max: 5, explanation: 'Evidence is sourced from public extension materials and direct engagement.', confidence: 'high' },
  ])
  insertContact(pa3, { name: null, title: 'Associate Director, Agricultural Programs', role_type: 'decision_maker', department: 'Extension Administration', confidence: 'medium', verification: 'partial', is_primary: true })
  insertClaim(pa3, { type: 'network', text: 'OSU Extension operates 77 county offices across Oklahoma with dedicated county agents. This information is sourced from the OSU Extension public website.', classification: 'sourced', confidence: 'high' })
  insertActivity(pa3, { type: 'research', description: 'University extension partner identified as high-value rural market access channel.', date: '2026-02-10T09:00:00Z' })
  insertActivity(pa3, { type: 'meeting', description: 'Initial meeting with two district extension agents. Very positive reception.', outcome: 'positive', date: '2026-03-15T14:00:00Z' })
  insertActivity(pa3, { type: 'note', description: 'MOU drafted for review. Extension team has expressed interest in co-hosting field demonstration days.', date: '2026-06-20T12:00:00Z' })
  assignTags(pa3, ['Partner Opportunity', 'High Priority'])

  // ======================================================
  // STAKEHOLDER TARGETS (2)
  // ======================================================

  // ST1 — State Rep. (Fictional)
  const st1 = insertTarget({
    market_mode: 'stakeholder', entity_type: 'champion',
    name: 'Oklahoma State Legislature — Agriculture Committee Member (Composite)',
    description: 'State legislative stakeholder with committee assignment in agriculture. Available context suggests this stakeholder has been vocal on rural broadband and precision agriculture policy. Influence within the state agricultural policy landscape appears significant.',
    primary_location: 'Oklahoma City, OK', service_area: 'State of Oklahoma',
    status: 'researching', estimated_value: null, confidence_level: 'low',
    verification_status: 'unverified', industry: 'State Government',
    created_at: '2026-05-15T09:00:00Z', updated_at: '2026-05-15T09:00:00Z',
    tags: ['Government']
  })
  insertScore(st1, 'stakeholder', 68, [
    { name: 'Mission Alignment', earned: 14, max: 20, explanation: 'Agriculture committee focus aligns with rural technology and precision agriculture advocacy goals.', confidence: 'medium' },
    { name: 'Influence', earned: 14, max: 20, explanation: 'State legislative influence on agricultural policy is significant. Specific influence scope should be confirmed.', confidence: 'medium' },
    { name: 'Authority or Access', earned: 10, max: 15, explanation: 'Committee assignment provides access to policy levers relevant to the sector.', confidence: 'medium' },
    { name: 'Credibility', earned: 10, max: 15, explanation: 'Elected official carries public credibility. Specific policy record not yet verified.', confidence: 'low', penalty: 1 },
    { name: 'Network Relevance', earned: 7, max: 10, explanation: 'Legislative network likely connects to agricultural stakeholders and extension system.', confidence: 'low', penalty: 1 },
    { name: 'Likelihood of Support', earned: 7, max: 10, explanation: 'Policy alignment suggests support is plausible. Direct engagement has not occurred.', confidence: 'low' },
    { name: 'Relationship Feasibility', earned: 4, max: 5, explanation: 'Public engagement channels available (constituent meetings, public hearings).', confidence: 'medium' },
    { name: 'Evidence Quality', earned: 2, max: 5, explanation: 'Limited evidence. Policy record should be verified through public legislative records.', confidence: 'low', penalty: 2 },
  ])
  insertContact(st1, { title: 'Constituent Services Coordinator', role_type: 'gatekeeper', department: 'Legislative Office', confidence: 'low', verification: 'unverified', is_recommended: true })
  insertClaim(st1, { type: 'influence', text: 'This is a composite stakeholder record created for workflow demonstration. No specific individual has been identified. Available context suggests agricultural committee members in this state have been active on rural technology policy.', classification: 'simulated', confidence: 'low' })
  insertActivity(st1, { type: 'research', description: 'Stakeholder type identified as high-priority category for state-level policy engagement.', date: '2026-05-15T09:00:00Z' })
  assignTags(st1, ['Government'])

  // ST2 — County Extension Agent
  const st2 = insertTarget({
    market_mode: 'stakeholder', entity_type: 'champion',
    name: 'District Extension Agent — South-Central Oklahoma (Composite)',
    description: 'County-level extension stakeholder responsible for delivering agricultural programming to producers in a multi-county district. This role type is highly influential with farmers and ranchers in the service area. Available context suggests active engagement with NRCS and FSA programs.',
    primary_location: 'Sulphur, OK', service_area: 'Murray, Garvin, Pontotoc Counties, OK',
    status: 'active', estimated_value: null, confidence_level: 'medium',
    verification_status: 'partial', industry: 'University Extension',
    created_at: '2026-04-01T10:00:00Z', updated_at: '2026-06-10T09:00:00Z',
    tags: ['Partner Opportunity']
  })
  insertScore(st2, 'stakeholder', 84, [
    { name: 'Mission Alignment', earned: 18, max: 20, explanation: 'Extension agent mission is directly aligned with producer education and conservation programming.', confidence: 'high' },
    { name: 'Influence', earned: 16, max: 20, explanation: 'Trusted local influencer with direct producer relationships. Endorsement carries significant weight.', confidence: 'high' },
    { name: 'Authority or Access', earned: 12, max: 15, explanation: 'Access to producer networks through extension events, field days, and county office engagement.', confidence: 'high' },
    { name: 'Credibility', earned: 12, max: 15, explanation: 'University extension brand provides strong institutional credibility.', confidence: 'high' },
    { name: 'Network Relevance', earned: 9, max: 10, explanation: 'NRCS, FSA, and producer network connections are directly relevant.', confidence: 'medium' },
    { name: 'Likelihood of Support', earned: 8, max: 10, explanation: 'Positive initial engagement. Support appears likely if value proposition is clear.', confidence: 'medium' },
    { name: 'Relationship Feasibility', earned: 5, max: 5, explanation: 'Relationship is actively being developed. Low friction.', confidence: 'high' },
    { name: 'Evidence Quality', earned: 4, max: 5, explanation: 'Evidence from direct engagement and public extension records.', confidence: 'high' },
  ])
  insertContact(st2, { title: 'District Extension Agent — Agriculture', role_type: 'champion', department: 'OSU Extension', confidence: 'medium', verification: 'partial', is_primary: true })
  insertClaim(st2, { type: 'relationship', text: 'This is a composite stakeholder record. The role type of District Extension Agent has demonstrated high value as a champion for agricultural technology adoption in field engagements.', classification: 'simulated', confidence: 'medium' })
  insertActivity(st2, { type: 'meeting', description: 'Initial meeting with district extension agent at county field day. Very receptive to collaboration.', outcome: 'positive', date: '2026-04-10T10:00:00Z' })
  insertActivity(st2, { type: 'note', description: 'Agent expressed interest in co-hosting producer workshop. Follow-up scheduled.', date: '2026-06-10T09:00:00Z' })
  assignTags(st2, ['Partner Opportunity'])

  console.log('Demo data seeded successfully. 15 targets created across 5 market modes.')
}

seed()
