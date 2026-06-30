import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { AIAssistant } from '@/components/shared/AIAssistant'

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#060d1c]">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(v => !v)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar onOpenAssistant={() => setAssistantOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <AIAssistant open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  )
}
