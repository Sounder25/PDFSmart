import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

// Scoring models per market mode
const SCORING_MODELS = {
  commercial: [
    { key: 'strategic_fit', name: 'Strategic & Industry Fit', max: 20 },
    { key: 'need_alignment', name: 'Business Need Alignment', max: 20 },
    { key: 'budget', name: 'Budget Indicators', max: 15 },
    { key: 'decision_maker', name: 'Decision-Maker Accessibility', max: 15 },
    { key: 'trigger', name: 'Trigger Event Strength', max: 10 },
    { key: 'contactability', name: 'Contactability', max: 10 },
    { key: 'evidence', name: 'Evidence Quality & Freshness', max: 10 },
  ],
  government: [
    { key: 'mission', name: 'Mission Alignment', max: 15 },
    { key: 'requirement', name: 'Requirement Relevance', max: 15 },
    { key: 'funding', name: 'Funding Availability', max: 15 },
    { key: 'procurement', name: 'Procurement Maturity', max: 15 },
    { key: 'pathway', name: 'Acquisition Pathway', max: 10 },
    { key: 'eligibility', name: 'Eligibility & Compliance', max: 10 },
    { key: 'stakeholder', name: 'Stakeholder Access', max: 10 },
    { key: 'competitive', name: 'Competitive Position', max: 5 },
    { key: 'evidence', name: 'Evidence Quality', max: 5 },
  ],
  private_client: [
    { key: 'need_severity', name: 'Need Severity', max: 20 },
    { key: 'serviceability', name: 'Geographic Serviceability', max: 20 },
    { key: 'fit', name: 'Customer or Property Fit', max: 15 },
    { key: 'urgency', name: 'Urgency', max: 15 },
    { key: 'value', name: 'Estimated Opportunity Value', max: 10 },
    { key: 'contact_consent', name: 'Contactability & Consent', max: 10 },
    { key: 'referral', name: 'Referral Strength', max: 5 },
    { key: 'evidence', name: 'Evidence Quality', max: 5 },
  ],
  partner: [
    { key: 'alignment', name: 'Strategic Alignment', max: 20 },
    { key: 'capability', name: 'Capability Complement', max: 15 },
    { key: 'market_access', name: 'Market Access', max: 15 },
    { key: 'influence', name: 'Influence & Credibility', max: 15 },
    { key: 'mutual_benefit', name: 'Mutual Benefit', max: 15 },
    { key: 'feasibility', name: 'Relationship Feasibility', max: 10 },
    { key: 'geography', name: 'Geographic Relevance', max: 5 },
    { key: 'evidence', name: 'Evidence Quality', max: 5 },
  ],
  stakeholder: [
    { key: 'mission', name: 'Mission Alignment', max: 20 },
    { key: 'influence', name: 'Influence', max: 20 },
    { key: 'authority', name: 'Authority or Access', max: 15 },
    { key: 'credibility', name: 'Credibility', max: 15 },
    { key: 'network', name: 'Network Relevance', max: 10 },
    { key: 'support', name: 'Likelihood of Support', max: 10 },
    { key: 'feasibility', name: 'Relationship Feasibility', max: 5 },
    { key: 'evidence', name: 'Evidence Quality', max: 5 },
  ],
}

function classifyScore(score) {
  if (score >= 85) return 'priority'
  if (score >= 70) return 'strong'
  if (score >= 55) return 'possible'
  return 'low_priority'
}

