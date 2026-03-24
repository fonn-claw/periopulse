import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const staffNav = [
  { to: '/', label: 'Dashboard', icon: '⊞' },
  { to: '/patients', label: 'Patients', icon: '⊡' },
]

const patientNav = [
  { to: '/portal', label: 'My Health', icon: '♥' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const nav = user?.role === 'patient' ? patientNav : staffNav

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                <path d="M12 2c-2.5 0-4.5 2-4.5 5 0 2 .7 4 1.3 5.8l2 6.5c.3 1 .7 1.7 1.2 1.7s.9-.7 1.2-1.7l2-6.5C15.8 11 16.5 9 16.5 7c0-3-2-5-4.5-5z"/>
              </svg>
            </div>
            <span className="text-lg font-semibold text-slate-800">PerioPulse</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {nav.map(n => (
              <Link key={n.to} to={n.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === n.to
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}>
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-slate-700">{user?.name}</div>
              <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
            </div>
            <button onClick={logout}
              className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex">
        {nav.map(n => (
          <Link key={n.to} to={n.to}
            className={`flex-1 py-3 text-center text-xs font-medium ${
              location.pathname === n.to ? 'text-sky-600' : 'text-slate-500'
            }`}>
            <div className="text-lg">{n.icon}</div>
            {n.label}
          </Link>
        ))}
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 sm:pb-6">
        <Outlet />
      </main>
    </div>
  )
}
