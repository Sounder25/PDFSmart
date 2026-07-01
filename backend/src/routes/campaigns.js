import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'

const router = Router()

const VALID_TYPES = ['book_launch', 'investor_round', 'brand_awareness', 'farmer_outreach', 'government_outreach', 'media_push', 'customer_acquisition', 'speaking', 'general']
const VALID_STATUSES = ['planning', 'active', 'paused', 'completed', 'archived']

router.get('/', (req, res) => {
  const db = getDb()
  const { type, status } = req.query
  const conds = []; const params = []
  if (type) { conds.push('type = ?'); params.push(type) }
  if (status) { conds.push('status = ?'); params.push(status) }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
  const rows = db.prepare(`SELECT * FROM campaigns ${where} ORDER BY updated_at DESC`).all(...params)

  const db2 = getDb()
  const rows2 = rows.map(c => ({
    ...c,
    outreach_count: db2.prepare('SELECT COUNT(*) as n FROM outreach_log WHERE campaign_id = ?').get(c.id)?.n ?? 0,
    asset_count: db2.prepare('SELECT COUNT(*) as n FROM content_assets WHERE campaign_id = ?').get(c.id)?.n ?? 0,
  }))
  res.json(rows2)
})

router.get('/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  const outreach = db.prepare('SELECT ol.*, c.name as contact_name FROM outreach_log ol LEFT JOIN contacts c ON c.id = ol.contact_id WHERE ol.campaign_id = ? ORDER BY ol.sent_at DESC LIMIT 20').all(req.params.id)
  const assets = db.prepare('SELECT * FROM content_assets WHERE campaign_id = ? ORDER BY created_at DESC').all(req.params.id)
  res.json({ ...row, outreach, assets })
})

router.post('/', (req, res) => {
  const db = getDb()
  const { name, type = 'general', status = 'planning', goal, target_audience, budget, start_date, end_date, description, notes } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name required' })
  const id = uuidv4()
  db.prepare(`INSERT INTO campaigns (id, name, type, status, goal, target_audience, budget, start_date, end_date, description, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, name.trim(), type, status, goal || null, target_audience || null, budget || null, start_date || null, end_date || null, description || null, notes || null)
  res.status(201).json(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  const camp = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(req.params.id)
  if (!camp) return res.status(404).json({ error: 'Not found' })
  const { name, type, status, goal, target_audience, budget, start_date, end_date, description, notes } = req.body
  const fields = [`updated_at = datetime('now')`]; const params = []
  if (name !== undefined) { fields.push('name = ?'); params.push(name) }
  if (type !== undefined) { fields.push('type = ?'); params.push(type) }
  if (status !== undefined) { fields.push('status = ?'); params.push(status) }
  if (goal !== undefined) { fields.push('goal = ?'); params.push(goal) }
  if (target_audience !== undefined) { fields.push('target_audience = ?'); params.push(target_audience) }
  if (budget !== undefined) { fields.push('budget = ?'); params.push(budget) }
  if (start_date !== undefined) { fields.push('start_date = ?'); params.push(start_date) }
  if (end_date !== undefined) { fields.push('end_date = ?'); params.push(end_date) }
  if (description !== undefined) { fields.push('description = ?'); params.push(description) }
  if (notes !== undefined) { fields.push('notes = ?'); params.push(notes) }
  params.push(req.params.id)
  db.prepare(`UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM campaigns WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
