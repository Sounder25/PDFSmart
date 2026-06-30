import { Router } from 'express'
import { getDb } from '../db/schema.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()

  const brand = db.prepare('SELECT company_name, founder_name, tagline, mission FROM brand_profile WHERE id = ?').get('singleton')

  const contacts = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN status = "warm" THEN 1 ELSE 0 END) as warm, SUM(CASE WHEN status = "active" THEN 1 ELSE 0 END) as active FROM contacts').get()
  const campaigns = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN status = "active" THEN 1 ELSE 0 END) as active FROM campaigns').get()
  const outreach_7d = db.prepare(`SELECT COUNT(*) as n FROM outreach_log WHERE sent_at >= datetime('now', '-7 days')`).get()?.n ?? 0
  const outreach_total = db.prepare('SELECT COUNT(*) as n FROM outreach_log').get()?.n ?? 0
  const responses = db.prepare(`SELECT COUNT(*) as n FROM outreach_log WHERE outcome IN ('responded', 'interested', 'meeting_booked', 'coverage_secured')`).get()?.n ?? 0

  const coverage = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(reach_estimate), 0) as total_reach FROM coverage_log').get()
  const revenue = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM revenue_events').get()?.total ?? 0
  const book_revenue = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM revenue_events WHERE type = 'book_sale'`).get()?.total ?? 0

  const investor_summary = db.prepare(`
    SELECT COUNT(*) as total_investors,
      COALESCE(SUM(committed_amount), 0) as total_committed,
      COALESCE(SUM(ask_amount), 0) as total_ask,
      SUM(CASE WHEN stage IN ('meeting_scheduled', 'follow_up', 'due_diligence') THEN 1 ELSE 0 END) as active_conversations
    FROM investor_pipeline
  `).get()

  const follow_ups_due = db.prepare(`
    SELECT COUNT(*) as n FROM contacts
    WHERE next_follow_up IS NOT NULL AND next_follow_up <= datetime('now') AND status NOT IN ('won', 'lost')
  `).get()?.n ?? 0

  const recent_outreach = db.prepare(`
    SELECT ol.*, c.name as contact_name, c.type as contact_type, c.organization
    FROM outreach_log ol LEFT JOIN contacts c ON c.id = ol.contact_id
    ORDER BY ol.sent_at DESC LIMIT 5
  `).all()

  const recent_coverage = db.prepare(`
    SELECT * FROM coverage_log ORDER BY published_date DESC, created_at DESC LIMIT 5
  `).all()

  const upcoming_follow_ups = db.prepare(`
    SELECT * FROM contacts
    WHERE next_follow_up IS NOT NULL AND status NOT IN ('won', 'lost')
    ORDER BY next_follow_up ASC LIMIT 5
  `).all()

  const investor_pipeline = db.prepare(`
    SELECT ip.stage, COUNT(*) as count
    FROM investor_pipeline ip GROUP BY ip.stage
  `).all()

  res.json({
    brand,
    kpis: {
      total_contacts: contacts?.total ?? 0,
      warm_contacts: contacts?.warm ?? 0,
      active_contacts: contacts?.active ?? 0,
      active_campaigns: campaigns?.active ?? 0,
      total_campaigns: campaigns?.total ?? 0,
      outreach_7d,
      outreach_total,
      response_count: responses,
      coverage_count: coverage?.count ?? 0,
      total_reach: coverage?.total_reach ?? 0,
      total_revenue: revenue,
      book_revenue,
      total_committed: investor_summary?.total_committed ?? 0,
      total_ask: investor_summary?.total_ask ?? 0,
      active_investor_conversations: investor_summary?.active_conversations ?? 0,
      total_investors: investor_summary?.total_investors ?? 0,
      follow_ups_due,
    },
    recent_outreach,
    recent_coverage,
    upcoming_follow_ups,
    investor_pipeline,
  })
})

export default router
