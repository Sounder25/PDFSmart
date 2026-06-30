import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDb } from './db/schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
import brandRouter from './routes/brand.js'
import campaignsRouter from './routes/campaigns.js'
import contactsRouter from './routes/contacts.js'
import outreachRouter from './routes/outreach.js'
import contentRouter from './routes/content.js'
import coverageRouter from './routes/coverage.js'
import investorsRouter from './routes/investors.js'
import revenueRouter from './routes/revenue.js'
import dashboardRouter from './routes/dashboard.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

getDb()

app.use('/api/brand', brandRouter)
app.use('/api/campaigns', campaignsRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/outreach', outreachRouter)
app.use('/api/content', contentRouter)
app.use('/api/coverage', coverageRouter)
app.use('/api/investors', investorsRouter)
app.use('/api/revenue', revenueRouter)
app.use('/api/dashboard', dashboardRouter)

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// Serve frontend in production
const DIST = path.join(__dirname, '..', '..', 'frontend', 'dist')
app.use(express.static(DIST))
app.get('*', (req, res) => res.sendFile(path.join(DIST, 'index.html')))

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => console.log(`OPERATOR API running on http://localhost:${PORT}`))
