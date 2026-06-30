import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const tags = db.prepare('SELECT t.*, COUNT(tt.target_entity_id) as usage_count FROM tags t LEFT JOIN target_tags tt ON t.id = tt.tag_id GROUP BY t.id ORDER BY t.name ASC').all()
  res.json(tags)
})

router.post('/', (req, res) => {
  const db = getDb()
  const { name, color = '#14b8a6' } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name required' })
  const existing = db.prepare('SELECT * FROM tags WHERE LOWER(name) = ?').get(name.trim().toLowerCase())
  if (existing) return res.status(409).json({ error: 'Tag already exists', existing })
  const id = uuidv4()
  db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)').run(id, name.trim(), color)
  res.status(201).json(db.prepare('SELECT * FROM tags WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM tags WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  const { name, color } = req.body
  const updates = []
  const params = []
  if (name) { updates.push('name = ?'); params.push(name) }
  if (color) { updates.push('color = ?'); params.push(color) }
  if (!updates.length) return res.status(400).json({ error: 'name or color required' })
  params.push(req.params.id)
  db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM tags WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM target_tags WHERE tag_id = ?').run(req.params.id)
  db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
