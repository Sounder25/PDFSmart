import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', '..', 'operator.db')

let db

export function getDb() {
  if (db) return db
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initSchema()
  return db
}

function initSchema() {
  db.exec(`
    -- Brand identity (singleton row, id = 'singleton')
    CREATE TABLE IF NOT EXISTS brand_profile (
      id TEXT PRIMARY KEY DEFAULT 'singleton',
      company_name TEXT,
      founder_name TEXT,
      tagline TEXT,
      mission TEXT,
      origin_story TEXT,
      problem_statement TEXT,
      solution_statement TEXT,
      elevator_pitch TEXT,
      book_title TEXT,
      book_subtitle TEXT,
      book_description TEXT,
      book_status TEXT DEFAULT 'writing',
      book_price REAL,
      book_link TEXT,
      primary_audiences_json TEXT DEFAULT '[]',
      key_differentiators_json TEXT DEFAULT '[]',
      proof_points_json TEXT DEFAULT '[]',
      cta_investor TEXT,
      cta_customer TEXT,
      cta_reader TEXT,
      website TEXT,
      linkedin TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Insert singleton if not exists
    INSERT OR IGNORE INTO brand_profile (id, company_name, website) VALUES ('singleton', 'Sounder Solutions', 'https://soundersolution.com');

    -- Campaigns
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'general',
      status TEXT NOT NULL DEFAULT 'planning',
      goal TEXT,
      target_audience TEXT,
      budget REAL,
      start_date TEXT,
      end_date TEXT,
      description TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Contacts
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'general',
      audience_segment TEXT,
      organization TEXT,
      title TEXT,
      email TEXT,
      phone TEXT,
      website TEXT,
      location TEXT,
      status TEXT NOT NULL DEFAULT 'cold',
      last_contacted TEXT,
      next_follow_up TEXT,
      notes TEXT,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Outreach log
    CREATE TABLE IF NOT EXISTS outreach_log (
      id TEXT PRIMARY KEY,
      contact_id TEXT REFERENCES contacts(id) ON DELETE CASCADE,
      campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
      channel TEXT NOT NULL DEFAULT 'email',
      direction TEXT NOT NULL DEFAULT 'sent',
      subject TEXT,
      body_preview TEXT,
      outcome TEXT DEFAULT 'pending',
      follow_up_date TEXT,
      notes TEXT,
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Content assets
    CREATE TABLE IF NOT EXISTS content_assets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'email_template',
      audience TEXT DEFAULT 'general',
      content TEXT,
      notes TEXT,
      is_approved INTEGER NOT NULL DEFAULT 0,
      campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Coverage log (media hits, podcasts, speaking)
    CREATE TABLE IF NOT EXISTS coverage_log (
      id TEXT PRIMARY KEY,
      contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
      type TEXT NOT NULL DEFAULT 'press_article',
      outlet_name TEXT,
      headline TEXT,
      url TEXT,
      reach_estimate INTEGER,
      sentiment TEXT DEFAULT 'positive',
      published_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Investor pipeline
    CREATE TABLE IF NOT EXISTS investor_pipeline (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      stage TEXT NOT NULL DEFAULT 'identified',
      ask_amount REAL,
      committed_amount REAL,
      last_activity TEXT,
      next_action TEXT,
      next_action_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Revenue events
    CREATE TABLE IF NOT EXISTS revenue_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'book_sale',
      amount REAL NOT NULL DEFAULT 0,
      quantity INTEGER DEFAULT 1,
      contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
      campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
      description TEXT,
      event_date TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Campaign plans (one per campaign, written by human or agent)
    CREATE TABLE IF NOT EXISTS campaign_plans (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      summary TEXT,
      goal TEXT,
      strategy TEXT,
      created_by TEXT NOT NULL DEFAULT 'human',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Phases within a plan
    CREATE TABLE IF NOT EXISTS campaign_phases (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES campaign_plans(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      start_date TEXT,
      end_date TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Milestones within a phase
    CREATE TABLE IF NOT EXISTS campaign_milestones (
      id TEXT PRIMARY KEY,
      phase_id TEXT NOT NULL REFERENCES campaign_phases(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Agent task queue
    CREATE TABLE IF NOT EXISTS agent_tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'general',
      assigned_to TEXT NOT NULL DEFAULT 'human',
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      due_date TEXT,
      campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
      contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
      milestone_id TEXT REFERENCES campaign_milestones(id) ON DELETE SET NULL,
      result TEXT,
      created_by TEXT NOT NULL DEFAULT 'human',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Agent activity log (append-only)
    CREATE TABLE IF NOT EXISTS agent_log (
      id TEXT PRIMARY KEY,
      agent_name TEXT NOT NULL DEFAULT 'hermes',
      action TEXT NOT NULL,
      details TEXT,
      campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
      task_id TEXT REFERENCES agent_tasks(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
    CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
    CREATE INDEX IF NOT EXISTS idx_outreach_contact ON outreach_log(contact_id);
    CREATE INDEX IF NOT EXISTS idx_outreach_campaign ON outreach_log(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_coverage_contact ON coverage_log(contact_id);
    CREATE INDEX IF NOT EXISTS idx_investor_contact ON investor_pipeline(contact_id);
    CREATE INDEX IF NOT EXISTS idx_revenue_type ON revenue_events(type);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON agent_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_campaign ON agent_tasks(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_log_campaign ON agent_log(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_plan_campaign ON campaign_plans(campaign_id);
  `)
}
