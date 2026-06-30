import { Router } from 'express'
import { getDb } from '../db/database.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const totalTargets = db.prepare('SELECT COUNT(*) as cnt FROM target_entities').get().cnt
  const newThisMonth = db.prepare(`SELECT COUNT(*) as cnt FROM target_entities WHERE created_at >= ?`).get(monthStart).cnt
  const activeOpportunities = db.prepare(`SELECT COUNT(*) as cnt FROM opportunities WHERE stage NOT IN ('closed_won','closed_lost')`).get().cnt
  const outreachSent = db.prepare(`SELECT COUNT(*) as cnt FROM activities WHERE activity_type IN ('email','call','meeting')`).get().cnt
  const qualifiedCount = db.prepare(`SELECT COUNT(*) as cnt FROM target_entities WHERE status = 'qualified'`).get().cnt
  const pipelineValue = db.prepare(`SELECT COALESCE(SUM(estimated_value), 0) as total FROM target_entities WHERE status NOT IN ('won','lost','disqualified','inactive')`).get().total

  const marketDist = db.prepare(`SELECT market_mode, COUNT(*) as count FROM target_entities GROUP BY market_mode`).all()
  const statusDist = db.prepare(`SELECT status, COUNT(*) as count FROM target_entities GROUP BY status`).all()

  const highPriority = db.prepare(`
    SELECT te.*, sr.total_score, sr.score_classification
    FROM target_entities te
    LEFT JOIN score_records sr ON sr.target_entity_id = te.id
    WHERE sr.id = (SELECT id FROM score_records WHERE target_entity_id = te.id ORDER BY calculated_at DESC LIMIT 1)
    ORDER BY sr.total_score DESC LIMIT 5
  `).all()

  const needsEnrichment = db.prepare(`
    SELECT * FROM target_entities
    WHERE confidence_level = 'low' OR verification_status = 'unverified' OR last_enriched_at IS NULL
    ORDER BY created_at DESC LIMIT 5
  `).all()

  const recentActivity = db.prepare(`
    SELECT a.*, te.name as target_name, te.market_mode
    FROM activities a
    JOIN target_entities te ON a.target_entity_id = te.id
    ORDER BY a.created_at DESC LIMIT 10
  `).all()

  const stageDistribution = db.prepare(`
    SELECT stage, COUNT(*) as count, COALESCE(SUM(estimated_value),0) as value
    FROM opportunities GROUP BY stage
  `).all()

  // Strategic recommendations based on real data
  const recommendations = []
  if (needsEnrichment.length >= 3) {
    recommendations.push({
      type: 'enrichment',
      priority: 'high',
      title: 'Enrich low-confidence targets',
      body: `${needsEnrichment.length} targets have low confidence or are unenriched. Enriching these records will improve score accuracy and outreach effectiveness.`,
    })
  }
  if (qualifiedCount >= 3 && outreachSent === 0) {
    recommendations.push({
      type: 'outreach',
      priority: 'high',
      title: 'Begin outreach on qualified targets',
      body: `You have ${qualifiedCount} qualified targets but no outreach logged. Consider initiating contact with your highest-scoring targets.`,
    })
  }
  const lowScoreCount = db.prepare(`SELECT COUNT(*) as cnt FROM score_records WHERE score_classification = 'low_priority'`).get().cnt
  if (lowScoreCount > 5) {
    recommendations.push({
      type: 'pipeline',
      priority: 'medium',
      title: 'Review low-priority targets',
      body: `${lowScoreCount} targets are classified as Low Priority. Review these records to determine if they should be disqualified or need additional research to improve their score.`,
    })
  }
  const demoTargets = db.prepare(`SELECT COUNT(*) as cnt FROM target_entities WHERE is_demo = 1`).get().cnt
  const realTargets = totalTargets - demoTargets
  if (realTargets === 0 && demoTargets > 0) {
    recommendations.push({
      type: 'onboarding',
      priority: 'high',
      title: 'Add your first real targets',
      body: `You are currently working with demo data only. Run a Market Research session to discover and add your first real targets.`,
    })
  }
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'info',
      priority: 'low',
      title: 'Not enough activity yet',
      body: 'Not enough activity exists yet to calculate a reliable recommendation. Continue adding and enriching targets to unlock strategic insights.',
    })
  }

  // Data quality warnings
  const warnings = []
  const unverified = db.prepare(`SELECT COUNT(*) as cnt FROM target_entities WHERE verification_status = 'unverified' AND is_demo = 0`).get().cnt
  if (unverified > 0) warnings.push({ type: 'verification', message: `${unverified} real targets have unverified data.` })
  const noScore = db.prepare(`SELECT COUNT(*) as cnt FROM target_entities te WHERE NOT EXISTS (SELECT 1 FROM score_records sr WHERE sr.target_entity_id = te.id)`).get().cnt
  if (noScore > 0) warnings.push({ type: 'score', message: `${noScore} targets have no score calculated yet.` })
  const staleThreshold = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const stale = db.prepare(`SELECT COUNT(*) as cnt FROM target_entities WHERE last_enriched_at < ? AND last_enriched_at IS NOT NULL`).get(staleThreshold).cnt
  if (stale > 0) warnings.push({ type: 'staleness', message: `${stale} targets were last enriched more than 90 days ago.` })

  // Agricultural intelligence section
  let agriculturalIntelligence = null
  try {
    const newSignals = db.prepare(`SELECT COUNT(*) as cnt FROM ecosystem_signals WHERE status = 'new'`).get().cnt
    const highPrioritySignals = db.prepare(`SELECT COUNT(*) as cnt FROM ecosystem_signals WHERE urgency IN ('high','immediate') AND status NOT IN ('archived')`).get().cnt
    const signalsWithoutAction = db.prepare(`SELECT COUNT(*) as cnt FROM ecosystem_signals WHERE marketing_implication IS NOT NULL AND status = 'new'`).get().cnt
    const campaignsFromSignals = db.prepare(`SELECT COUNT(*) as cnt FROM campaigns WHERE origin_type = 'ecosystem_signal'`).get().cnt

    const priorityCounties = db.prepare(`
      SELECT entity_type, primary_location, COUNT(*) as target_count
      FROM target_entities
      WHERE entity_type = 'county' AND status NOT IN ('lost','disqualified','inactive')
      GROUP BY primary_location ORDER BY target_count DESC LIMIT 5
    `).all()

    const priorityStateAgencies = db.prepare(`
      SELECT name, primary_location, status
      FROM target_entities
      WHERE entity_type = 'state_agency' AND status NOT IN ('lost','disqualified','inactive')
      ORDER BY created_at DESC LIMIT 5
    `).all()

    const fundingOpps = db.prepare(`SELECT COUNT(*) as cnt FROM target_entities WHERE entity_type = 'funding_program' AND status NOT IN ('lost','disqualified','inactive')`).get().cnt
    const contractOpps = db.prepare(`SELECT COUNT(*) as cnt FROM target_entities WHERE entity_type = 'procurement_opportunity' AND status NOT IN ('lost','disqualified','inactive')`).get().cnt

    const recentSignals = db.prepare(`
      SELECT * FROM ecosystem_signals WHERE status != 'archived' ORDER BY urgency DESC, created_at DESC LIMIT 5
    `).all().map(r => ({ ...r, counties: JSON.parse(r.counties_json || '[]') }))

    agriculturalIntelligence = {
      new_signals: newSignals,
      high_priority_signals: highPrioritySignals,
      signals_without_action: signalsWithoutAction,
      campaigns_from_signals: campaignsFromSignals,
      priority_counties: priorityCounties,
      priority_state_agencies: priorityStateAgencies,
      funding_opportunities: fundingOpps,
      contract_opportunities: contractOpps,
      recent_signals: recentSignals,
    }
  } catch (_) {
    // ecosystem_signals table may not exist yet if migration hasn't run
  }

  res.json({
    kpis: {
      total_targets: totalTargets,
      new_this_month: newThisMonth,
      active_opportunities: activeOpportunities,
      outreach_sent: outreachSent,
      qualified_count: qualifiedCount,
      pipeline_value: pipelineValue,
    },
    market_distribution: marketDist,
    status_distribution: statusDist,
    stage_distribution: stageDistribution,
    high_priority_targets: highPriority,
    needs_enrichment: needsEnrichment,
    recent_activity: recentActivity,
    recommendations,
    data_quality_warnings: warnings,
    agricultural_intelligence: agriculturalIntelligence,
  })
})

export default router
