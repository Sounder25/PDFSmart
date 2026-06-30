import { NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  LayoutDashboard, Crosshair, Megaphone, Users, Send,
  FileText, Radio, TrendingUp, DollarSign, BarChart2,
  ChevronRight, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { icon: LayoutDashboard, label: 'Command Center', to: '/' },
  { icon: Crosshair, label: 'Brand Studio', to: '/brand' },
  { icon: Megaphone, label: 'Campaigns', to: '/campaigns' },
  { icon: Users, label: 'Contacts', to: '/contacts' },
  { icon: Send, label: 'Outreach Tracker', to: '/outreach' },
  { icon: FileText, label: 'Content Library', to: '/content' },
  { icon: Radio, label: 'Coverage & PR', to: '/coverage' },
  { icon: TrendingUp, label: 'Investor Board', to: '/investors' },
  { icon: DollarSign, label: 'Revenue Board', to: '/revenue' },
  { icon: BarChart2, label: 'Analytics', to: '/analytics' },
]

export function Sidebar() {
  const location = useLocation()
  const { data: dash } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.dashboard.get(), staleTime: 60_000 })
  const followUpsDue = dash?.kpis.follow_ups_due ?? 0

  return (
    <aside className="w-56 flex-shrink-0 bg-[#0d1520] border-r border-[#1f2d40] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#1f2d40]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-brand-500 flex items-center justify-center">
            <Crosshair className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100 tracking-tight">OPERATOR</div>
            <div className="text-[9px] text-slate-600 uppercase tracking-widest">Mission Marketing</div>
          </div>
        </div>
        {dash?.brand?.company_name && (
          <div className="mt-2.5 text-[10px] text-slate-500 truncate">{dash.brand.company_name}</div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ icon: Icon, label, to }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          const showBadge = to === '/outreach' && followUpsDue > 0
          return (
            <NavLink key={to} to={to}
              className={cn(
                'flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors group',
                isActive
                  ? 'bg-brand-500/15 text-brand-300 border border-brand-700/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              )}
            >
              <span className="flex items-center gap-2.5">
                <Icon className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-brand-400' : 'text-slate-600 group-hover:text-slate-400')} />
                {label}
              </span>
              {showBadge && (
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-black">
                  {followUpsDue > 9 ? '9+' : followUpsDue}
                </span>
              )}
              {isActive && !showBadge && <ChevronRight className="w-3 h-3 text-brand-500/50" />}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[#1f2d40]">
        {followUpsDue > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400/70 mb-2">
            <AlertCircle className="w-3 h-3" />
            {followUpsDue} follow-up{followUpsDue !== 1 ? 's' : ''} due
          </div>
        )}
        <div className="text-[9px] text-slate-700 uppercase tracking-widest">v1.0 · Built to Win</div>
      </div>
    </aside>
  )
}
