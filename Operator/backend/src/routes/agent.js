import { Router } from 'express'
import { randomUUID } from 'crypto'
import { getDb } from '../db/schema.js'

const r = Router()

function getRules(db) {
  const row = db.prepare(`SELECT * FROM agent_rules WHERE id='singleton'`).get()
  return {
    ...row,
    eligible_statuses: JSON.parse(row.eligible_statuses || '[]'),
    blocked_statuses: JSON.parse(row.blocked_statuses || '[]'),
    cooldown_outcomes: JSON.parse(row.cooldown_outcomes || '[]'),
    blocked_channels_by_type: JSON.parse(row.blocked_channels_by_type || '{}'),
  }
}

function getEligibleContacts(db, rules) {
  const today = new Date().toISOString().split('T')[0]
  const allContacts = db.prepare(`SELECT * FROM contacts WHERE do_not_contact=0`).all()

  const eligible = []
  const excluded = []

  for (const c of allContacts) {
    // Blocked by status
    if (rules.blocked_statuses.includes(c.status)) {
      excluded.push({ ...c, exclusion_reason: `Status "${c.status}" is blocked` }); continue
    }
    // Not in eligible statuses
    if (!rules.eligible_statuses.includes(c.status)) {
      excluded.push({ ...c, exclusion_reason: `Status "${c.status}" not in eligible list` }); continue
    }
    // Require email
    if (rules.require_email && !c.email) {
      excluded.push({ ...c, exclusion_reason: 'No email address on file' }); continue
    }
    // Cooldown from recency
    if (c.last_contacted) {
      const daysSince = Math.floor((new Date(today) - new Date(c.last_contacted)) / 86400000)
      if (daysSince < rules.min_days_between_outreach) {
        excluded.push({ ...c, exclusion_reason: `Contacted ${daysSince}d ago — cooldown is ${rules.min_days_between_outreach}d` }); continue
      }
    }
    // Cooldown from last outreach outcome
    const lastOutreach = db.prepare(`
      SELECT outcome, sent_at FROM outreach_log WHERE contact_id=? ORDER BY sent_at DESC LIMIT 1
    `).get(c.id)
    if (lastOutreach && rules.cooldown_outcomes.includes(lastOutreach.outcome)) {
      const daysSince = Math.floor((new Date(today) - new Date(lastOutreach.sent_at.split('T')[0])) / 86400000)
      const cooldown = lastOutreach.outcome === 'declined'
        ? rules.cooldown_days_after_decline
        : rules.cooldown_days_after_no_response
      if (daysSince < cooldown) {
        excluded.push({ ...c, exclusion_reason: `Last outcome was "${lastOutreach.outcome}" ${daysSince}d ago — cooldown is ${cooldown}d` }); continue
      }
    }
    eligible.push(c)
  }

  const dnc = db.prepare(`SELECT * FROM contacts WHERE do_not_contact=1`).all()
    .map(c => ({ ...c, exclusion_reason: `Do Not Contact${c.dnc_reason ? ': ' + c.dnc_reason : ''}` }))

  return { eligible, excluded: [...dnc, ...excluded] }
}

