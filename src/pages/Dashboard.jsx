import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard').then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSkeleton />
  if (!data) return <div className="text-slate-500">Failed to load dashboard</div>

  const treatmentTotal = Object.values(data.treatment_stats).reduce((a, b) => a + b, 0)
  const acceptRate = treatmentTotal > 0
    ? Math.round(((data.treatment_stats.accepted || 0) + (data.treatment_stats.completed || 0) + (data.treatment_stats.in_progress || 0)) / treatmentTotal * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Bright Smile Dental — Practice Overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Patients" value={data.total_patients} color="sky" />
        <StatCard label="Today's Visits" value={data.today_visits} color="emerald" />
        <StatCard label="Active Treatments" value={data.treatment_stats.proposed || 0} color="amber" />
        <StatCard label="Acceptance Rate" value={`${acceptRate}%`} color="violet" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Perio trends */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Average Pocket Depth Trend</h3>
          {data.perio_trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.perio_trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="visit_date" tick={{ fontSize: 11 }} tickFormatter={d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                <YAxis domain={[0, 8]} tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={d => new Date(d).toLocaleDateString()} formatter={v => [Number(v).toFixed(1) + 'mm', 'Avg Depth']} />
                <Line type="monotone" dataKey="avg_depth" stroke="#0EA5E9" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm">No charting data yet</p>}
        </div>

        {/* Provider productivity */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Provider Activity (30 days)</h3>
          {data.productivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.productivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="visit_count" fill="#0EA5E9" radius={[4, 4, 0, 0]} name="Visits" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm">No visit data yet</p>}
        </div>
      </div>

      {/* Treatment plan breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-700 mb-4">Treatment Plans</h3>
        <div className="flex gap-3 flex-wrap">
          {['proposed', 'accepted', 'in_progress', 'completed', 'declined'].map(s => (
            <div key={s} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 text-sm">
              <div className={`w-2 h-2 rounded-full ${statusColor(s)}`} />
              <span className="capitalize text-slate-600">{s.replace('_', ' ')}</span>
              <span className="font-semibold text-slate-800">{data.treatment_stats[s] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent visits */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700">Recent Visits</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {data.recent_visits.map(v => (
            <Link key={v.id} to={`/patients/${v.patient_id}`}
              className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
              <div>
                <span className="font-medium text-slate-700">{v.first_name} {v.last_name}</span>
                <span className="text-slate-400 text-sm ml-3 capitalize">{v.visit_type?.replace('_', ' ')}</span>
              </div>
              <div className="text-sm text-slate-400">
                {new Date(v.visit_date).toLocaleDateString()}
                {v.provider_name && <span className="ml-2">• {v.provider_name}</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  const colors = {
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
  }
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="text-sm font-medium opacity-80">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  )
}

function statusColor(s) {
  return { proposed: 'bg-amber-400', accepted: 'bg-sky-400', in_progress: 'bg-blue-500', completed: 'bg-emerald-400', declined: 'bg-red-400' }[s] || 'bg-slate-300'
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="h-72 bg-slate-200 rounded-xl" />
        <div className="h-72 bg-slate-200 rounded-xl" />
      </div>
    </div>
  )
}
