import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const { type, audience, campaign_id, is_approved } = req.query
  const conds = []; const params = []
  if (type) { conds.push('type = ?'); params.push(type) }
  if (audience) { conds.push('audience = ?'); params.push(audience) }
  if (campaign_id) { conds.push('campaign_id = ?'); params.push(campaign_id) }
  if (is_approved !== undefined) { conds.push('is_approved = ?'); params.push(is_approved === 'true' ? 1 : 0) }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
  res.json(db.prepare(`SELECT * FROM content_assets ${where} ORDER BY updated_at DESC`).all(...params))
})

router.get('/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM content_assets WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
})

router.post('/', (req, res) => {
  const db = getDb()
  const { title, type = 'email_template', audience = 'general', content, notes, is_approved = false, campaign_id } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'title required' })
  const id = uuidv4()
  db.prepare(`INSERT INTO content_assets (id, title, type, audience, content, notes, is_approved, campaign_id) VALUES (?,?,?,?,?,?,?,?)`).run(id, title.trim(), type, audience, content || null, notes || null, is_approved ? 1 : 0, campaign_id || null)
  res.status(201).json(db.prepare('SELECT * FROM content_assets WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM content_assets WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  const { title, type, audience, content, notes, is_approved, campaign_id } = req.body
  const fields = [`updated_at = datetime('now')`]; const params = []
  if (title !== undefined) { fields.push('title = ?'); params.push(title) }
  if (type !== undefined) { fields.push('type = ?'); params.push(type) }
  if (audience !== undefined) { fields.push('audience = ?'); params.push(audience) }
  if (content !== undefined) { fields.push('content = ?'); params.push(content) }
  if (notes !== undefined) { fields.push('notes = ?'); params.push(notes) }
  if (is_approved !== undefined) { fields.push('is_approved = ?'); params.push(is_approved ? 1 : 0) }
  if (campaign_id !== undefined) { fields.push('campaign_id = ?'); params.push(campaign_id) }
  params.push(req.params.id)
  db.prepare(`UPDATE content_assets SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM content_assets WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM content_assets WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM content_assets WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
