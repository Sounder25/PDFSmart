import { Bell, Search, User, MessageCircle, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'

interface TopBarProps {
  onOpenAssistant: () => void
}

export function TopBar({ onOpenAssistant }: TopBarProps) {
  const [searchValue, setSearchValue] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchValue.trim()) {
      navigate(`/targets?search=${encodeURIComponent(searchValue.trim())}`)
      setSearchValue('')
    }
  }

  return (
    <header className="h-14 bg-[#0f172a] border-b border-[#243044] flex items-center gap-4 px-4 shrink-0">
      {/* Global search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search targets, contacts, organizations…"
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            className="w-full bg-[#1e293b] border border-[#334155] rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </form>

      <div className="flex items-center gap-1 ml-auto">
        {/* AI Assistant launcher */}
        <button
          onClick={onOpenAssistant}
          className="flex items-center gap-2 px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-600/40 rounded-md text-xs text-teal-300 font-medium transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ask Your Market Director</span>
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-teal-500 rounded-full" />
        </button>

        {/* User menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors focus:outline-none">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-48 bg-[#1e293b] border border-[#334155] rounded-lg shadow-2xl p-1 z-50 animate-slide-in"
              sideOffset={8}
              align="end"
            >
              <div className="px-3 py-2 border-b border-[#334155] mb-1">
                <p className="text-xs font-medium text-slate-200">ForgeMark User</p>
                <p className="text-[10px] text-slate-500">v1 — Single User Mode</p>
              </div>
              <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-slate-100 hover:bg-white/5 rounded-md cursor-pointer outline-none"
                onSelect={() => navigate('/settings')}>
                <User className="w-3 h-3" />
                Settings
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
