import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

const SIGNAL_TYPES = [
  'drought_monitor', 'usda_report', 'fsa_announcement', 'nrcs_program',
  'market_price_alert', 'weather_event', 'pest_disease', 'regulatory_change',
  'funding_announcement', 'contract_solicitation', 'grant_opportunity',
  'conference_event', 'industry_trend', 'county_initiative', 'state_program', 'other'
]

// List signals
router.get('/', (req, res) => {
  const db = getDb()
  const { state, signal_type, status, severity, urgency, topic, limit = 50, page = 1 } = req.query
  const conditions = []
  const params = []

  if (state) { conditions.push('state = ?'); params.push(state) }
  if (signal_type) { conditions.push('signal_type = ?'); params.push(signal_type) }
  if (status) { conditions.push('status = ?'); params.push(status) }
  if (severity) { conditions.push('severity = ?'); params.push(severity) }
  if (urgency) { conditions.push('urgency = ?'); params.push(urgency) }
  if (topic) { conditions.push('topic LIKE ?'); params.push(`%${topic}%`) }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  const lim = Math.min(parseInt(limit) || 50, 100)
  const off = ((parseInt(page) || 1) - 1) * lim

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM ecosystem_signals ${where}`).get(...params).cnt
  const rows = db.prepare(`SELECT * FROM ecosystem_signals ${where} ORDER BY urgency DESC, created_at DESC LIMIT ? OFFSET ?`).all(...params, lim, off)

  res.json({ data: rows.map(parseSignal), total, page: parseInt(page) || 1, limit: lim })
})

// Get single signal
router.get('/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM ecosystem_signals WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Signal not found' })
  res.json(parseSignal(row))
})

// Create signal
router.post('/', (req, res) => {
  const db = getDb()
  const {
    target_entity_id, topic, signal_type, state, counties = [],
    industry, species, severity = 'medium', urgency = 'medium',
    source, published_date, operational_implication, funding_implication,
    contract_implication, marketing_implication, status = 'new', is_demo = 0
  } = req.body

  if (!topic?.trim()) return res.status(400).json({ error: 'topic required' })
  if (!signal_type) return res.status(400).json({ error: 'signal_type required' })

  const id = uuidv4()
  db.prepare(`
    INSERT INTO ecosystem_signals (
      id, target_entity_id, topic, signal_type, state, counties_json,
      industry, species, severity, urgency, source, published_date,
      operational_implication, funding_implication, contract_implication,
      marketing_implication, status, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, target_entity_id || null, topic.trim(), signal_type, state || null,
    JSON.stringify(counties), industry || null, species || null,
    severity, urgency, source || null, published_date || null,
    operational_implication || null, funding_implication || null,
    contract_implication || null, marketing_implication || null,
    status, is_demo ? 1 : 0
  )

  // Log activity on linked target if provided
  if (target_entity_id) {
    try {
      db.prepare(`INSERT INTO activities (id, target_entity_id, activity_type, agri_type, description) VALUES (?, ?, 'research', 'signal_reviewed', ?)`)
        .run(uuidv4(), target_entity_id, `Ecosystem Signal recorded: ${topic}`)
    } catch (_) {}
  }

  res.status(201).json(parseSignal(db.prepare('SELECT * FROM ecosystem_signals WHERE id = ?').get(id)))
})

