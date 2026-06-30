import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'

const router = Router()

const STAGES = ['identified', 'introduced', 'pitch_sent', 'meeting_scheduled', 'follow_up', 'due_diligence', 'committed', 'closed', 'passed']

router.get('/', (req, res) => {
  const db = getDb()
  const { stage } = req.query
  const where = stage ? 'WHERE ip.stage = ?' : ''
  const params = stage ? [stage] : []
  const rows = db.prepare(`
    SELECT ip.*, c.name, c.organization, c.email, c.phone, c.location, c.audience_segment, c.notes as contact_notes
    FROM investor_pipeline ip
    JOIN contacts c ON c.id = ip.contact_id
    ${where} ORDER BY ip.updated_at DESC
  `).all(...params)

  const summary = db.prepare(`
    SELECT stage, COUNT(*) as count, COALESCE(SUM(ask_amount), 0) as ask_total, COALESCE(SUM(committed_amount), 0) as committed_total
    FROM investor_pipeline GROUP BY stage
  `).all()

  res.json({ data: rows, summary })
})

router.get('/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare(`
    SELECT ip.*, c.name, c.organization, c.email, c.phone, c.location, c.audience_segment, c.notes as contact_notes
    FROM investor_pipeline ip JOIN contacts c ON c.id = ip.contact_id WHERE ip.id = ?
  `).get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  const outreach = db.prepare(`
    SELECT ol.* FROM outreach_log ol WHERE ol.contact_id = ? ORDER BY ol.sent_at DESC LIMIT 10
  `).all(row.contact_id)
  res.json({ ...row, outreach })
})

router.post('/', (req, res) => {
  const db = getDb()
  const { contact_id, stage = 'identified', ask_amount, committed_amount, last_activity, next_action, next_action_date, notes } = req.body
  if (!contact_id) return res.status(400).json({ error: 'contact_id required' })
  const existing = db.prepare('SELECT id FROM investor_pipeline WHERE contact_id = ?').get(contact_id)
  if (existing) return res.status(409).json({ error: 'Investor pipeline record already exists for this contact', id: existing.id })
  const id = uuidv4()
  db.prepare(`INSERT INTO investor_pipeline (id, contact_id, stage, ask_amount, committed_amount, last_activity, next_action, next_action_date, notes) VALUES (?,?,?,?,?,?,?,?,?)`).run(id, contact_id, stage, ask_amount || null, committed_amount || null, last_activity || null, next_action || null, next_action_date || null, notes || null)
  res.status(201).json(db.prepare(`SELECT ip.*, c.name, c.organization FROM investor_pipeline ip JOIN contacts c ON c.id = ip.contact_id WHERE ip.id = ?`).get(id))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM investor_pipeline WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  const { stage, ask_amount, committed_amount, last_activity, next_action, next_action_date, notes } = req.body
  const fields = [`updated_at = datetime('now')`]; const params = []
  if (stage !== undefined) { fields.push('stage = ?'); params.push(stage) }
  if (ask_amount !== undefined) { fields.push('ask_amount = ?'); params.push(ask_amount) }
  if (committed_amount !== undefined) { fields.push('committed_amount = ?'); params.push(committed_amount) }
  if (last_activity !== undefined) { fields.push('last_activity = ?'); params.push(last_activity) }
  if (next_action !== undefined) { fields.push('next_action = ?'); params.push(next_action) }
  if (next_action_date !== undefined) { fields.push('next_action_date = ?'); params.push(next_action_date) }
  if (notes !== undefined) { fields.push('notes = ?'); params.push(notes) }
  params.push(req.params.id)
  db.prepare(`UPDATE investor_pipeline SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  res.json(db.prepare(`SELECT ip.*, c.name, c.organization FROM investor_pipeline ip JOIN contacts c ON c.id = ip.contact_id WHERE ip.id = ?`).get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM investor_pipeline WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM investor_pipeline WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
