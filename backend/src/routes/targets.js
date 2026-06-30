import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'
import { calculateScore } from './scores.js'

const router = Router()

// List with filters/search/sort/pagination
router.get('/', (req, res) => {
  const db = getDb()
  const {
    page = 1, limit = 25, search, market_mode, entity_type,
    status, min_score, max_score, location, tag, verification,
    confidence, sort_by = 'created_at', sort_dir = 'DESC', is_demo
  } = req.query

  let where = []
  let params = []

  if (search) {
    where.push(`(te.name LIKE ? OR te.primary_location LIKE ? OR te.industry LIKE ?)`)
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (market_mode) { where.push('te.market_mode = ?'); params.push(market_mode) }
  if (entity_type) { where.push('te.entity_type = ?'); params.push(entity_type) }
  if (status) { where.push('te.status = ?'); params.push(status) }
  if (verification) { where.push('te.verification_status = ?'); params.push(verification) }
  if (confidence) { where.push('te.confidence_level = ?'); params.push(confidence) }
  if (location) { where.push('te.primary_location LIKE ?'); params.push(`%${location}%`) }
  if (is_demo !== undefined) { where.push('te.is_demo = ?'); params.push(is_demo === 'true' ? 1 : 0) }
  if (tag) {
    where.push(`EXISTS (SELECT 1 FROM target_tags tt JOIN tags tg ON tt.tag_id = tg.id WHERE tt.target_entity_id = te.id AND tg.name = ?)`)
    params.push(tag)
  }

  const allowedSortCols = ['name','market_mode','status','estimated_value','confidence_level','created_at','updated_at']
  const col = allowedSortCols.includes(sort_by) ? `te.${sort_by}` : 'te.created_at'
  const dir = sort_dir === 'ASC' ? 'ASC' : 'DESC'

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const offset = (parseInt(page) - 1) * parseInt(limit)

  // Subquery for score
  const scoreSubquery = `(SELECT sr.total_score FROM score_records sr WHERE sr.target_entity_id = te.id ORDER BY sr.calculated_at DESC LIMIT 1)`
  const scoreFilter = min_score || max_score
  const havingClause = min_score && max_score
    ? `HAVING score BETWEEN ${parseInt(min_score)} AND ${parseInt(max_score)}`
    : min_score ? `HAVING score >= ${parseInt(min_score)}`
    : max_score ? `HAVING score <= ${parseInt(max_score)}` : ''

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM target_entities te ${whereClause}`).get(...params)

  const rows = db.prepare(`
    SELECT te.*,
      ${scoreSubquery} as score,
      (SELECT c.title FROM contacts c WHERE c.target_entity_id = te.id AND c.is_primary = 1 LIMIT 1) as primary_contact_title,
      (SELECT c.name FROM contacts c WHERE c.target_entity_id = te.id AND c.is_primary = 1 LIMIT 1) as primary_contact_name,
      (SELECT MAX(a.created_at) FROM activities a WHERE a.target_entity_id = te.id) as last_activity_at
    FROM target_entities te
    ${whereClause}
    ${havingClause}
    ORDER BY ${col} ${dir}
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset)

  // Attach tags
  const tagStmt = db.prepare(`SELECT tg.* FROM tags tg JOIN target_tags tt ON tg.id = tt.tag_id WHERE tt.target_entity_id = ?`)
  const result = rows.map(r => ({ ...r, tags: tagStmt.all(r.id) }))

  res.json({ data: result, total: total.cnt, page: parseInt(page), limit: parseInt(limit) })
})

// Get single target
router.get('/:id', (req, res) => {
  const db = getDb()
  const target = db.prepare('SELECT * FROM target_entities WHERE id = ?').get(req.params.id)
  if (!target) return res.status(404).json({ error: 'Not found' })

  const score = db.prepare('SELECT * FROM score_records WHERE target_entity_id = ? ORDER BY calculated_at DESC LIMIT 1').get(req.params.id)
  const dims = score ? db.prepare('SELECT * FROM score_dimensions WHERE score_record_id = ?').all(score.id) : []
  const tags = db.prepare('SELECT tg.* FROM tags tg JOIN target_tags tt ON tg.id = tt.tag_id WHERE tt.target_entity_id = ?').all(req.params.id)

  res.json({ ...target, score, score_dimensions: dims, tags })
})

