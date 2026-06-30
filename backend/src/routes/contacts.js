import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const { target_entity_id } = req.query
  if (!target_entity_id) return res.status(400).json({ error: 'target_entity_id required' })
  const rows = db.prepare('SELECT * FROM contacts WHERE target_entity_id = ? ORDER BY is_primary DESC, created_at ASC').all(target_entity_id)
  res.json(rows)
})

router.post('/', (req, res) => {
  const db = getDb()
  const { target_entity_id, name, title, department, role_type, email, phone,
    linkedin_url, public_contact_path, confidence_level = 'low',
    verification_status = 'unverified', is_primary = 0, is_recommended_role = 0, notes } = req.body

  if (!target_entity_id || !role_type) return res.status(400).json({ error: 'target_entity_id and role_type are required' })

  const id = uuidv4()
  if (is_primary) {
    db.prepare('UPDATE contacts SET is_primary = 0 WHERE target_entity_id = ?').run(target_entity_id)
  }
  db.prepare(`
    INSERT INTO contacts (id, target_entity_id, name, title, department, role_type, email, phone,
      linkedin_url, public_contact_path, confidence_level, verification_status, is_primary, is_recommended_role, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, target_entity_id, name || null, title || null, department || null, role_type,
    email || null, phone || null, linkedin_url || null, public_contact_path || null,
    confidence_level, verification_status, is_primary ? 1 : 0, is_recommended_role ? 1 : 0, notes || null)

  // Log activity
  db.prepare(`INSERT INTO activities (id, target_entity_id, activity_type, description) VALUES (?, ?, 'research', ?)`)
    .run(uuidv4(), target_entity_id, `Contact added: ${title || role_type}`)

  res.status(201).json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const fields = ['name','title','department','role_type','email','phone','linkedin_url',
    'public_contact_path','confidence_level','verification_status','is_primary','notes']
  const updates = []
  const params = []

  if (req.body.is_primary) {
    db.prepare('UPDATE contacts SET is_primary = 0 WHERE target_entity_id = ?').run(existing.target_entity_id)
  }

  fields.forEach(f => {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]) }
  })
  updates.push(`updated_at = datetime('now')`)
  params.push(req.params.id)

  db.prepare(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM contacts WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
