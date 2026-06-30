import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const { type } = req.query
  const where = type ? 'WHERE re.type = ?' : ''
  const params = type ? [type] : []
  const rows = db.prepare(`
    SELECT re.*, c.name as contact_name, cam.name as campaign_name
    FROM revenue_events re
    LEFT JOIN contacts c ON c.id = re.contact_id
    LEFT JOIN campaigns cam ON cam.id = re.campaign_id
    ${where} ORDER BY re.event_date DESC
  `).all(...params)

  const summary = db.prepare(`
    SELECT type, COUNT(*) as count, SUM(amount) as total, SUM(quantity) as units
    FROM revenue_events GROUP BY type
  `).all()
  const grand_total = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM revenue_events').get()?.total ?? 0

  res.json({ data: rows, summary, grand_total })
})

router.post('/', (req, res) => {
  const db = getDb()
  const { type = 'book_sale', amount, quantity = 1, contact_id, campaign_id, description, event_date } = req.body
  if (!amount && amount !== 0) return res.status(400).json({ error: 'amount required' })
  const id = uuidv4()
  db.prepare(`INSERT INTO revenue_events (id, type, amount, quantity, contact_id, campaign_id, description, event_date) VALUES (?,?,?,?,?,?,?,?)`).run(id, type, Number(amount), Number(quantity), contact_id || null, campaign_id || null, description || null, event_date || new Date().toISOString())
  res.status(201).json(db.prepare('SELECT * FROM revenue_events WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM revenue_events WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  const { type, amount, quantity, description, event_date } = req.body
  const fields = []; const params = []
  if (type !== undefined) { fields.push('type = ?'); params.push(type) }
  if (amount !== undefined) { fields.push('amount = ?'); params.push(amount) }
  if (quantity !== undefined) { fields.push('quantity = ?'); params.push(quantity) }
  if (description !== undefined) { fields.push('description = ?'); params.push(description) }
  if (event_date !== undefined) { fields.push('event_date = ?'); params.push(event_date) }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' })
  params.push(req.params.id)
  db.prepare(`UPDATE revenue_events SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM revenue_events WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM revenue_events WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM revenue_events WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
