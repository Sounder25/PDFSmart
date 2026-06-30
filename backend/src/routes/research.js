import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

// Saved research profiles
router.get('/profiles', (req, res) => {
  const db = getDb()
  const { market_mode } = req.query
  let rows = market_mode
    ? db.prepare('SELECT * FROM saved_research_profiles WHERE market_mode = ? ORDER BY is_default DESC, created_at DESC').all(market_mode)
    : db.prepare('SELECT * FROM saved_research_profiles ORDER BY market_mode, is_default DESC, created_at DESC').all()
  res.json(rows.map(r => ({ ...r, criteria: JSON.parse(r.criteria_json) })))
})

router.post('/profiles', (req, res) => {
  const db = getDb()
  const { name, market_mode, criteria = {}, is_default = 0 } = req.body
  if (!name?.trim() || !market_mode) return res.status(400).json({ error: 'name and market_mode required' })
  const id = uuidv4()
  if (is_default) {
    db.prepare('UPDATE saved_research_profiles SET is_default = 0 WHERE market_mode = ?').run(market_mode)
  }
  db.prepare(`INSERT INTO saved_research_profiles (id, name, market_mode, criteria_json, is_default) VALUES (?, ?, ?, ?, ?)`)
    .run(id, name.trim(), market_mode, JSON.stringify(criteria), is_default ? 1 : 0)
  res.status(201).json(db.prepare('SELECT * FROM saved_research_profiles WHERE id = ?').get(id))
})

