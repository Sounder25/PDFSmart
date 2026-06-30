import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const { target_entity_id } = req.query
  if (!target_entity_id) return res.status(400).json({ error: 'target_entity_id required' })
  const claims = db.prepare('SELECT * FROM research_claims WHERE target_entity_id = ? ORDER BY created_at DESC').all(target_entity_id)
  const withSources = claims.map(c => ({
    ...c,
    sources: db.prepare('SELECT * FROM research_sources WHERE research_claim_id = ?').all(c.id)
  }))
  res.json(withSources)
})

router.post('/', (req, res) => {
  const db = getDb()
  const { target_entity_id, claim_type, claim_text, classification = 'inferred', confidence_level = 'medium' } = req.body
  if (!target_entity_id || !claim_type || !claim_text) return res.status(400).json({ error: 'target_entity_id, claim_type, claim_text required' })
  const id = uuidv4()
  db.prepare(`INSERT INTO research_claims (id, target_entity_id, claim_type, claim_text, classification, confidence_level) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, target_entity_id, claim_type, claim_text, classification, confidence_level)
  res.status(201).json(db.prepare('SELECT * FROM research_claims WHERE id = ?').get(id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM research_claims WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM research_claims WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
