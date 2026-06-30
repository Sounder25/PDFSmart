import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const { target_entity_id } = req.query
  if (!target_entity_id) return res.status(400).json({ error: 'target_entity_id required' })
  res.json(db.prepare('SELECT * FROM notes WHERE target_entity_id = ? ORDER BY created_at DESC').all(target_entity_id))
})

router.post('/', (req, res) => {
  const db = getDb()
  const { target_entity_id, body } = req.body
  if (!target_entity_id || !body?.trim()) return res.status(400).json({ error: 'target_entity_id and body required' })
  const id = uuidv4()
  db.prepare('INSERT INTO notes (id, target_entity_id, body) VALUES (?, ?, ?)').run(id, target_entity_id, body.trim())
  db.prepare(`INSERT INTO activities (id, target_entity_id, activity_type, description) VALUES (?, ?, 'note', 'Note added')`)
    .run(uuidv4(), target_entity_id)
  res.status(201).json(db.prepare('SELECT * FROM notes WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id)
  if (!note) return res.status(404).json({ error: 'Not found' })
  if (!req.body.body?.trim()) return res.status(400).json({ error: 'body required' })
  db.prepare(`UPDATE notes SET body = ?, updated_at = datetime('now') WHERE id = ?`).run(req.body.body.trim(), req.params.id)
  res.json(db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM notes WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
