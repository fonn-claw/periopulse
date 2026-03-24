import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function PatientDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [patient, setPatient] = useState(null)
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/patients/${id}`),
      api.get(`/patients/${id}/visits`),
    ]).then(([p, v]) => { setPatient(p); setVisits(v) })
      .catch(console.error).finally(() => setLoading(false))
  }, [id])

  const createVisit = async () => {
    setCreating(true)
    try {
      const visit = await api.post(`/patients/${id}/visits`, {
        visit_date: new Date().toISOString().split('T')[0],
        visit_type: 'perio_maintenance',
      })
      setVisits([visit, ...visits])
    } catch (err) { console.error(err) }
    setCreating(false)
  }

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 bg-slate-200 rounded w-64" /><div className="h-48 bg-slate-200 rounded-xl" /></div>
  if (!patient) return <div className="text-slate-500">Patient not found</div>

  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth)) / 31557600000)
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/patients" className="text-sm text-sky-600 hover:text-sky-700 mb-1 inline-block">&larr; Patients</Link>
          <h1 className="text-2xl font-bold text-slate-800">{patient.first_name} {patient.last_name}</h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
            {age && <span>Age {age}</span>}
            {patient.date_of_birth && <span>DOB: {new Date(patient.date_of_birth).toLocaleDateString()}</span>}
            {patient.phone && <span>{patient.phone}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/patients/${id}/notes`}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Notes
          </Link>
          <Link to={`/patients/${id}/treatments`}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Treatment Plans
          </Link>
          {['hygienist', 'dentist'].includes(user?.role) && (
            <button onClick={createVisit} disabled={creating}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              + New Visit
            </button>
          )}
        </div>
      </div>

      {/* Visits */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700">Visit History</h3>
        </div>
        {visits.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No visits yet</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {visits.map(v => (
              <div key={v.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
                <div>
                  <div className="font-medium text-slate-700">
                    {new Date(v.visit_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-sm text-slate-400 capitalize">
                    {v.visit_type?.replace('_', ' ')} • {v.provider_name || 'Unknown'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to={`/patients/${id}/chart/${v.id}`}
                    className="px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg text-sm font-medium hover:bg-sky-100 transition-colors">
                    Perio Chart
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
