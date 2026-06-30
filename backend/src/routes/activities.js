import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const { target_entity_id, limit = 50, activity_type } = req.query
  let where = []
  let params = []
  if (target_entity_id) { where.push('target_entity_id = ?'); params.push(target_entity_id) }
  if (activity_type) { where.push('activity_type = ?'); params.push(activity_type) }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  res.json(db.prepare(`SELECT * FROM activities ${clause} ORDER BY created_at DESC LIMIT ?`).all(...params, parseInt(limit)))
})

router.post('/', (req, res) => {
  const db = getDb()
  const { target_entity_id, activity_type, channel, description, outcome } = req.body
  if (!target_entity_id || !activity_type || !description) return res.status(400).json({ error: 'target_entity_id, activity_type, description required' })

  const id = uuidv4()
  db.prepare(`INSERT INTO activities (id, target_entity_id, activity_type, channel, description, outcome) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, target_entity_id, activity_type, channel || null, description, outcome || null)

  // Update target's updated_at
  db.prepare(`UPDATE target_entities SET updated_at = datetime('now') WHERE id = ?`).run(target_entity_id)

  res.status(201).json(db.prepare('SELECT * FROM activities WHERE id = ?').get(id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM activities WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