// Create target
router.post('/', (req, res) => {
  const db = getDb()
  const id = uuidv4()
  const {
    market_mode, entity_type, name, description, website, domain,
    primary_location, service_area, status = 'new', estimated_value,
    confidence_level = 'low', verification_status = 'unverified',
    is_demo = 0, industry, subindustry, naics_code, psc_code,
    fiscal_year, opportunity_type, tags = []
  } = req.body

  if (!market_mode || !name || !entity_type) {
    return res.status(400).json({ error: 'market_mode, name, and entity_type are required' })
  }

  // Duplicate check
  const domainNorm = domain?.toLowerCase().trim()
  const nameNorm = name.toLowerCase().trim()
  let dupe = null
  if (domainNorm) {
    dupe = db.prepare(`SELECT id, name FROM target_entities WHERE LOWER(domain) = ?`).get(domainNorm)
  }
  if (!dupe) {
    dupe = db.prepare(`SELECT id, name FROM target_entities WHERE LOWER(name) = ? AND market_mode = ?`).get(nameNorm, market_mode)
  }
  if (dupe) {
    return res.status(409).json({ duplicate: true, existing: dupe, error: 'Possible duplicate detected' })
  }

  db.prepare(`
    INSERT INTO target_entities (
      id, market_mode, entity_type, name, description, website, domain,
      primary_location, service_area, status, estimated_value,
      confidence_level, verification_status, is_demo, tags_json,
      industry, subindustry, naics_code, psc_code, fiscal_year, opportunity_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, market_mode, entity_type, name, description || null, website || null, domainNorm || null,
    primary_location || null, service_area || null, status, estimated_value || null,
    confidence_level, verification_status, is_demo ? 1 : 0, JSON.stringify(tags),
    industry || null, subindustry || null, naics_code || null, psc_code || null,
    fiscal_year || null, opportunity_type || null
  )

  // Assign tags
  if (tags.length) {
    const tagInsert = db.prepare('INSERT OR IGNORE INTO target_tags (target_entity_id, tag_id) VALUES (?, ?)')
    tags.forEach(tagId => tagInsert.run(id, tagId))
  }

  // Activity log
  db.prepare(`INSERT INTO activities (id, target_entity_id, activity_type, description) VALUES (?, ?, 'import', ?)`)
    .run(uuidv4(), id, `Target created: ${name}`)

  const created = db.prepare('SELECT * FROM target_entities WHERE id = ?').get(id)
  res.status(201).json(created)
})

// Update target
router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM target_entities WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const fields = ['name','description','website','domain','primary_location','service_area',
    'status','estimated_value','confidence_level','verification_status','industry','subindustry',
    'naics_code','psc_code','fiscal_year','opportunity_type','entity_type','market_mode']

  const updates = []
  const params = []
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`)
      params.push(req.body[f])
    }
  })
  updates.push(`updated_at = datetime('now')`)
  params.push(req.params.id)

  if (updates.length > 1) {
    db.prepare(`UPDATE target_entities SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  }

  // Status change activity
  if (req.body.status && req.body.status !== existing.status) {
    db.prepare(`INSERT INTO activities (id, target_entity_id, activity_type, description) VALUES (?, ?, 'status_change', ?)`)
      .run(uuidv4(), req.params.id, `Status changed from "${existing.status}" to "${req.body.status}"`)
  }

  // Tag update
  if (req.body.tags !== undefined) {
    db.prepare('DELETE FROM target_tags WHERE target_entity_id = ?').run(req.params.id)
    const tagInsert = db.prepare('INSERT OR IGNORE INTO target_tags (target_entity_id, tag_id) VALUES (?, ?)')
    req.body.tags.forEach(tagId => tagInsert.run(req.params.id, tagId))
  }

  const updated = db.prepare('SELECT * FROM target_entities WHERE id = ?').get(req.params.id)
  res.json(updated)
})

// Delete target
router.delete('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM target_entities WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM target_entities WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// Bulk delete
router.post('/bulk/delete', (req, res) => {
  const db = getDb()
  const { ids } = req.body
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array required' })
  const placeholders = ids.map(() => '?').join(',')
  db.prepare(`DELETE FROM target_entities WHERE id IN (${placeholders})`).run(...ids)
  res.json({ deleted: ids.length })
})

// Bulk status update
router.post('/bulk/status', (req, res) => {
  const db = getDb()
  const { ids, status } = req.body
  if (!ids?.length || !status) return res.status(400).json({ error: 'ids and status required' })
  const placeholders = ids.map(() => '?').join(',')
  db.prepare(`UPDATE target_entities SET status = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`).run(status, ...ids)
  // Log activities
  const actStmt = db.prepare(`INSERT INTO activities (id, target_entity_id, activity_type, description) VALUES (?, ?, 'status_change', ?)`)
  ids.forEach(id => actStmt.run(uuidv4(), id, `Bulk status update to "${status}"`))
  res.json({ updated: ids.length })
})

// Bulk tag assign
router.post('/bulk/tags', (req, res) => {
  const db = getDb()
  const { ids, tag_ids, action = 'add' } = req.body
  if (!ids?.length || !tag_ids?.length) return res.status(400).json({ error: 'ids and tag_ids required' })

  const insertStmt = db.prepare('INSERT OR IGNORE INTO target_tags (target_entity_id, tag_id) VALUES (?, ?)')
  const deleteStmt = db.prepare('DELETE FROM target_tags WHERE target_entity_id = ? AND tag_id = ?')

  ids.forEach(targetId => {
    tag_ids.forEach(tagId => {
      if (action === 'add') insertStmt.run(targetId, tagId)
      else deleteStmt.run(targetId, tagId)
    })
  })

  res.json({ updated: ids.length })
})

// CSV Export
router.get('/export/csv', (req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT te.name, te.market_mode, te.entity_type, te.primary_location,
      te.status, te.estimated_value, te.confidence_level, te.verification_status,
      te.industry, te.created_at,
      (SELECT sr.total_score FROM score_records sr WHERE sr.target_entity_id = te.id ORDER BY sr.calculated_at DESC LIMIT 1) as score
    FROM target_entities te ORDER BY te.created_at DESC
  `).all()

  const headers = ['Name','Market Mode','Entity Type','Location','Status','Estimated Value','Confidence','Verification','Industry','Score','Created At']
  const csv = [headers.join(','), ...rows.map(r =>
    [r.name, r.market_mode, r.entity_type, r.primary_location, r.status, r.estimated_value || '', r.confidence_level, r.verification_status, r.industry || '', r.score || '', r.created_at]
      .map(v => `"${String(v || '').replace(/"/g, '""')}"`)
      .join(',')
  )].join('\n')

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="forgemark-targets.csv"')
  res.send(csv)
})

export { router as default, calculateScore }
