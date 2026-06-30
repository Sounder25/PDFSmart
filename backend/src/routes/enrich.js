import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

// Analyze target for enrichment opportunities
router.get('/analyze/:targetId', (req, res) => {
  const db = getDb()
  const target = db.prepare('SELECT * FROM target_entities WHERE id = ?').get(req.params.targetId)
  if (!target) return res.status(404).json({ error: 'Target not found' })

  const contacts = db.prepare('SELECT * FROM contacts WHERE target_entity_id = ?').all(target.id)
  const claims = db.prepare('SELECT * FROM research_claims WHERE target_entity_id = ?').all(target.id)

  const missingFields = []
  const staleFields = []
  const lowConfidenceFields = []

  const FIELDS = [
    { key: 'description', label: 'Description' },
    { key: 'website', label: 'Website' },
    { key: 'domain', label: 'Domain' },
    { key: 'primary_location', label: 'Primary Location' },
    { key: 'industry', label: 'Industry' },
    { key: 'estimated_value', label: 'Estimated Value' },
  ]

  FIELDS.forEach(f => {
    if (!target[f.key]) missingFields.push({ field: f.key, label: f.label })
  })

  if (contacts.length === 0) missingFields.push({ field: 'contacts', label: 'Contacts / Decision Makers' })
  if (claims.length === 0) missingFields.push({ field: 'research_claims', label: 'Research Claims' })
  if (target.confidence_level === 'low') lowConfidenceFields.push({ field: 'confidence_level', label: 'Overall Confidence', current: 'low' })
  if (target.verification_status === 'unverified') lowConfidenceFields.push({ field: 'verification_status', label: 'Verification Status', current: 'unverified' })

  const staleThreshold = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  if (target.last_enriched_at && target.last_enriched_at < staleThreshold) {
    staleFields.push({ field: 'last_enriched_at', label: 'Last Enrichment', current: target.last_enriched_at })
  }

  res.json({ target, missing_fields: missingFields, stale_fields: staleFields, low_confidence_fields: lowConfidenceFields })
})

// Generate proposed enrichment changes
router.post('/propose/:targetId', (req, res) => {
  const db = getDb()
  const target = db.prepare('SELECT * FROM target_entities WHERE id = ?').get(req.params.targetId)
  if (!target) return res.status(404).json({ error: 'Target not found' })

  // Generate demo enrichment proposals
  const proposals = []
  const now = new Date().toISOString()

  if (!target.industry) {
    proposals.push({
      id: uuidv4(),
      field: 'industry',
      field_label: 'Industry',
      old_value: null,
      new_value: inferIndustry(target),
      classification: 'inferred',
      confidence: 'medium',
      old_confidence: null,
      new_confidence: 'medium',
      source: 'Inferred from organization name and description context',
      caution: 'Available context suggests this industry classification. Verify before relying on it.',
      protectable: false,
    })
  }

  if (!target.estimated_value && target.market_mode !== 'stakeholder') {
    proposals.push({
      id: uuidv4(),
      field: 'estimated_value',
      field_label: 'Estimated Value',
      old_value: null,
      new_value: estimateValue(target),
      classification: 'inferred',
      confidence: 'low',
      old_confidence: null,
      new_confidence: 'low',
      source: 'Estimated from market mode and organization type norms. Not a verified figure.',
      caution: 'This is a rough estimate. It should be replaced with a verified figure as soon as possible.',
      protectable: false,
    })
  }

  if (!target.primary_location && target.market_mode === 'private_client') {
    proposals.push({
      id: uuidv4(),
      field: 'primary_location',
      field_label: 'Primary Location',
      old_value: null,
      new_value: 'Location unknown — requires manual entry',
      classification: 'unknown',
      confidence: 'low',
      caution: 'Location for private client records should be entered manually.',
      protectable: false,
    })
  }

  if (target.confidence_level === 'low') {
    proposals.push({
      id: uuidv4(),
      field: 'confidence_level',
      field_label: 'Confidence Level',
      old_value: 'low',
      new_value: 'medium',
      classification: 'inferred',
      confidence: 'medium',
      old_confidence: 'low',
      new_confidence: 'medium',
      source: 'Confidence upgraded based on presence of description and research claims.',
      caution: 'Confidence elevation is based on data richness, not independent verification.',
      protectable: false,
    })
  }

  // New research claim proposals
  const claimProposals = []
  if (target.description && target.description.length > 50) {
    const existingClaims = db.prepare('SELECT * FROM research_claims WHERE target_entity_id = ?').all(target.id)
    if (!existingClaims.some(c => c.claim_type === 'business_context')) {
      claimProposals.push({
        id: uuidv4(),
        type: 'business_context',
        text: `Available context from the target description: "${target.description.substring(0, 200)}${target.description.length > 200 ? '...' : ''}"`,
        classification: 'inferred',
        confidence: 'medium',
        note: 'Derived from existing description. Classify as User Provided if you entered this description yourself.',
      })
    }
  }

  res.json({
    demo_mode: true,
    disclaimer: 'Enrichment proposals are generated for workflow demonstration. No external sources have been queried.',
    target_id: target.id,
    proposals,
    claim_proposals: claimProposals,
    generated_at: now,
  })
})

