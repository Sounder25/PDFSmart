import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const { contact_id, campaign_id, outcome, channel, limit = 50, page = 1 } = req.query
  const conds = []; const params = []
  if (contact_id) { conds.push('ol.contact_id = ?'); params.push(contact_id) }
  if (campaign_id) { conds.push('ol.campaign_id = ?'); params.push(campaign_id) }
  if (outcome) { conds.push('ol.outcome = ?'); params.push(outcome) }
  if (channel) { conds.push('ol.channel = ?'); params.push(channel) }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
  const offset = (Number(page) - 1) * Number(limit)
  const total = db.prepare(`SELECT COUNT(*) as n FROM outreach_log ol ${where}`).get(...params)?.n ?? 0
  const rows = db.prepare(`
    SELECT ol.*, c.name as contact_name, c.type as contact_type, c.organization, cam.name as campaign_name
    FROM outreach_log ol
    LEFT JOIN contacts c ON c.id = ol.contact_id
    LEFT JOIN campaigns cam ON cam.id = ol.campaign_id
    ${where}
    ORDER BY ol.sent_at DESC LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset)
  res.json({ data: rows, total, page: Number(page) })
})

// Follow-ups due
router.get('/follow-ups', (req, res) => {
  const db = getDb()
  const today = new Date().toISOString().split('T')[0]
  const rows = db.prepare(`
    SELECT c.*, c.next_follow_up as due_date
    FROM contacts c
    WHERE c.next_follow_up IS NOT NULL AND c.next_follow_up <= ? AND c.status NOT IN ('won', 'lost')
    ORDER BY c.next_follow_up ASC LIMIT 20
  `).all(today + 'T23:59:59')
  res.json(rows)
})

router.post('/', (req, res) => {
  const db = getDb()
  const { contact_id, campaign_id, channel = 'email', direction = 'sent', subject, body_preview, outcome = 'pending', follow_up_date, notes, sent_at } = req.body
  if (!contact_id) return res.status(400).json({ error: 'contact_id required' })
  const id = uuidv4()
  db.prepare(`INSERT INTO outreach_log (id, contact_id, campaign_id, channel, direction, subject, body_preview, outcome, follow_up_date, notes, sent_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, contact_id, campaign_id || null, channel, direction, subject || null, body_preview || null, outcome, follow_up_date || null, notes || null, sent_at || new Date().toISOString())

  // Update last_contacted on contact
  db.prepare(`UPDATE contacts SET last_contacted = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(contact_id)
  if (follow_up_date) db.prepare(`UPDATE contacts SET next_follow_up = ?, updated_at = datetime('now') WHERE id = ?`).run(follow_up_date, contact_id)

  res.status(201).json(db.prepare('SELECT * FROM outreach_log WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT id FROM outreach_log WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  const { outcome, follow_up_date, notes } = req.body
  const fields = []; const params = []
  if (outcome !== undefined) { fields.push('outcome = ?'); params.push(outcome) }
  if (follow_up_date !== undefined) { fields.push('follow_up_date = ?'); params.push(follow_up_date) }
  if (notes !== undefined) { fields.push('notes = ?'); params.push(notes) }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' })
  params.push(req.params.id)
  db.prepare(`UPDATE outreach_log SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM outreach_log WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM outreach_log WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM outreach_log WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
