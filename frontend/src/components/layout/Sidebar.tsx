import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Search, Target, MessageSquare, Megaphone,
  BarChart3, Settings, ChevronLeft, ChevronRight, Building2,
  Landmark, User, Handshake, Users, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
  { icon: Search, label: 'Market Research', to: '/research' },
  {
    icon: Target, label: 'Targets & Opportunities', to: '/targets',
    children: [
      { icon: Building2, label: 'Commercial', to: '/targets?mode=commercial' },
      { icon: Landmark, label: 'Government', to: '/targets?mode=government' },
      { icon: User, label: 'Private Clients', to: '/targets?mode=private_client' },
      { icon: Handshake, label: 'Partners', to: '/targets?mode=partner' },
      { icon: Users, label: 'Stakeholders', to: '/targets?mode=stakeholder' },
    ]
  },
  { icon: MessageSquare, label: 'Message Studio', to: '/messages' },
  { icon: Megaphone, label: 'Campaigns', to: '/campaigns' },
  { icon: BarChart3, label: 'Analytics & Insights', to: '/analytics' },
  { icon: Settings, label: 'Settings', to: '/settings' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const isTargetsActive = location.pathname.startsWith('/targets')

  return (
    <aside className={cn(
      'relative flex flex-col bg-[#0f172a] border-r border-[#243044] transition-all duration-300 shrink-0',
      collapsed ? 'w-[60px]' : 'w-[220px]'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center h-14 px-3 border-b border-[#243044] shrink-0', collapsed ? 'justify-center' : 'gap-2')}>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-bold text-slate-100 leading-tight">ForgeMark</div>
            <div className="text-[9px] text-teal-400 font-medium tracking-widest uppercase">AI</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to.split('?')[0])

          if (item.children && !collapsed) {
            return (
              <div key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive: na }) => cn('sidebar-link', (na || isTargetsActive) && 'active')}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
                {isTargetsActive && (
                  <div className="ml-6 mt-0.5 space-y-0.5 border-l border-[#243044] pl-2">
                    {item.children.map(child => {
                      const CIcon = child.icon
                      const [path, query] = child.to.split('?')
                      const mode = new URLSearchParams(query).get('mode')
                      const isChildActive = location.pathname === path &&
                        new URLSearchParams(location.search).get('mode') === mode
                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={cn('sidebar-link text-xs py-1.5', isChildActive && 'active')}
                        >
                          <CIcon className="w-3 h-3 shrink-0" />
                          <span className="truncate">{child.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive: na }) => cn('sidebar-link', na && 'active', collapsed && 'justify-center px-0')}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-[#1e293b] border border-[#334155] flex items-center justify-center text-slate-500 hover:text-slate-300 hover:border-teal-500 transition-colors z-10"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Bottom: version */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-[#243044]">
          <p className="text-[10px] text-slate-600">ForgeMark AI v1.0 · Phase 1</p>
        </div>
      )}
    </aside>
  )
}