// ── Context endpoint ─────────────────────────────────────────────────────────
// Single call that orients an agent on wake-up: brand, campaigns, tasks, follow-ups
r.get('/context', (req, res) => {
  const db = getDb()
  const today = new Date().toISOString().split('T')[0]

  const brand = db.prepare(`SELECT * FROM brand_profile WHERE id='singleton'`).get()
  const rules = getRules(db)
  const { eligible, excluded } = getEligibleContacts(db, rules)

  const campaigns = db.prepare(`
    SELECT c.*, cp.id AS plan_id, cp.summary AS plan_summary, cp.goal AS plan_goal, cp.strategy AS plan_strategy
    FROM campaigns c
    LEFT JOIN campaign_plans cp ON cp.campaign_id = c.id
    WHERE c.status NOT IN ('completed','cancelled')
    ORDER BY c.created_at DESC
  `).all()

  const tasks = db.prepare(`
    SELECT t.*, c.name AS campaign_name
    FROM agent_tasks t
    LEFT JOIN campaigns c ON c.id = t.campaign_id
    WHERE t.status IN ('pending','in_progress')
    ORDER BY t.due_date ASC NULLS LAST, t.priority DESC
    LIMIT 50
  `).all()

  const overdue_tasks = tasks.filter(t => t.due_date && t.due_date < today)

  const follow_ups = db.prepare(`
    SELECT name, type, organization, email, phone, next_follow_up
    FROM contacts
    WHERE next_follow_up <= ? AND status NOT IN ('won','lost')
    ORDER BY next_follow_up ASC
    LIMIT 20
  `).all(today)

  const recent_outreach = db.prepare(`
    SELECT o.*, c.name AS contact_name, c.type AS contact_type
    FROM outreach_log o
    LEFT JOIN contacts c ON c.id = o.contact_id
    WHERE o.sent_at >= date('now','-7 days')
    ORDER BY o.sent_at DESC
    LIMIT 20
  `).all()

  const investor_summary = db.prepare(`
    SELECT stage, COUNT(*) AS count, SUM(ask_amount) AS ask_total, SUM(committed_amount) AS committed_total
    FROM investor_pipeline
    GROUP BY stage
  `).all()

  const revenue_summary = db.prepare(`
    SELECT type, SUM(amount) AS total FROM revenue_events GROUP BY type
  `).all()

  const pending_content = db.prepare(`
    SELECT id, title, type, audience FROM content_assets WHERE is_approved=0 ORDER BY created_at DESC LIMIT 10
  `).all()

  res.json({
    retrieved_at: new Date().toISOString(),
    brand,
    rules,
    contacts: {
      eligible_count: eligible.length,
      eligible,
      excluded_count: excluded.length,
      excluded
    },
    active_campaigns: campaigns,
    tasks: { overdue: overdue_tasks, pending: tasks.filter(t => !overdue_tasks.includes(t)) },
    follow_ups,
    recent_outreach,
    investor_summary,
    revenue_summary,
    pending_content
  })
})

// ── Rules ────────────────────────────────────────────────────────────────────
r.get('/rules', (req, res) => res.json(getRules(getDb())))

r.put('/rules', (req, res) => {
  const db = getDb()
  const { min_days_between_outreach, eligible_statuses, blocked_statuses, cooldown_outcomes,
    cooldown_days_after_decline, cooldown_days_after_no_response, blocked_channels_by_type,
    require_email, notes } = req.body
  db.prepare(`
    UPDATE agent_rules SET
      min_days_between_outreach=COALESCE(?,min_days_between_outreach),
      eligible_statuses=COALESCE(?,eligible_statuses),
      blocked_statuses=COALESCE(?,blocked_statuses),
      cooldown_outcomes=COALESCE(?,cooldown_outcomes),
      cooldown_days_after_decline=COALESCE(?,cooldown_days_after_decline),
      cooldown_days_after_no_response=COALESCE(?,cooldown_days_after_no_response),
      blocked_channels_by_type=COALESCE(?,blocked_channels_by_type),
      require_email=COALESCE(?,require_email),
      notes=COALESCE(?,notes),
      updated_at=datetime('now')
    WHERE id='singleton'
  `).run(
    min_days_between_outreach ?? null,
    eligible_statuses ? JSON.stringify(eligible_statuses) : null,
    blocked_statuses ? JSON.stringify(blocked_statuses) : null,
    cooldown_outcomes ? JSON.stringify(cooldown_outcomes) : null,
    cooldown_days_after_decline ?? null,
    cooldown_days_after_no_response ?? null,
    blocked_channels_by_type ? JSON.stringify(blocked_channels_by_type) : null,
    require_email !== undefined ? (require_email ? 1 : 0) : null,
    notes ?? null
  )
  res.json(getRules(db))
})

