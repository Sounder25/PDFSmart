import express from 'express'
import cors from 'cors'
import { getDb } from './db/database.js'
import targetsRouter from './routes/targets.js'
import contactsRouter from './routes/contacts.js'
import opportunitiesRouter from './routes/opportunities.js'
import activitiesRouter from './routes/activities.js'
import notesRouter from './routes/notes.js'
import tagsRouter from './routes/tags.js'
import researchRouter from './routes/research.js'
import scoresRouter from './routes/scores.js'
import claimsRouter from './routes/claims.js'
import dashboardRouter from './routes/dashboard.js'
import messagesRouter from './routes/messages.js'
import enrichRouter from './routes/enrich.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Initialize DB on startup
getDb()

app.use('/api/targets', targetsRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/opportunities', opportunitiesRouter)
app.use('/api/activities', activitiesRouter)
app.use('/api/notes', notesRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/research', researchRouter)
app.use('/api/scores', scoresRouter)
app.use('/api/claims', claimsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/messages', messagesRouter)
app.use('/api/enrich', enrichRouter)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`ForgeMark API running on http://localhost:${PORT}`)
})
