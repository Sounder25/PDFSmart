export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS target_entities (
      id TEXT PRIMARY KEY,
      market_mode TEXT NOT NULL CHECK(market_mode IN ('commercial','government','private_client','partner','stakeholder')),
      entity_type TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      website TEXT,
      domain TEXT,
      primary_location TEXT,
      service_area TEXT,
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','researching','qualified','active','proposal','won','lost','inactive','disqualified')),
      estimated_value REAL,
      confidence_level TEXT NOT NULL DEFAULT 'low' CHECK(confidence_level IN ('low','medium','high','verified')),
      verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK(verification_status IN ('unverified','partial','sourced','verified')),
      is_demo INTEGER NOT NULL DEFAULT 0,
      tags_json TEXT NOT NULL DEFAULT '[]',
      industry TEXT,
      subindustry TEXT,
      naics_code TEXT,
      psc_code TEXT,
      fiscal_year TEXT,
      acquisition_path TEXT,
      set_aside_type TEXT,
      opportunity_type TEXT,
      priority_rank INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_enriched_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_te_market_mode ON target_entities(market_mode);
    CREATE INDEX IF NOT EXISTS idx_te_status ON target_entities(status);
    CREATE INDEX IF NOT EXISTS idx_te_domain ON target_entities(domain);
    CREATE INDEX IF NOT EXISTS idx_te_name ON target_entities(name);
    CREATE INDEX IF NOT EXISTS idx_te_is_demo ON target_entities(is_demo);

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      target_entity_id TEXT NOT NULL REFERENCES target_entities(id) ON DELETE CASCADE,
      name TEXT,
      title TEXT,
      department TEXT,
      role_type TEXT,
      email TEXT,
      phone TEXT,
      linkedin_url TEXT,
      public_contact_path TEXT,
      confidence_level TEXT NOT NULL DEFAULT 'low' CHECK(confidence_level IN ('low','medium','high','verified')),
      verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK(verification_status IN ('unverified','partial','sourced','verified')),
      is_primary INTEGER NOT NULL DEFAULT 0,
      is_recommended_role INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_entity ON contacts(target_entity_id);

    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      target_entity_id TEXT NOT NULL REFERENCES target_entities(id) ON DELETE CASCADE,
      opportunity_type TEXT NOT NULL DEFAULT 'direct_sale',
      title TEXT NOT NULL,
      description TEXT,
      estimated_value REAL,
      probability INTEGER DEFAULT 50 CHECK(probability BETWEEN 0 AND 100),
      stage TEXT NOT NULL DEFAULT 'identified' CHECK(stage IN ('identified','qualifying','proposal','negotiation','closed_won','closed_lost')),
      acquisition_path TEXT,
      funding_source TEXT,
      expected_decision_date TEXT,
      fiscal_year TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_opp_entity ON opportunities(target_entity_id);
    CREATE INDEX IF NOT EXISTS idx_opp_stage ON opportunities(stage);

    CREATE TABLE IF NOT EXISTS research_claims (
      id TEXT PRIMARY KEY,
      target_entity_id TEXT NOT NULL REFERENCES target_entities(id) ON DELETE CASCADE,
      claim_type TEXT NOT NULL,
      claim_text TEXT NOT NULL,
      classification TEXT NOT NULL DEFAULT 'inferred' CHECK(classification IN ('verified','sourced','inferred','user_provided','simulated','unknown')),
      confidence_level TEXT NOT NULL DEFAULT 'low' CHECK(confidence_level IN ('low','medium','high','verified')),
      verification_status TEXT NOT NULL DEFAULT 'unverified',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_claims_entity ON research_claims(target_entity_id);

    CREATE TABLE IF NOT EXISTS research_sources (
      id TEXT PRIMARY KEY,
      research_claim_id TEXT NOT NULL REFERENCES research_claims(id) ON DELETE CASCADE,
      source_name TEXT NOT NULL,
      source_url TEXT,
      publisher TEXT,
      published_date TEXT,
      retrieved_date TEXT,
      source_type TEXT,
      source_quality TEXT DEFAULT 'medium' CHECK(source_quality IN ('low','medium','high')),
      summary TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS score_records (
      id TEXT PRIMARY KEY,
      target_entity_id TEXT NOT NULL REFERENCES target_entities(id) ON DELETE CASCADE,
      scoring_model TEXT NOT NULL,
      total_score INTEGER NOT NULL DEFAULT 0,
      score_classification TEXT NOT NULL DEFAULT 'low_priority' CHECK(score_classification IN ('priority','strong','possible','low_priority')),
      confidence_level TEXT NOT NULL DEFAULT 'low',
      calculated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_scores_entity ON score_records(target_entity_id);

    CREATE TABLE IF NOT EXISTS score_dimensions (
      id TEXT PRIMARY KEY,
      score_record_id TEXT NOT NULL REFERENCES score_records(id) ON DELETE CASCADE,
      dimension_name TEXT NOT NULL,
      points_earned INTEGER NOT NULL DEFAULT 0,
      maximum_points INTEGER NOT NULL,
      explanation TEXT,
      supporting_claim_ids TEXT DEFAULT '[]',
      confidence_level TEXT NOT NULL DEFAULT 'low',
      missing_data_penalty INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_dims_record ON score_dimensions(score_record_id);

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      target_entity_id TEXT NOT NULL REFERENCES target_entities(id) ON DELETE CASCADE,
      activity_type TEXT NOT NULL CHECK(activity_type IN ('note','email','call','meeting','research','enrichment','status_change','message_sent','import','system')),
      channel TEXT,
      description TEXT NOT NULL,
      outcome TEXT,
      performed_by TEXT DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(target_entity_id);
    CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type);

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      target_entity_id TEXT NOT NULL REFERENCES target_entities(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(target_entity_id);

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#14b8a6',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS target_tags (
      target_entity_id TEXT NOT NULL REFERENCES target_entities(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (target_entity_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS saved_research_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      market_mode TEXT NOT NULL,
      criteria_json TEXT NOT NULL DEFAULT '{}',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS research_drafts (
      id TEXT PRIMARY KEY DEFAULT 'singleton',
      market_mode TEXT NOT NULL DEFAULT 'commercial',
      criteria_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      target_entity_id TEXT REFERENCES target_entities(id) ON DELETE SET NULL,
      channel TEXT NOT NULL DEFAULT 'email' CHECK(channel IN ('email','phone','linkedin','letter','text','other')),
      tone TEXT DEFAULT 'professional',
      subject TEXT,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','sent','failed')),
      variant TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      sent_at TEXT
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      market_mode TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','paused','completed','archived')),
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS campaign_steps (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      sequence_order INTEGER NOT NULL DEFAULT 1,
      delay_days INTEGER NOT NULL DEFAULT 0,
      channel TEXT NOT NULL DEFAULT 'email',
      template_id TEXT,
      instructions TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS enrichment_history (
      id TEXT PRIMARY KEY,
      target_entity_id TEXT NOT NULL REFERENCES target_entities(id) ON DELETE CASCADE,
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      old_confidence TEXT,
      new_confidence TEXT,
      classification TEXT,
      action TEXT NOT NULL CHECK(action IN ('accepted','rejected','skipped')),
      enriched_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ecosystem_signals (
      id TEXT PRIMARY KEY,
      target_entity_id TEXT REFERENCES target_entities(id) ON DELETE SET NULL,
      topic TEXT NOT NULL,
      signal_type TEXT NOT NULL,
      state TEXT,
      counties_json TEXT NOT NULL DEFAULT '[]',
      industry TEXT,
      species TEXT,
      severity TEXT DEFAULT 'medium' CHECK(severity IN ('low','medium','high','critical')),
      urgency TEXT DEFAULT 'medium' CHECK(urgency IN ('low','medium','high','immediate')),
      source TEXT,
      published_date TEXT,
      operational_implication TEXT,
      funding_implication TEXT,
      contract_implication TEXT,
      marketing_implication TEXT,
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewed','actioned','archived')),
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_signals_state ON ecosystem_signals(state);
    CREATE INDEX IF NOT EXISTS idx_signals_type ON ecosystem_signals(signal_type);
    CREATE INDEX IF NOT EXISTS idx_signals_status ON ecosystem_signals(status);

    CREATE TABLE IF NOT EXISTS business_documents (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER,
      description TEXT,
      content_base64 TEXT,
      extraction_status TEXT NOT NULL DEFAULT 'pending' CHECK(extraction_status IN ('pending','extracted','reviewed','archived')),
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS document_extractions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES business_documents(id) ON DELETE CASCADE,
      extraction_type TEXT NOT NULL,
      extracted_text TEXT NOT NULL,
      source_page TEXT,
      source_section TEXT,
      classification TEXT NOT NULL DEFAULT 'unknown',
      readiness_status TEXT NOT NULL DEFAULT 'Unknown',
      marketing_approval INTEGER NOT NULL DEFAULT 0,
      qualification_required INTEGER NOT NULL DEFAULT 0,
      allowed_channels_json TEXT NOT NULL DEFAULT '[]',
      prohibited_contexts_json TEXT NOT NULL DEFAULT '[]',
      profile_field TEXT,
      approval_status TEXT NOT NULL DEFAULT 'pending' CHECK(approval_status IN ('pending','approved','rejected')),
      approved_at TEXT,
      extracted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_extractions_doc ON document_extractions(document_id);
    CREATE INDEX IF NOT EXISTS idx_extractions_status ON document_extractions(approval_status);

    CREATE TABLE IF NOT EXISTS business_profile (
      id TEXT PRIMARY KEY DEFAULT 'singleton',
      business_name TEXT,
      description TEXT,
      mission TEXT,
      products_json TEXT NOT NULL DEFAULT '[]',
      services_json TEXT NOT NULL DEFAULT '[]',
      capabilities_json TEXT NOT NULL DEFAULT '[]',
      target_customers_json TEXT NOT NULL DEFAULT '[]',
      target_industries_json TEXT NOT NULL DEFAULT '[]',
      geographic_markets_json TEXT NOT NULL DEFAULT '[]',
      pricing_notes TEXT,
      differentiators_json TEXT NOT NULL DEFAULT '[]',
      proof_points_json TEXT NOT NULL DEFAULT '[]',
      team_qualifications TEXT,
      procurement_readiness TEXT,
      funding_readiness TEXT,
      approved_claims_json TEXT NOT NULL DEFAULT '[]',
      restricted_claims_json TEXT NOT NULL DEFAULT '[]',
      calls_to_action_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Additive column migrations — each wrapped to silently skip if column exists
  const addColumns = [
    `ALTER TABLE target_entities ADD COLUMN development_type TEXT`,
    `ALTER TABLE activities ADD COLUMN agri_type TEXT`,
    `ALTER TABLE campaigns ADD COLUMN origin_type TEXT`,
    `ALTER TABLE campaigns ADD COLUMN campaign_type TEXT`,
    `ALTER TABLE campaigns ADD COLUMN target_entity_id TEXT REFERENCES target_entities(id) ON DELETE SET NULL`,
    `ALTER TABLE messages ADD COLUMN output_type TEXT`,
  ]
  for (const sql of addColumns) {
    try { db.exec(sql) } catch (_) { /* column already exists */ }
  }
}