export function calculateScore(targetId, marketMode, dimensions) {
  const db = getDb()
  const model = SCORING_MODELS[marketMode]
  if (!model) throw new Error(`Unknown market mode: ${marketMode}`)

  const total = dimensions.reduce((sum, d) => sum + (d.points_earned || 0), 0)
  const classification = classifyScore(total)

  const recId = uuidv4()
  db.prepare(`
    INSERT OR REPLACE INTO score_records (id, target_entity_id, scoring_model, total_score, score_classification, confidence_level, calculated_at)
    VALUES (?, ?, ?, ?, ?, 'medium', datetime('now'))
  `).run(recId, targetId, marketMode, total, classification)

  const dimStmt = db.prepare(`
    INSERT INTO score_dimensions (id, score_record_id, dimension_name, points_earned, maximum_points, explanation, confidence_level, missing_data_penalty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  dimensions.forEach(d => {
    const modelDim = model.find(m => m.key === d.key || m.name === d.dimension_name)
    const maxPts = d.maximum_points || modelDim?.max || 10
    const earned = Math.min(maxPts, Math.max(0, d.points_earned || 0)) // enforce 0 ≤ earned ≤ max
    dimStmt.run(uuidv4(), recId, d.dimension_name || d.key, earned,
      maxPts, d.explanation || '', d.confidence_level || 'medium', d.missing_data_penalty || 0)
  })

  return { id: recId, total_score: total, score_classification: classification }
}

// Get score for target
router.get('/:targetId', (req, res) => {
  const db = getDb()
  const score = db.prepare('SELECT * FROM score_records WHERE target_entity_id = ? ORDER BY calculated_at DESC LIMIT 1').get(req.params.targetId)
  if (!score) return res.json(null)
  const dims = db.prepare('SELECT * FROM score_dimensions WHERE score_record_id = ?').all(score.id)
  res.json({ ...score, dimensions: dims })
})

// Get scoring model for a market mode
router.get('/model/:marketMode', (req, res) => {
  const model = SCORING_MODELS[req.params.marketMode]
  if (!model) return res.status(404).json({ error: 'Unknown market mode' })
  res.json({ market_mode: req.params.marketMode, dimensions: model })
})

// Recalculate (auto-score) based on available data
router.post('/calculate/:targetId', (req, res) => {
  const db = getDb()
  const target = db.prepare('SELECT * FROM target_entities WHERE id = ?').get(req.params.targetId)
  if (!target) return res.status(404).json({ error: 'Target not found' })

  const model = SCORING_MODELS[target.market_mode]
  if (!model) return res.status(400).json({ error: 'No scoring model for this market mode' })

  const claims = db.prepare('SELECT * FROM research_claims WHERE target_entity_id = ?').all(target.id)
  const contacts = db.prepare('SELECT * FROM contacts WHERE target_entity_id = ?').all(target.id)
  const activities = db.prepare('SELECT * FROM activities WHERE target_entity_id = ?').all(target.id)

  // Auto-scoring heuristic based on available data richness
  const hasDesc = target.description && target.description.length > 50
  const hasLocation = !!target.primary_location
  const hasContacts = contacts.length > 0
  const hasVerifiedContact = contacts.some(c => c.verification_status !== 'unverified')
  const claimCount = claims.length
  const hasInferredClaims = claims.some(c => c.classification === 'inferred')
  const hasSourcedClaims = claims.some(c => c.classification === 'sourced')
  const confidenceMultiplier = { low: 0.5, medium: 0.75, high: 0.9, verified: 1.0 }[target.confidence_level] || 0.6
  const isEnriched = !!target.last_enriched_at

  const dimensions = model.map(dim => {
    let base = Math.round(dim.max * 0.5 * confidenceMultiplier)
    let explanation = 'Score based on available data richness. Additional research recommended.'
    let penalty = 0

    if (dim.key === 'evidence' || dim.name.includes('Evidence')) {
      if (hasSourcedClaims) { base = Math.round(dim.max * 0.85); explanation = 'Sourced claims present improve evidence score.' }
      else if (hasInferredClaims) { base = Math.round(dim.max * 0.6); explanation = 'Only inferred claims present. Verification recommended.'; penalty = 1 }
      else { base = Math.round(dim.max * 0.3); explanation = 'Limited evidence available.'; penalty = 2 }
      if (isEnriched) base = Math.min(dim.max, base + 1)
    } else if (dim.key === 'decision_maker' || dim.key === 'stakeholder' || dim.key === 'contact_consent') {
      if (hasVerifiedContact) { base = Math.round(dim.max * 0.8); explanation = 'Contacts present with at least partial verification.' }
      else if (hasContacts) { base = Math.round(dim.max * 0.6); explanation = 'Contacts present but unverified.' }
      else { base = Math.round(dim.max * 0.3); explanation = 'No contacts identified. Research needed.'; penalty = Math.round(dim.max * 0.2) }
    } else if (dim.key === 'contactability') {
      base = hasContacts ? Math.round(dim.max * 0.75) : Math.round(dim.max * 0.35)
      explanation = hasContacts ? 'Contact records present.' : 'No contact path established.'
    }

    return {
      key: dim.key, dimension_name: dim.name, points_earned: Math.min(dim.max, base),
      maximum_points: dim.max, explanation, confidence_level: target.confidence_level,
      missing_data_penalty: penalty
    }
  })

  const result = calculateScore(target.id, target.market_mode, dimensions)
  db.prepare(`UPDATE target_entities SET updated_at = datetime('now') WHERE id = ?`).run(target.id)

  res.json(result)
})

export default router
