import { Routes, Route } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Dashboard } from '@/pages/Dashboard'
import { BrandStudio } from '@/pages/BrandStudio'
import { Campaigns } from '@/pages/Campaigns'
import { Contacts } from '@/pages/Contacts'
import { Outreach } from '@/pages/Outreach'
import { ContentLibrary } from '@/pages/ContentLibrary'
import { Coverage } from '@/pages/Coverage'
import { InvestorBoard } from '@/pages/InvestorBoard'
import { Revenue } from '@/pages/Revenue'
import { Analytics } from '@/pages/Analytics'
import { MissionPlanner } from '@/pages/MissionPlanner'

export default function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/brand" element={<BrandStudio />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/outreach" element={<Outreach />} />
            <Route path="/content" element={<ContentLibrary />} />
            <Route path="/coverage" element={<Coverage />} />
            <Route path="/investors" element={<InvestorBoard />} />
            <Route path="/revenue" element={<Revenue />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/planner" element={<MissionPlanner />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
