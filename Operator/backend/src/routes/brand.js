import { Router } from 'express'
import { getDb } from '../db/schema.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM brand_profile WHERE id = ?').get('singleton')
  if (!row) return res.json({})
  const profile = {
    ...row,
    primary_audiences: JSON.parse(row.primary_audiences_json || '[]'),
    key_differentiators: JSON.parse(row.key_differentiators_json || '[]'),
    proof_points: JSON.parse(row.proof_points_json || '[]'),
  }
  delete profile.primary_audiences_json
  delete profile.key_differentiators_json
  delete profile.proof_points_json
  res.json(profile)
})

router.put('/', (req, res) => {
  const db = getDb()
  const {
    company_name, founder_name, tagline, mission, origin_story,
    problem_statement, solution_statement, elevator_pitch,
    book_title, book_subtitle, book_description, book_status, book_price, book_link,
    primary_audiences, key_differentiators, proof_points,
    cta_investor, cta_customer, cta_reader, website, linkedin,
  } = req.body

  db.prepare(`
    UPDATE brand_profile SET
      company_name = COALESCE(?, company_name),
      founder_name = COALESCE(?, founder_name),
      tagline = COALESCE(?, tagline),
      mission = COALESCE(?, mission),
      origin_story = COALESCE(?, origin_story),
      problem_statement = COALESCE(?, problem_statement),
      solution_statement = COALESCE(?, solution_statement),
      elevator_pitch = COALESCE(?, elevator_pitch),
      book_title = COALESCE(?, book_title),
      book_subtitle = COALESCE(?, book_subtitle),
      book_description = COALESCE(?, book_description),
      book_status = COALESCE(?, book_status),
      book_price = COALESCE(?, book_price),
      book_link = COALESCE(?, book_link),
      primary_audiences_json = COALESCE(?, primary_audiences_json),
      key_differentiators_json = COALESCE(?, key_differentiators_json),
      proof_points_json = COALESCE(?, proof_points_json),
      cta_investor = COALESCE(?, cta_investor),
      cta_customer = COALESCE(?, cta_customer),
      cta_reader = COALESCE(?, cta_reader),
      website = COALESCE(?, website),
      linkedin = COALESCE(?, linkedin),
      updated_at = datetime('now')
    WHERE id = 'singleton'
  `).run(
    company_name ?? null, founder_name ?? null, tagline ?? null, mission ?? null,
    origin_story ?? null, problem_statement ?? null, solution_statement ?? null, elevator_pitch ?? null,
    book_title ?? null, book_subtitle ?? null, book_description ?? null, book_status ?? null,
    book_price ?? null, book_link ?? null,
    primary_audiences ? JSON.stringify(primary_audiences) : null,
    key_differentiators ? JSON.stringify(key_differentiators) : null,
    proof_points ? JSON.stringify(proof_points) : null,
    cta_investor ?? null, cta_customer ?? null, cta_reader ?? null,
    website ?? null, linkedin ?? null,
  )

  const row = db.prepare('SELECT * FROM brand_profile WHERE id = ?').get('singleton')
  const updated = {
    ...row,
    primary_audiences: JSON.parse(row.primary_audiences_json || '[]'),
    key_differentiators: JSON.parse(row.key_differentiators_json || '[]'),
    proof_points: JSON.parse(row.proof_points_json || '[]'),
  }
  delete updated.primary_audiences_json
  delete updated.key_differentiators_json
  delete updated.proof_points_json
  res.json(updated)
})

export default router
