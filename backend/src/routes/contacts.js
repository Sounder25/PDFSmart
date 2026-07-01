import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const { type, status, segment, search, limit = 50, page = 1 } = req.query
  const conds = []; const params = []
  if (type) { conds.push('type = ?'); params.push(type) }
  if (status) { conds.push('status = ?'); params.push(status) }
  if (segment) { conds.push('audience_segment = ?'); params.push(segment) }
  if (search) { conds.push('(name LIKE ? OR organization LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
  const offset = (Number(page) - 1) * Number(limit)
  const total = db.prepare(`SELECT COUNT(*) as n FROM contacts ${where}`).get(...params)?.n ?? 0
  const rows = db.prepare(`SELECT * FROM contacts ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`).all(...params, Number(limit), offset)
  res.json({ data: rows, total, page: Number(page) })
})

router.get('/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  const outreach = db.prepare('SELECT ol.*, c.name as campaign_name FROM outreach_log ol LEFT JOIN campaigns c ON c.id = ol.campaign_id WHERE ol.contact_id = ? ORDER BY ol.sent_at DESC').all(req.params.id)
  const investor = db.prepare('SELECT * FROM investor_pipeline WHERE contact_id = ?').get(req.params.id)
  const coverage = db.prepare('SELECT * FROM coverage_log WHERE contact_id = ? ORDER BY published_date DESC').all(req.params.id)
  res.json({ ...row, outreach, investor, coverage })
})

router.post('/', (req, res) => {
  const db = getDb()
  const { name, type = 'general', audience_segment, organization, title, email, phone, website, location, status = 'cold', notes, next_follow_up } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name required' })
  const id = uuidv4()
  db.prepare(`INSERT INTO contacts (id, name, type, audience_segment, organization, title, email, phone, website, location, status, notes, next_follow_up) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, name.trim(), type, audience_segment || null, organization || null, title || null, email || null, phone || null, website || null, location || null, status, notes || null, next_follow_up || null)
  res.status(201).json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  const contact = db.prepare('SELECT id FROM contacts WHERE id = ?').get(req.params.id)
  if (!contact) return res.status(404).json({ error: 'Not found' })
  const { name, type, audience_segment, organization, title, email, phone, website, location, status, notes, next_follow_up, last_contacted } = req.body
  const fields = [`updated_at = datetime('now')`]; const params = []
  if (name !== undefined) { fields.push('name = ?'); params.push(name) }
  if (type !== undefined) { fields.push('type = ?'); params.push(type) }
  if (audience_segment !== undefined) { fields.push('audience_segment = ?'); params.push(audience_segment) }
  if (organization !== undefined) { fields.push('organization = ?'); params.push(organization) }
  if (title !== undefined) { fields.push('title = ?'); params.push(title) }
  if (email !== undefined) { fields.push('email = ?'); params.push(email) }
  if (phone !== undefined) { fields.push('phone = ?'); params.push(phone) }
  if (website !== undefined) { fields.push('website = ?'); params.push(website) }
  if (location !== undefined) { fields.push('location = ?'); params.push(location) }
  if (status !== undefined) { fields.push('status = ?'); params.push(status) }
  if (notes !== undefined) { fields.push('notes = ?'); params.push(notes) }
  if (next_follow_up !== undefined) { fields.push('next_follow_up = ?'); params.push(next_follow_up) }
  if (last_contacted !== undefined) { fields.push('last_contacted = ?'); params.push(last_contacted) }
  if (req.body.do_not_contact !== undefined) { fields.push('do_not_contact = ?'); params.push(req.body.do_not_contact ? 1 : 0) }
  if (req.body.dnc_reason !== undefined) { fields.push('dnc_reason = ?'); params.push(req.body.dnc_reason) }
  params.push(req.params.id)
  db.prepare(`UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM contacts WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// Seed demo contacts
router.post('/seed/demo', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT COUNT(*) as n FROM contacts WHERE is_demo = 1').get()
  if (existing.n > 0) return res.json({ message: 'Demo contacts already seeded', count: existing.n })

  const demos = [
    { name: 'Jake Whitfield', type: 'customer', audience_segment: 'rancher', organization: 'Whitfield Ranch', title: 'Owner/Operator', location: 'Uvalde, TX', status: 'warm', notes: 'Lost 14 calves to coyotes last season. Very interested in tech solutions. Referred by county agent.' },
    { name: 'Maria Santos', type: 'customer', audience_segment: 'farmer', organization: 'Santos Family Farms', title: 'Operations Manager', location: 'Fresno, CA', status: 'cold', notes: 'Feral hog problem on 800 acres. Attended county extension meeting.' },
    { name: 'Commissioner Dale Pruett', type: 'official', audience_segment: 'county_official', organization: 'Uvalde County', title: 'County Commissioner', location: 'Uvalde, TX', status: 'warm', notes: 'Championing wildlife management at county level. Budget authority for ag programs.' },
    { name: 'Sarah Kim', type: 'investor', audience_segment: 'angel', organization: 'AgTech Angels', title: 'Managing Partner', location: 'Austin, TX', status: 'warm', notes: 'Portfolio includes 3 ag-tech companies. Responded to LinkedIn outreach. Follow up after demo.' },
    { name: 'Ron Castillo', type: 'investor', audience_segment: 'vc', organization: 'Lone Star Ventures', title: 'Principal', location: 'Dallas, TX', status: 'cold', notes: 'Ag-tech focus fund. $2M-$10M checks. Intro through Chamber connection.' },
    { name: 'Amy Thornton', type: 'media', audience_segment: 'journalist', organization: 'AgriPulse', title: 'Senior Editor', location: 'Washington, DC', status: 'cold', notes: 'Covers ag policy and technology. Published 3 pieces on predator control this year.' },
    { name: 'Brad Novak', type: 'media', audience_segment: 'podcaster', organization: 'Ranch & Range Podcast', title: 'Host', location: 'Billings, MT', status: 'warm', notes: '42k listeners, mostly ranchers. Guest slot offered for spring lineup.' },
    { name: 'Dr. Ellen Marsh', type: 'partner', audience_segment: 'land_manager', organization: 'Texas A&M AgriLife Extension', title: 'Wildlife Specialist', location: 'College Station, TX', status: 'active', notes: 'Key partner for credibility. Co-authoring field study. Strong referral source.' },
    { name: 'Gov. Programs Office', type: 'official', audience_segment: 'state_official', organization: 'TX Dept of Agriculture', title: 'Wildlife Management Division', location: 'Austin, TX', status: 'cold', notes: 'State-level grant programs for wildlife depredation tech.' },
    { name: 'Tom Haskins', type: 'customer', audience_segment: 'land_manager', organization: 'Haskins Land & Cattle', title: 'Ranch Manager', location: 'Kerrville, TX', status: 'active', notes: 'Managing 12,000 acres. Pilot program candidate. Extremely motivated — lost $40k to predators.' },
  ]

  const stmt = db.prepare(`INSERT INTO contacts (id, name, type, audience_segment, organization, title, location, status, notes, is_demo) VALUES (?,?,?,?,?,?,?,?,?,1)`)
  let count = 0
  for (const d of demos) {
    try { stmt.run(uuidv4(), d.name, d.type, d.audience_segment, d.organization || null, d.title || null, d.location || null, d.status, d.notes || null); count++ } catch (_) {}
  }
  res.json({ message: `Seeded ${count} demo contacts`, count })
})

export default router