// ── Eligible contacts (standalone endpoint) ───────────────────────────────────
r.get('/eligible', (req, res) => {
  const db = getDb()
  res.json(getEligibleContacts(db, getRules(db)))
})

// ── Tasks ─────────────────────────────────────────────────────────────────────
r.get('/tasks', (req, res) => {
  const db = getDb()
  const { status, assigned_to, campaign_id } = req.query
  let sql = `
    SELECT t.*, c.name AS campaign_name, co.name AS contact_name
    FROM agent_tasks t
    LEFT JOIN campaigns c ON c.id = t.campaign_id
    LEFT JOIN contacts co ON co.id = t.contact_id
    WHERE 1=1
  `
  const params = []
  if (status) { sql += ` AND t.status=?`; params.push(status) }
  if (assigned_to) { sql += ` AND t.assigned_to=?`; params.push(assigned_to) }
  if (campaign_id) { sql += ` AND t.campaign_id=?`; params.push(campaign_id) }
  sql += ` ORDER BY t.due_date ASC NULLS LAST, t.priority DESC`
  res.json(db.prepare(sql).all(...params))
})

r.post('/tasks', (req, res) => {
  const db = getDb()
  const id = randomUUID()
  const { title, description, type = 'general', assigned_to = 'human', priority = 'medium',
    due_date, campaign_id, contact_id, milestone_id, created_by = 'human' } = req.body
  if (!title) return res.status(400).json({ error: 'title required' })
  db.prepare(`
    INSERT INTO agent_tasks (id,title,description,type,assigned_to,priority,due_date,campaign_id,contact_id,milestone_id,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(id, title, description, type, assigned_to, priority, due_date || null, campaign_id || null, contact_id || null, milestone_id || null, created_by)
  res.status(201).json(db.prepare(`SELECT * FROM agent_tasks WHERE id=?`).get(id))
})

r.put('/tasks/:id', (req, res) => {
  const db = getDb()
  const { title, description, type, assigned_to, priority, status, due_date, result } = req.body
  db.prepare(`
    UPDATE agent_tasks SET
      title=COALESCE(?,title), description=COALESCE(?,description), type=COALESCE(?,type),
      assigned_to=COALESCE(?,assigned_to), priority=COALESCE(?,priority), status=COALESCE(?,status),
      due_date=COALESCE(?,due_date), result=COALESCE(?,result), updated_at=datetime('now')
    WHERE id=?
  `).run(title, description, type, assigned_to, priority, status, due_date, result, req.params.id)
  res.json(db.prepare(`SELECT * FROM agent_tasks WHERE id=?`).get(req.params.id))
})

r.delete('/tasks/:id', (req, res) => {
  getDb().prepare(`DELETE FROM agent_tasks WHERE id=?`).run(req.params.id)
  res.status(204).end()
})

// ── Campaign Plans ────────────────────────────────────────────────────────────
r.get('/plan/:campaign_id', (req, res) => {
  const db = getDb()
  const plan = db.prepare(`SELECT * FROM campaign_plans WHERE campaign_id=?`).get(req.params.campaign_id)
  if (!plan) return res.json(null)
  const phases = db.prepare(`SELECT * FROM campaign_phases WHERE plan_id=? ORDER BY order_index`).all(plan.id)
  const phaseIds = phases.map(p => p.id)
  const milestones = phaseIds.length
    ? db.prepare(`SELECT * FROM campaign_milestones WHERE phase_id IN (${phaseIds.map(() => '?').join(',')}) ORDER BY due_date`).all(...phaseIds)
    : []
  res.json({
    ...plan,
    phases: phases.map(ph => ({ ...ph, milestones: milestones.filter(m => m.phase_id === ph.id) }))
  })
})

r.post('/plan/:campaign_id', (req, res) => {
  const db = getDb()
  const { summary, goal, strategy, phases = [], created_by = 'human' } = req.body
  const existing = db.prepare(`SELECT id FROM campaign_plans WHERE campaign_id=?`).get(req.params.campaign_id)
  if (existing) {
    db.prepare(`UPDATE campaign_plans SET summary=?,goal=?,strategy=?,created_by=?,updated_at=datetime('now') WHERE id=?`)
      .run(summary, goal, strategy, created_by, existing.id)
    db.prepare(`DELETE FROM campaign_phases WHERE plan_id=?`).run(existing.id)
    insertPhases(db, existing.id, phases)
    return res.json(getPlan(db, req.params.campaign_id))
  }
  const planId = randomUUID()
  db.prepare(`INSERT INTO campaign_plans (id,campaign_id,summary,goal,strategy,created_by) VALUES (?,?,?,?,?,?)`)
    .run(planId, req.params.campaign_id, summary, goal, strategy, created_by)
  insertPhases(db, planId, phases)
  res.status(201).json(getPlan(db, req.params.campaign_id))
})

function insertPhases(db, planId, phases) {
  phases.forEach((ph, i) => {
    const phId = randomUUID()
    db.prepare(`INSERT INTO campaign_phases (id,plan_id,name,description,start_date,end_date,order_index,status) VALUES (?,?,?,?,?,?,?,?)`)
      .run(phId, planId, ph.name, ph.description || null, ph.start_date || null, ph.end_date || null, i, ph.status || 'pending')
    ;(ph.milestones || []).forEach(m => {
      db.prepare(`INSERT INTO campaign_milestones (id,phase_id,name,description,due_date,status) VALUES (?,?,?,?,?,?)`)
        .run(randomUUID(), phId, m.name, m.description || null, m.due_date || null, m.status || 'pending')
    })
  })
}

function getPlan(db, campaignId) {
  const plan = db.prepare(`SELECT * FROM campaign_plans WHERE campaign_id=?`).get(campaignId)
  if (!plan) return null
  const phases = db.prepare(`SELECT * FROM campaign_phases WHERE plan_id=? ORDER BY order_index`).all(plan.id)
  const phaseIds = phases.map(p => p.id)
  const milestones = phaseIds.length
    ? db.prepare(`SELECT * FROM campaign_milestones WHERE phase_id IN (${phaseIds.map(() => '?').join(',')}) ORDER BY due_date`).all(...phaseIds)
    : []
  return { ...plan, phases: phases.map(ph => ({ ...ph, milestones: milestones.filter(m => m.phase_id === ph.id) })) }
}

// ── Agent Log ─────────────────────────────────────────────────────────────────
r.get('/log', (req, res) => {
  const db = getDb()
  const { campaign_id, limit = 50 } = req.query
  let sql = `SELECT l.*, c.name AS campaign_name FROM agent_log l LEFT JOIN campaigns c ON c.id=l.campaign_id WHERE 1=1`
  const params = []
  if (campaign_id) { sql += ` AND l.campaign_id=?`; params.push(campaign_id) }
  sql += ` ORDER BY l.created_at DESC LIMIT ?`
  params.push(Number(limit))
  res.json(db.prepare(sql).all(...params))
})

r.post('/log', (req, res) => {
  const db = getDb()
  const { agent_name = 'hermes', action, details, campaign_id, task_id } = req.body
  if (!action) return res.status(400).json({ error: 'action required' })
  const id = randomUUID()
  db.prepare(`INSERT INTO agent_log (id,agent_name,action,details,campaign_id,task_id) VALUES (?,?,?,?,?,?)`)
    .run(id, agent_name, action, typeof details === 'object' ? JSON.stringify(details) : details, campaign_id || null, task_id || null)
  res.status(201).json(db.prepare(`SELECT * FROM agent_log WHERE id=?`).get(id))
})

export default r
