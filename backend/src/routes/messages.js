import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const { target_entity_id, status } = req.query
  let where = []
  let params = []
  if (target_entity_id) { where.push('target_entity_id = ?'); params.push(target_entity_id) }
  if (status) { where.push('status = ?'); params.push(status) }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  res.json(db.prepare(`SELECT * FROM messages ${clause} ORDER BY created_at DESC`).all(...params))
})

router.post('/', (req, res) => {
  const db = getDb()
  const { target_entity_id, channel = 'email', tone = 'professional', subject, body, status = 'draft', variant } = req.body
  if (!body?.trim()) return res.status(400).json({ error: 'body required' })
  const id = uuidv4()
  db.prepare(`INSERT INTO messages (id, target_entity_id, channel, tone, subject, body, status, variant) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, target_entity_id || null, channel, tone, subject || null, body.trim(), status, variant || null)
  res.status(201).json(db.prepare('SELECT * FROM messages WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM messages WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  const fields = ['channel','tone','subject','body','status','variant','sent_at']
  const updates = []
  const params = []
  fields.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]) } })
  params.push(req.params.id)
  if (updates.length) db.prepare(`UPDATE messages SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM messages WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// Generate a demo outreach message
router.post('/generate', (req, res) => {
  const db = getDb()
  const { target_entity_id, channel = 'email', tone = 'professional' } = req.body
  if (!target_entity_id) return res.status(400).json({ error: 'target_entity_id required' })

  const target = db.prepare('SELECT * FROM target_entities WHERE id = ?').get(target_entity_id)
  if (!target) return res.status(404).json({ error: 'Target not found' })

  const contacts = db.prepare('SELECT * FROM contacts WHERE target_entity_id = ?').all(target_entity_id)
  const primaryContact = contacts.find(c => c.is_primary) || contacts[0]
  const greeting = primaryContact?.name ? `Dear ${primaryContact.name}` : (primaryContact?.title ? `Dear ${primaryContact.title}` : 'Dear Decision Maker')

  const modeTemplates = {
    commercial: {
      subject: `Partnership Opportunity — ${target.name}`,
      body: `${greeting},\n\nI hope this message finds you well. I'm reaching out regarding [Your Company] and a potential opportunity to work together.\n\nBased on available context, ${target.name} ${target.description ? `— ${target.description.substring(0, 100)}` : ''} — appears to be a strong fit for what we offer.\n\nI'd welcome a brief conversation to explore whether there's mutual value here.\n\n[Your personalized value proposition here — based on research into the organization's specific needs and context.]\n\nWould you be available for a 20-minute call this week or next?\n\nBest regards,\n[Your Name]\n[Your Title]\n[Your Organization]\n\n⚠️ Demo Message — This message was generated for workflow demonstration. Review and personalize before sending. Ensure compliance with applicable outreach regulations.`,
    },
    government: {
      subject: `Capabilities Inquiry — ${target.name}`,
      body: `${greeting},\n\nI am writing to introduce [Your Organization] and inquire about upcoming procurement opportunities related to [relevant mission area].\n\nWe understand that ${target.name}'s mission includes [mission context]. Our capabilities in [relevant areas] may align with your requirements.\n\nWe would welcome the opportunity to provide a brief capabilities overview at your convenience.\n\n⚠️ Demo Message — Review for procurement integrity compliance before sending. Government outreach must comply with applicable ethics and communication regulations.`,
    },
    private_client: {
      subject: `[Your Service] — ${target.primary_location || 'Your Area'}`,
      body: `${greeting},\n\nI'm reaching out because I believe we may be able to help with [relevant need based on research].\n\nWe provide [your service] to property owners and land managers in the [region] area. Based on available context, ${target.name} may benefit from [specific service].\n\nI'd be happy to schedule a no-obligation site visit at your convenience.\n\n⚠️ Demo Message — Confirm consent and contact preferences before outreach. Ensure TCPA compliance for phone contacts.`,
    },
    partner: {
      subject: `Partnership Exploration — ${target.name}`,
      body: `${greeting},\n\nI'm reaching out because I believe there may be a meaningful opportunity for our organizations to collaborate.\n\n[Your Organization] works with [target market] and we see strong complementary potential with ${target.name}'s work in [relevant area].\n\nI'd welcome a brief conversation to explore what a partnership might look like.\n\n⚠️ Demo Message — Review for accuracy and personalize based on specific partnership objectives.`,
    },
    stakeholder: {
      subject: `Stakeholder Engagement — [Your Organization]`,
      body: `${greeting},\n\nI am writing to introduce [Your Organization] and share how our work relates to [stakeholder's area of focus].\n\nWe believe our mission aligns with your work in [relevant area] and would value the opportunity to connect.\n\n⚠️ Demo Message — Review lobbying disclosure requirements where applicable. Ensure transparency of representation.`,
    },
  }

  const template = modeTemplates[target.market_mode] || modeTemplates.commercial

  res.json({
    demo_mode: true,
    disclaimer: 'This message was generated for workflow demonstration using available target context. It has not been sent and requires review and personalization before use.',
    channel,
    tone,
    subject: template.subject,
    body: template.body,
    target_name: target.name,
    market_mode: target.market_mode,
  })
})

export default router