// Accept enrichment changes
router.post('/accept/:targetId', (req, res) => {
  const db = getDb()
  const target = db.prepare('SELECT * FROM target_entities WHERE id = ?').get(req.params.targetId)
  if (!target) return res.status(404).json({ error: 'Target not found' })

  const { accepted = [], rejected = [], claim_proposals = [] } = req.body
  const historyStmt = db.prepare(`
    INSERT INTO enrichment_history (id, target_entity_id, field_name, old_value, new_value, old_confidence, new_confidence, classification, action, enriched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `)

  const FIELD_CONFIDENCE_ORDER = ['verified', 'sourced', 'user_provided', 'inferred', 'simulated', 'unknown']

  for (const proposal of accepted) {
    const { field, old_value, new_value, classification, old_confidence, new_confidence } = proposal

    if (field === 'confidence_level' || field === 'verification_status' || field === 'industry' || field === 'estimated_value' || field === 'primary_location') {
      // Protection: never overwrite verified/sourced with lower-confidence data
      const currentConfidenceRank = FIELD_CONFIDENCE_ORDER.indexOf(target.confidence_level)
      const newConfidenceRank = FIELD_CONFIDENCE_ORDER.indexOf(classification)
      if (currentConfidenceRank < newConfidenceRank && target.verification_status === 'verified') {
        historyStmt.run(uuidv4(), target.id, field, old_value, new_value, old_confidence, new_confidence, classification, 'rejected')
        continue
      }

      if (field !== 'confidence_level' && field !== 'verification_status') {
        db.prepare(`UPDATE target_entities SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`).run(new_value, target.id)
      } else {
        db.prepare(`UPDATE target_entities SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`).run(new_value, target.id)
      }
    }

    historyStmt.run(uuidv4(), target.id, field, String(old_value ?? ''), String(new_value ?? ''), old_confidence || null, new_confidence || null, classification || 'inferred', 'accepted')
  }

  for (const proposal of rejected) {
    historyStmt.run(uuidv4(), target.id, proposal.field, String(proposal.old_value ?? ''), String(proposal.new_value ?? ''), proposal.old_confidence || null, proposal.new_confidence || null, proposal.classification || 'inferred', 'rejected')
  }

  // Accept claim proposals
  if (claim_proposals.length) {
    const claimStmt = db.prepare(`INSERT INTO research_claims (id, target_entity_id, claim_type, claim_text, classification, confidence_level) VALUES (?, ?, ?, ?, ?, ?)`)
    for (const cp of claim_proposals) {
      claimStmt.run(uuidv4(), target.id, cp.type, cp.text, cp.classification || 'inferred', cp.confidence || 'medium')
    }
  }

  // Update enrichment timestamp and recalculate score flag
  db.prepare(`UPDATE target_entities SET last_enriched_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(target.id)

  // Log activity
  db.prepare(`INSERT INTO activities (id, target_entity_id, activity_type, description, outcome) VALUES (?, ?, 'enrichment', ?, ?)`)
    .run(uuidv4(), target.id, `Enrichment completed: ${accepted.length} changes accepted, ${rejected.length} rejected`, `${accepted.length} accepted`)

  const updated = db.prepare('SELECT * FROM target_entities WHERE id = ?').get(target.id)
  res.json({ success: true, accepted: accepted.length, rejected: rejected.length, target: updated })
})

// Enrichment history for a target
router.get('/history/:targetId', (req, res) => {
  const db = getDb()
  res.json(db.prepare('SELECT * FROM enrichment_history WHERE target_entity_id = ? ORDER BY enriched_at DESC').all(req.params.targetId))
})

function inferIndustry(target) {
  const name = (target.name || '').toLowerCase()
  const desc = (target.description || '').toLowerCase()
  if (name.includes('agri') || name.includes('farm') || desc.includes('agriculture')) return 'Agriculture'
  if (name.includes('tech') || name.includes('software') || desc.includes('saas')) return 'Technology'
  if (name.includes('manufactur') || desc.includes('manufacturing')) return 'Manufacturing'
  if (name.includes('government') || target.market_mode === 'government') return 'Government'
  if (name.includes('service') || desc.includes('services')) return 'Professional Services'
  return 'General Business'
}

function estimateValue(target) {
  const estimates = { commercial: 100000, government: 300000, private_client: 15000, partner: 75000, stakeholder: null }
  return estimates[target.market_mode] || null
}

export default router
