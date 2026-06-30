import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const { target_entity_id, stage } = req.query
  let where = []
  let params = []
  if (target_entity_id) { where.push('target_entity_id = ?'); params.push(target_entity_id) }
  if (stage) { where.push('stage = ?'); params.push(stage) }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  res.json(db.prepare(`SELECT * FROM opportunities ${clause} ORDER BY created_at DESC`).all(...params))
})

router.post('/', (req, res) => {
  const db = getDb()
  const { target_entity_id, opportunity_type = 'direct_sale', title, description, estimated_value,
    probability = 50, stage = 'identified', acquisition_path, funding_source, expected_decision_date, fiscal_year } = req.body
  if (!target_entity_id || !title) return res.status(400).json({ error: 'target_entity_id and title required' })

  const id = uuidv4()
  db.prepare(`
    INSERT INTO opportunities (id, target_entity_id, opportunity_type, title, description, estimated_value, probability, stage, acquisition_path, funding_source, expected_decision_date, fiscal_year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, target_entity_id, opportunity_type, title, description || null, estimated_value || null,
    probability, stage, acquisition_path || null, funding_source || null, expected_decision_date || null, fiscal_year || null)

  db.prepare(`INSERT INTO activities (id, target_entity_id, activity_type, description) VALUES (?, ?, 'research', ?)`)
    .run(uuidv4(), target_entity_id, `Opportunity created: ${title}`)

  res.status(201).json(db.prepare('SELECT * FROM opportunities WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM opportunities WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  const fields = ['opportunity_type','title','description','estimated_value','probability','stage','acquisition_path','funding_source','expected_decision_date','fiscal_year']
  const updates = []
  const params = []
  fields.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]) } })
  updates.push(`updated_at = datetime('now')`)
  params.push(req.params.id)
  db.prepare(`UPDATE opportunities SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM opportunities WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM opportunities WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM opportunities WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
