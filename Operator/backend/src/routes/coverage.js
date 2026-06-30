import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const { type, sentiment } = req.query
  const conds = []; const params = []
  if (type) { conds.push('cl.type = ?'); params.push(type) }
  if (sentiment) { conds.push('cl.sentiment = ?'); params.push(sentiment) }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
  const rows = db.prepare(`
    SELECT cl.*, c.name as contact_name, c.organization
    FROM coverage_log cl LEFT JOIN contacts c ON c.id = cl.contact_id
    ${where} ORDER BY cl.published_date DESC, cl.created_at DESC
  `).all(...params)

  const totals = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(reach_estimate), 0) as total_reach FROM coverage_log').get()
  res.json({ data: rows, totals })
})

router.post('/', (req, res) => {
  const db = getDb()
  const { contact_id, type = 'press_article', outlet_name, headline, url, reach_estimate, sentiment = 'positive', published_date, notes } = req.body
  if (!outlet_name?.trim() && !headline?.trim()) return res.status(400).json({ error: 'outlet_name or headline required' })
  const id = uuidv4()
  db.prepare(`INSERT INTO coverage_log (id, contact_id, type, outlet_name, headline, url, reach_estimate, sentiment, published_date, notes) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id, contact_id || null, type, outlet_name || null, headline || null, url || null, reach_estimate || null, sentiment, published_date || null, notes || null)
  res.status(201).json(db.prepare('SELECT * FROM coverage_log WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM coverage_log WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  const { type, outlet_name, headline, url, reach_estimate, sentiment, published_date, notes } = req.body
  const fields = []; const params = []
  if (type !== undefined) { fields.push('type = ?'); params.push(type) }
  if (outlet_name !== undefined) { fields.push('outlet_name = ?'); params.push(outlet_name) }
  if (headline !== undefined) { fields.push('headline = ?'); params.push(headline) }
  if (url !== undefined) { fields.push('url = ?'); params.push(url) }
  if (reach_estimate !== undefined) { fields.push('reach_estimate = ?'); params.push(reach_estimate) }
  if (sentiment !== undefined) { fields.push('sentiment = ?'); params.push(sentiment) }
  if (published_date !== undefined) { fields.push('published_date = ?'); params.push(published_date) }
  if (notes !== undefined) { fields.push('notes = ?'); params.push(notes) }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' })
  params.push(req.params.id)
  db.prepare(`UPDATE coverage_log SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM coverage_log WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM coverage_log WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM coverage_log WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
