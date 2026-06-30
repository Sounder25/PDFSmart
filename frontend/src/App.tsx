import { Routes, Route } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Dashboard } from '@/pages/Dashboard'
import { MarketResearch } from '@/pages/MarketResearch'
import { TargetsPage } from '@/pages/Targets'
import { TargetProfile } from '@/pages/Targets/TargetProfile'
import { MessageStudio } from '@/pages/MessageStudio'
import { Campaigns } from '@/pages/Campaigns'
import { Analytics } from '@/pages/Analytics'
import { SettingsPage } from '@/pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="research" element={<MarketResearch />} />
        <Route path="targets" element={<TargetsPage />} />
        <Route path="targets/:id" element={<TargetProfile />} />
        <Route path="messages" element={<MessageStudio />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