router.put('/profiles/:id', (req, res) => {
  const db = getDb()
  const profile = db.prepare('SELECT * FROM saved_research_profiles WHERE id = ?').get(req.params.id)
  if (!profile) return res.status(404).json({ error: 'Not found' })
  const { name, criteria, is_default } = req.body
  if (is_default) {
    db.prepare('UPDATE saved_research_profiles SET is_default = 0 WHERE market_mode = ?').run(profile.market_mode)
  }
  const updates = []
  const params = []
  if (name !== undefined) { updates.push('name = ?'); params.push(name) }
  if (criteria !== undefined) { updates.push('criteria_json = ?'); params.push(JSON.stringify(criteria)) }
  if (is_default !== undefined) { updates.push('is_default = ?'); params.push(is_default ? 1 : 0) }
  updates.push(`updated_at = datetime('now')`)
  params.push(req.params.id)
  db.prepare(`UPDATE saved_research_profiles SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM saved_research_profiles WHERE id = ?').get(req.params.id))
})

router.delete('/profiles/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM saved_research_profiles WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM saved_research_profiles WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// Research draft (persist unfinished form)
router.get('/draft', (req, res) => {
  const db = getDb()
  const draft = db.prepare('SELECT * FROM research_drafts WHERE id = ?').get('singleton')
  res.json(draft ? { ...draft, criteria: JSON.parse(draft.criteria_json) } : null)
})

router.put('/draft', (req, res) => {
  const db = getDb()
  const { market_mode, criteria = {} } = req.body
  db.prepare(`INSERT OR REPLACE INTO research_drafts (id, market_mode, criteria_json, updated_at) VALUES ('singleton', ?, ?, datetime('now'))`)
    .run(market_mode || 'commercial', JSON.stringify(criteria))
  res.json({ success: true })
})

// Run demo research
router.post('/run', (req, res) => {
  const db = getDb()
  const { market_mode, criteria = {}, desired_count = 5 } = req.body
  if (!market_mode) return res.status(400).json({ error: 'market_mode required' })

  // Generate demo results based on market mode and criteria
  const results = generateDemoResults(market_mode, criteria, Math.min(parseInt(desired_count) || 5, 10))

  res.json({
    demo_mode: true,
    disclaimer: 'Demo Research Mode: Results are generated for workflow demonstration and have not been independently verified through live external sources.',
    market_mode,
    criteria,
    results,
    generated_at: new Date().toISOString(),
  })
})

// Import research results to DB
router.post('/import', (req, res) => {
  const db = getDb()
  const { results = [] } = req.body
  if (!results.length) return res.status(400).json({ error: 'results array required' })

  const imported = []
  const duplicates = []

  for (const r of results) {
    const domainNorm = r.domain?.toLowerCase().trim()
    const nameNorm = r.name?.toLowerCase().trim()

    let dupe = null
    if (domainNorm) dupe = db.prepare('SELECT id, name FROM target_entities WHERE LOWER(domain) = ?').get(domainNorm)
    if (!dupe && nameNorm) dupe = db.prepare('SELECT id, name FROM target_entities WHERE LOWER(name) = ? AND market_mode = ?').get(nameNorm, r.market_mode)

    if (dupe) { duplicates.push({ result: r, existing: dupe }); continue }

    const id = uuidv4()
    db.prepare(`
      INSERT INTO target_entities (id, market_mode, entity_type, name, description, website, domain,
        primary_location, service_area, status, estimated_value, confidence_level, verification_status, is_demo,
        tags_json, industry, subindustry, naics_code, psc_code, opportunity_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, 'low', 'unverified', 1, '[]', ?, ?, ?, ?, ?)
    `).run(id, r.market_mode, r.entity_type || 'company', r.name, r.description || null, r.website || null, domainNorm || null,
      r.primary_location || null, r.service_area || null, r.estimated_value || null,
      r.industry || null, r.subindustry || null, r.naics_code || null, r.psc_code || null, r.opportunity_type || null)

    // Import claims
    if (r.claims?.length) {
      const claimStmt = db.prepare(`INSERT INTO research_claims (id, target_entity_id, claim_type, claim_text, classification, confidence_level) VALUES (?, ?, ?, ?, ?, ?)`)
      r.claims.forEach(c => claimStmt.run(uuidv4(), id, c.claim_type, c.claim_text, 'simulated', 'low'))
    }

    db.prepare(`INSERT INTO activities (id, target_entity_id, activity_type, description) VALUES (?, ?, 'import', 'Imported from demo research results')`)
      .run(uuidv4(), id)

    imported.push(id)
  }

  res.json({ imported: imported.length, duplicates: duplicates.length, duplicate_details: duplicates })
})

function generateDemoResults(marketMode, criteria, count) {
  const templates = {
    commercial: [
      { name: 'Northgate Industrial Solutions', entity_type: 'company', industry: 'Industrial Manufacturing', primary_location: 'Tulsa, OK', estimated_value: 125000, description: 'Mid-size industrial manufacturer. Available context suggests evaluating operational efficiency software. This is a demo result — verify before outreach.' },
      { name: 'Summit Professional Services Group', entity_type: 'company', industry: 'Professional Services', primary_location: 'Dallas, TX', estimated_value: 85000, description: 'Regional professional services firm. Available context suggests growth-stage company with technology needs. This is a demo result.' },
      { name: 'Clearwater AgTech Inc.', entity_type: 'company', industry: 'Agricultural Technology', primary_location: 'Wichita, KS', estimated_value: 210000, description: 'AgTech SaaS company targeting row-crop producers. Available context suggests active partnership development. This is a demo result.' },
      { name: 'Keystone Defense Fabrication', entity_type: 'company', industry: 'Defense Manufacturing', primary_location: 'Fort Worth, TX', estimated_value: 340000, description: 'Defense contractor fabricating structural components. Available context suggests recent SBIR award. This is a demo result.' },
      { name: 'Redline Logistics LLC', entity_type: 'company', industry: 'Transportation & Logistics', primary_location: 'Oklahoma City, OK', estimated_value: 95000, description: 'Regional freight logistics company. Available context suggests evaluating fleet management solutions. This is a demo result.' },
    ],
    government: [
      { name: 'USDA NRCS — Oklahoma State Office', entity_type: 'government_agency', industry: 'Federal Government', primary_location: 'Stillwater, OK', estimated_value: 450000, opportunity_type: 'Direct Agency Outreach', description: 'Federal conservation agency with active technology and data programs. This is a demo result.' },
      { name: 'Oklahoma Department of Agriculture', entity_type: 'government_agency', industry: 'State Government', primary_location: 'Oklahoma City, OK', estimated_value: 200000, opportunity_type: 'RFP', description: 'State agency managing agricultural programs. Available context suggests technology modernization initiative. This is a demo result.' },
      { name: 'Grady County Government', entity_type: 'government_agency', industry: 'County Government', primary_location: 'Chickasha, OK', estimated_value: 80000, opportunity_type: 'RFQ', description: 'County government with infrastructure needs. This is a demo result.' },
    ],
    private_client: [
      { name: 'Sunrise Creek Ranch (Demo Client)', entity_type: 'property', industry: 'Agriculture — Livestock', primary_location: 'Ardmore, OK', estimated_value: 22000, description: 'Large cattle operation with pasture management needs. Available context suggests drought impact. This is a demo result.' },
      { name: 'Prairie Wind Farm (Demo Client)', entity_type: 'property', industry: 'Agriculture — Row Crops', primary_location: 'Enid, OK', estimated_value: 18000, description: 'Row-crop operation interested in precision agriculture practices. This is a demo result.' },
    ],
    partner: [
      { name: 'Plains AgBusiness Alliance (Demo)', entity_type: 'nonprofit', industry: 'Agricultural Association', primary_location: 'Amarillo, TX', estimated_value: 60000, description: 'Regional agribusiness association with farmer-member network. This is a demo result.' },
      { name: 'TechBridge Rural Solutions (Demo)', entity_type: 'company', industry: 'Technology Consulting', primary_location: 'Lubbock, TX', estimated_value: 90000, description: 'Rural technology integrator with government and agricultural clients. This is a demo result.' },
    ],
    stakeholder: [
      { name: 'District Extension Agent — Northwest District (Demo)', entity_type: 'champion', industry: 'University Extension', primary_location: 'Woodward, OK', description: 'Composite stakeholder representing county extension agent role with high producer influence. This is a demo result.' },
      { name: 'State Agriculture Committee Member (Demo)', entity_type: 'champion', industry: 'State Government', primary_location: 'Oklahoma City, OK', description: 'Composite stakeholder representing state legislative agriculture committee influence. This is a demo result.' },
    ],
  }

  const pool = templates[marketMode] || templates.commercial
  const results = []
  const filterIndustry = criteria.industry?.toLowerCase()
  const filterLocation = criteria.locations?.[0]?.toLowerCase()

  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const base = pool[i % pool.length]
    const result = {
      ...base,
      id: `demo_${uuidv4()}`,
      market_mode: marketMode,
      domain: base.website ? base.website.replace('https://', '') : null,
      confidence_level: 'low',
      verification_status: 'unverified',
      is_demo: true,
      data_classification: 'simulated',
      claims: [
        {
          claim_type: 'description',
          claim_text: base.description,
          classification: 'simulated',
        }
      ],
      score_preview: {
        estimated: Math.floor(45 + Math.random() * 40),
        note: 'Preliminary estimate based on criteria match. Full scoring requires enrichment.',
      },
      data_gaps: [
        'Decision-maker contacts not yet identified',
        'Budget confirmation required',
        'Specific need or requirement not verified',
      ],
    }
    results.push(result)
  }

  return results
}

export default router
