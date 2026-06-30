import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

const VALID_STATUSES = ['draft', 'active', 'paused', 'completed', 'archived']

router.get('/', (req, res) => {
  const db = getDb()
  const { status, market_mode, origin_type } = req.query
  const conditions = []
  const params = []

  if (status) { conditions.push('status = ?'); params.push(status) }
  if (market_mode) { conditions.push('market_mode = ?'); params.push(market_mode) }
  if (origin_type) { conditions.push('origin_type = ?'); params.push(origin_type) }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  const rows = db.prepare(`SELECT * FROM campaigns ${where} ORDER BY updated_at DESC`).all(...params)
  res.json(rows)
})

router.get('/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Campaign not found' })
  const steps = db.prepare('SELECT * FROM campaign_steps WHERE campaign_id = ? ORDER BY sequence_order').all(req.params.id)
  res.json({ ...row, steps })
})

router.post('/', (req, res) => {
  const db = getDb()
  const { name, market_mode, status = 'draft', description, origin_type, campaign_type, target_entity_id } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name required' })
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` })

  const id = uuidv4()
  db.prepare(`
    INSERT INTO campaigns (id, name, market_mode, status, description, origin_type, campaign_type, target_entity_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name.trim(), market_mode || null, status, description || null, origin_type || null, campaign_type || null, target_entity_id || null)

  res.status(201).json(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id)
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

  const { name, market_mode, status, description, origin_type, campaign_type, target_entity_id } = req.body
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: `Invalid status` })

  const fields = []
  const params = []
  if (name !== undefined) { fields.push('name = ?'); params.push(name) }
  if (market_mode !== undefined) { fields.push('market_mode = ?'); params.push(market_mode) }
  if (status !== undefined) { fields.push('status = ?'); params.push(status) }
  if (description !== undefined) { fields.push('description = ?'); params.push(description) }
  if (origin_type !== undefined) { fields.push('origin_type = ?'); params.push(origin_type) }
  if (campaign_type !== undefined) { fields.push('campaign_type = ?'); params.push(campaign_type) }
  if (target_entity_id !== undefined) { fields.push('target_entity_id = ?'); params.push(target_entity_id) }
  fields.push(`updated_at = datetime('now')`)
  params.push(req.params.id)

  db.prepare(`UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM campaigns WHERE id = ?').get(req.params.id))
    return res.status(404).json({ error: 'Campaign not found' })
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
