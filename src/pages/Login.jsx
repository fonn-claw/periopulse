import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const demoAccounts = [
  { email: 'hygienist@periopulse.app', label: 'Hygienist', desc: 'Charting & Notes' },
  { email: 'dentist@periopulse.app', label: 'Dentist', desc: 'Treatment Plans' },
  { email: 'admin@periopulse.app', label: 'Admin', desc: 'Dashboard & Management' },
  { email: 'patient@periopulse.app', label: 'Patient', desc: 'Portal & Records' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e, demoEmail) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(demoEmail || email, demoEmail ? 'demo1234' : password)
      navigate(user.role === 'patient' ? '/portal' : '/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-500 rounded-2xl mb-4 shadow-lg shadow-sky-500/25">
            <svg viewBox="0 0 24 24" className="w-9 h-9 text-white" fill="currentColor">
              <path d="M12 2c-2.5 0-4.5 2-4.5 5 0 2 .7 4 1.3 5.8l2 6.5c.3 1 .7 1.7 1.2 1.7s.9-.7 1.2-1.7l2-6.5C15.8 11 16.5 9 16.5 7c0-3-2-5-4.5-5z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">PerioPulse</h1>
          <p className="text-slate-500 mt-1">Dental Hygiene & Treatment Tracking</p>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition text-sm"
                placeholder="you@practice.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition text-sm"
                placeholder="Enter password" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center mb-3 uppercase tracking-wider font-medium">Demo Accounts</p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map(a => (
                <button key={a.email} onClick={e => handleLogin(e, a.email)}
                  className="text-left px-3 py-2.5 rounded-lg border border-slate-150 hover:border-sky-300 hover:bg-sky-50 transition-colors group">
                  <div className="text-sm font-medium text-slate-700 group-hover:text-sky-700">{a.label}</div>
                  <div className="text-xs text-slate-400">{a.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">Bright Smile Dental Practice Demo</p>
      </div>
    </div>
  )
}
