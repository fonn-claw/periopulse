import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

const STATUS_COLORS = {
  proposed: 'bg-amber-50 text-amber-700',
  accepted: 'bg-sky-50 text-sky-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-700',
}

export default function Portal() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    api.get('/portal/summary').then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 bg-slate-200 rounded w-48" /><div className="h-64 bg-slate-200 rounded-xl" /></div>
  if (!data) return <div className="text-slate-500">Unable to load portal data</div>

  const { patient, visits, perio_trends, treatments, notes } = data

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="bg-gradient-to-r from-sky-500 to-sky-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome, {patient.first_name}</h1>
        <p className="text-sky-100 mt-1">Your dental health dashboard — Bright Smile Dental</p>
        <div className="flex gap-6 mt-4">
          <div>
            <div className="text-sky-200 text-xs">Total Visits</div>
            <div className="text-2xl font-bold">{visits.length}</div>
          </div>
          <div>
            <div className="text-sky-200 text-xs">Treatment Plans</div>
            <div className="text-2xl font-bold">{treatments.length}</div>
          </div>
          <div>
            <div className="text-sky-200 text-xs">Last Visit</div>
            <div className="text-lg font-semibold">
              {visits[0] ? new Date(visits[0].visit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'None'}
            </div>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {[['overview', 'Overview'], ['trends', 'Perio Trends'], ['treatments', 'Treatments'], ['history', 'Visit History']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>{label}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Perio trend summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-700 mb-4">Periodontal Health Trend</h3>
            {perio_trends.length > 1 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={perio_trends}>
                    <defs>
                      <linearGradient id="colorDepth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="visit_date" tick={{ fontSize: 11 }} tickFormatter={d => new Date(d).toLocaleDateString('en-US', { month: 'short' })} />
                    <YAxis domain={[0, 8]} tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={d => new Date(d).toLocaleDateString()} formatter={v => [Number(v).toFixed(1) + 'mm', 'Avg Pocket Depth']} />
                    <Area type="monotone" dataKey="avg_depth" stroke="#0EA5E9" fillOpacity={1} fill="url(#colorDepth)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
                <TrendSummary trends={perio_trends} />
              </>
            ) : <p className="text-slate-400 text-sm">Need more visits to show trends</p>}
          </div>

          {/* Recent notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-700 mb-4">Recent Clinical Notes</h3>
            <div className="space-y-3">
              {notes.slice(0, 5).map(n => (
                <div key={n.id} className="border-l-2 border-sky-200 pl-4 py-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{new Date(n.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{n.author_name}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{n.content}</p>
                </div>
              ))}
              {notes.length === 0 && <p className="text-sm text-slate-400">No notes yet</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'trends' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-700 mb-4">Average Pocket Depth Over Time</h3>
            {perio_trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={perio_trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="visit_date" tick={{ fontSize: 11 }} tickFormatter={d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis domain={[0, 8]} tick={{ fontSize: 11 }} label={{ value: 'mm', position: 'insideLeft' }} />
                  <Tooltip labelFormatter={d => new Date(d).toLocaleDateString()} />
                  <Line type="monotone" dataKey="avg_depth" name="Avg Depth" stroke="#0EA5E9" strokeWidth={2} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-slate-400">No charting data available</p>}
          </div>

          {perio_trends.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-700 mb-4">Bleeding on Probing (%)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={perio_trends}>
                  <defs>
                    <linearGradient id="bopGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="visit_date" tick={{ fontSize: 11 }} tickFormatter={d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip labelFormatter={d => new Date(d).toLocaleDateString()} formatter={v => [Number(v).toFixed(1) + '%', 'BOP Rate']} />
                  <Area type="monotone" dataKey="bop_percent" stroke="#EF4444" fillOpacity={1} fill="url(#bopGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {tab === 'treatments' && (
        <div className="space-y-4">
          {treatments.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">No treatment plans</div>
          ) : treatments.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">{t.title}</h3>
                  <p className="text-sm text-slate-400 mt-0.5">{t.provider_name} • {new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[t.status]}`}>
                  {t.status?.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {visits.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No visits yet</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {visits.map(v => (
                <div key={v.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-700">
                        {new Date(v.visit_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="text-sm text-slate-400 capitalize mt-0.5">
                        {v.visit_type?.replace('_', ' ')} • {v.provider_name}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TrendSummary({ trends }) {
  if (trends.length < 2) return null
  const first = Number(trends[0].avg_depth)
  const last = Number(trends[trends.length - 1].avg_depth)
  const diff = last - first
  const improving = diff < -0.2
  const worsening = diff > 0.2

  return (
    <div className={`mt-3 p-3 rounded-lg text-sm ${
      improving ? 'bg-emerald-50 text-emerald-700' : worsening ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'
    }`}>
      {improving ? `Your pocket depths have improved by ${Math.abs(diff).toFixed(1)}mm — great progress!` :
       worsening ? `Pocket depths have increased by ${diff.toFixed(1)}mm — discuss with your provider.` :
       'Your periodontal measurements have been stable.'}
    </div>
  )
}