// Update signal
router.put('/:id', (req, res) => {
  const db = getDb()
  const signal = db.prepare('SELECT * FROM ecosystem_signals WHERE id = ?').get(req.params.id)
  if (!signal) return res.status(404).json({ error: 'Signal not found' })

  const fields = ['topic','signal_type','state','industry','species','severity','urgency',
    'source','published_date','operational_implication','funding_implication',
    'contract_implication','marketing_implication','status','target_entity_id']
  const updates = []
  const params = []

  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]) }
  }
  if (req.body.counties !== undefined) { updates.push('counties_json = ?'); params.push(JSON.stringify(req.body.counties)) }
  updates.push(`updated_at = datetime('now')`)
  params.push(req.params.id)

  db.prepare(`UPDATE ecosystem_signals SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  res.json(parseSignal(db.prepare('SELECT * FROM ecosystem_signals WHERE id = ?').get(req.params.id)))
})

// Delete signal
router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM ecosystem_signals WHERE id = ?').get(req.params.id))
    return res.status(404).json({ error: 'Signal not found' })
  db.prepare('DELETE FROM ecosystem_signals WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// Seed demo signals
router.post('/seed/demo', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM ecosystem_signals WHERE is_demo = 1').get().cnt
  if (existing > 0) return res.json({ seeded: 0, message: 'Demo signals already exist' })

  const demos = [
    {
      topic: 'Drought Monitor — D3 Exceptional Drought, SW Oklahoma', signal_type: 'drought_monitor',
      state: 'OK', counties: ['Jackson','Harmon','Greer'], severity: 'critical', urgency: 'immediate',
      operational_implication: 'Producers facing livestock water shortages and pasture failures. Emergency grazing programs likely activating.',
      funding_implication: 'FSA Livestock Forage Disaster Program (LFP) and Emergency Livestock Assistance Program (ELAP) likely triggering in affected counties.',
      contract_implication: 'County government emergency water infrastructure contracts possible.',
      marketing_implication: 'Target producers in these 3 counties for immediate outreach on drought response solutions.',
    },
    {
      topic: 'USDA NRCS EQIP Signup — FY2026 High Tunnel Priority', signal_type: 'nrcs_program',
      state: 'OK', counties: [], severity: 'medium', urgency: 'high',
      operational_implication: 'NRCS opening EQIP signup with high-tunnel and specialty crop priorities.',
      funding_implication: 'Up to $450K available in Oklahoma for qualifying producers. Signup window is 60 days.',
      contract_implication: null,
      marketing_implication: 'Contact specialty crop producers who have expressed interest in expansion. Timing-sensitive.',
    },
    {
      topic: 'USDA Market Facilitation — Beef Export Price Alert', signal_type: 'market_price_alert',
      state: 'OK', counties: [], severity: 'low', urgency: 'medium',
      operational_implication: 'Fed cattle prices holding $5-8 above year-ago levels. Positive market for stocker/feeder operations.',
      funding_implication: null,
      contract_implication: 'Favorable conditions for livestock marketing contracts and pre-harvest arrangements.',
      marketing_implication: 'Positive market conditions — good timing for capability briefings to cattle operations.',
    },
    {
      topic: 'Oklahoma Dept of Agriculture — Rural Water System Funding Announcement', signal_type: 'state_program',
      state: 'OK', counties: ['Custer','Dewey','Woodward'], severity: 'medium', urgency: 'high',
      operational_implication: 'State rural water program opening application window for FY2026 infrastructure grants.',
      funding_implication: '$2.4M available across 3 grant tiers. Deadline in 45 days.',
      contract_implication: 'Engineering, surveying, and installation contracts will follow awards.',
      marketing_implication: 'Contact rural water districts and county governments in these counties with capability statement.',
    },
    {
      topic: 'Fall Armyworm Outbreak — Northeast Oklahoma Pasture Damage Reports', signal_type: 'pest_disease',
      state: 'OK', counties: ['Craig','Ottawa','Delaware'], severity: 'high', urgency: 'high',
      operational_implication: 'Widespread armyworm damage to bermudagrass pastures. Extension alert issued.',
      funding_implication: 'USDA Emergency Conservation Program may be triggered if county disaster declarations follow.',
      contract_implication: null,
      marketing_implication: 'Outreach opportunity for monitoring services; coordinate with extension agents.',
    },
  ]

  const stmt = db.prepare(`
    INSERT INTO ecosystem_signals (
      id, topic, signal_type, state, counties_json, severity, urgency,
      operational_implication, funding_implication, contract_implication, marketing_implication, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `)

  let seeded = 0
  for (const d of demos) {
    stmt.run(uuidv4(), d.topic, d.signal_type, d.state, JSON.stringify(d.counties || []),
      d.severity, d.urgency, d.operational_implication || null, d.funding_implication || null,
      d.contract_implication || null, d.marketing_implication || null)
    seeded++
  }

  res.json({ seeded, message: `${seeded} demo signals created` })
})

// Available signal types
router.get('/meta/types', (req, res) => {
  res.json({ signal_types: SIGNAL_TYPES })
})

function parseSignal(row) {
  return { ...row, counties: JSON.parse(row.counties_json || '[]') }
}

export default router
