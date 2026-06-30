import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

const CLASSIFICATION_TYPES = [
  'Company Stated', 'Verified', 'Supported by Internal Evidence',
  'Performance Target', 'Planned Capability', 'Current Capability',
  'Pilot Ready', 'Future Offering', 'Marketing Claim',
  'Restricted Claim', 'Requires Verification', 'Unknown'
]

const READINESS_STATUSES = [
  'Available Now', 'Limited Availability', 'Pilot Ready',
  'Under Development', 'Partner Dependent', 'Approval Dependent',
  'Future Capability', 'Inactive'
]

const PROFILE_FIELDS = [
  'description', 'mission', 'products', 'services', 'capabilities',
  'target_customers', 'target_industries', 'geographic_markets',
  'pricing_notes', 'differentiators', 'proof_points',
  'team_qualifications', 'procurement_readiness', 'funding_readiness',
  'approved_claims', 'restricted_claims', 'calls_to_action'
]

// --- Business Profile ---

router.get('/profile', (req, res) => {
  const db = getDb()
  let profile = db.prepare('SELECT * FROM business_profile WHERE id = ?').get('singleton')
  if (!profile) {
    db.prepare(`INSERT INTO business_profile (id) VALUES ('singleton')`).run()
    profile = db.prepare('SELECT * FROM business_profile WHERE id = ?').get('singleton')
  }
  res.json(parseProfile(profile))
})

router.put('/profile', (req, res) => {
  const db = getDb()
  const jsonFields = ['products','services','capabilities','target_customers','target_industries',
    'geographic_markets','differentiators','proof_points','approved_claims','restricted_claims','calls_to_action']
  const textFields = ['business_name','description','mission','pricing_notes',
    'team_qualifications','procurement_readiness','funding_readiness']

  const updates = [`updated_at = datetime('now')`]
  const params = []

  for (const f of textFields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]) }
  }
  for (const f of jsonFields) {
    if (req.body[f] !== undefined) { updates.push(`${f}_json = ?`); params.push(JSON.stringify(req.body[f])) }
  }

  // Ensure singleton exists
  db.prepare(`INSERT OR IGNORE INTO business_profile (id) VALUES ('singleton')`).run()
  if (updates.length > 1) {
    params.push('singleton')
    db.prepare(`UPDATE business_profile SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  }

  res.json(parseProfile(db.prepare('SELECT * FROM business_profile WHERE id = ?').get('singleton')))
})

// --- Documents ---

router.get('/documents', (req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT id, filename, original_name, file_type, file_size, description, extraction_status, uploaded_at FROM business_documents ORDER BY uploaded_at DESC').all()
  res.json(rows)
})

router.post('/documents', (req, res) => {
  const db = getDb()
  const { original_name, file_type, file_size, description, content_base64 } = req.body
  if (!original_name?.trim()) return res.status(400).json({ error: 'original_name required' })
  if (!content_base64) return res.status(400).json({ error: 'content_base64 required' })

  const id = uuidv4()
  const filename = `${id}_${original_name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  db.prepare(`
    INSERT INTO business_documents (id, filename, original_name, file_type, file_size, description, content_base64)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, filename, original_name.trim(), file_type || 'application/octet-stream', file_size || null, description || null, content_base64)

  res.status(201).json(db.prepare('SELECT id, filename, original_name, file_type, file_size, description, extraction_status, uploaded_at FROM business_documents WHERE id = ?').get(id))
})

router.delete('/documents/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM business_documents WHERE id = ?').get(req.params.id))
    return res.status(404).json({ error: 'Document not found' })
  db.prepare('DELETE FROM business_documents WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// --- Extractions ---

router.get('/documents/:docId/extractions', (req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM document_extractions WHERE document_id = ? ORDER BY extracted_at ASC').all(req.params.docId)
  res.json(rows.map(parseExtraction))
})

router.post('/documents/:docId/extractions', (req, res) => {
  const db = getDb()
  const doc = db.prepare('SELECT id FROM business_documents WHERE id = ?').get(req.params.docId)
  if (!doc) return res.status(404).json({ error: 'Document not found' })

  const {
    extraction_type, extracted_text, source_page, source_section,
    classification = 'Unknown', readiness_status = 'Unknown',
    marketing_approval = 0, qualification_required = 0,
    allowed_channels = [], prohibited_contexts = [], profile_field
  } = req.body

  if (!extracted_text?.trim()) return res.status(400).json({ error: 'extracted_text required' })

  const id = uuidv4()
  db.prepare(`
    INSERT INTO document_extractions (
      id, document_id, extraction_type, extracted_text, source_page, source_section,
      classification, readiness_status, marketing_approval, qualification_required,
      allowed_channels_json, prohibited_contexts_json, profile_field
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, req.params.docId, extraction_type || 'claim', extracted_text.trim(),
    source_page || null, source_section || null, classification, readiness_status,
    marketing_approval ? 1 : 0, qualification_required ? 1 : 0,
    JSON.stringify(allowed_channels), JSON.stringify(prohibited_contexts), profile_field || null
  )

  res.status(201).json(parseExtraction(db.prepare('SELECT * FROM document_extractions WHERE id = ?').get(id)))
})

router.put('/extractions/:id', (req, res) => {
  const db = getDb()
  const ext = db.prepare('SELECT id FROM document_extractions WHERE id = ?').get(req.params.id)
  if (!ext) return res.status(404).json({ error: 'Extraction not found' })

  const fields = ['extraction_type','extracted_text','source_page','source_section','classification',
    'readiness_status','marketing_approval','qualification_required','profile_field','approval_status']
  const updates = []
  const params = []

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`)
      params.push(typeof req.body[f] === 'boolean' ? (req.body[f] ? 1 : 0) : req.body[f])
    }
  }
  if (req.body.allowed_channels !== undefined) { updates.push('allowed_channels_json = ?'); params.push(JSON.stringify(req.body.allowed_channels)) }
  if (req.body.prohibited_contexts !== undefined) { updates.push('prohibited_contexts_json = ?'); params.push(JSON.stringify(req.body.prohibited_contexts)) }
  if (req.body.approval_status === 'approved') { updates.push(`approved_at = datetime('now')`); }

  if (!updates.length) return res.json(parseExtraction(db.prepare('SELECT * FROM document_extractions WHERE id = ?').get(req.params.id)))

  params.push(req.params.id)
  db.prepare(`UPDATE document_extractions SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  res.json(parseExtraction(db.prepare('SELECT * FROM document_extractions WHERE id = ?').get(req.params.id)))
})

router.delete('/extractions/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM document_extractions WHERE id = ?').get(req.params.id))
    return res.status(404).json({ error: 'Extraction not found' })
  db.prepare('DELETE FROM document_extractions WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// Bulk approve/reject extractions
router.post('/extractions/bulk-approve', (req, res) => {
  const db = getDb()
  const { ids = [], action } = req.body
  if (!ids.length) return res.status(400).json({ error: 'ids required' })
  if (!['approved','rejected'].includes(action)) return res.status(400).json({ error: 'action must be approved or rejected' })

  const update = db.transaction(() => {
    const stmt = db.prepare(`UPDATE document_extractions SET approval_status = ?, approved_at = CASE WHEN ? = 'approved' THEN datetime('now') ELSE NULL END WHERE id = ?`)
    for (const id of ids) stmt.run(action, action, id)
  })
  update()

  res.json({ updated: ids.length, action })
})

// Pending extractions (all docs)
router.get('/extractions/pending', (req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT de.*, bd.original_name as document_name
    FROM document_extractions de
    JOIN business_documents bd ON de.document_id = bd.id
    WHERE de.approval_status = 'pending'
    ORDER BY de.extracted_at DESC
  `).all()
  res.json(rows.map(parseExtraction))
})

// Metadata endpoints
router.get('/meta/classifications', (req, res) => res.json({ classifications: CLASSIFICATION_TYPES }))
router.get('/meta/readiness-statuses', (req, res) => res.json({ readiness_statuses: READINESS_STATUSES }))
router.get('/meta/profile-fields', (req, res) => res.json({ profile_fields: PROFILE_FIELDS }))

function parseProfile(p) {
  const jsonFields = ['products','services','capabilities','target_customers','target_industries',
    'geographic_markets','differentiators','proof_points','approved_claims','restricted_claims','calls_to_action']
  const result = { ...p }
  for (const f of jsonFields) {
    const key = `${f}_json`
    result[f] = JSON.parse(p[key] || '[]')
    delete result[key]
  }
  return result
}

function parseExtraction(e) {
  return {
    ...e,
    allowed_channels: JSON.parse(e.allowed_channels_json || '[]'),
    prohibited_contexts: JSON.parse(e.prohibited_contexts_json || '[]'),
  }
}

export default router
