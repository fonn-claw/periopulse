import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function Patients() {
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = (q = '') => {
    setLoading(true)
    api.get(`/patients${q ? `?search=${encodeURIComponent(q)}` : ''}`)
      .then(setPatients).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSearch = (e) => {
    setSearch(e.target.value)
    clearTimeout(window._searchTimeout)
    window._searchTimeout = setTimeout(() => load(e.target.value), 300)
  }

  const handleAdd = async (data) => {
    await api.post('/patients', data)
    setShowAdd(false)
    load(search)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Patients</h1>
          <p className="text-slate-500 text-sm mt-1">{patients.length} patients</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors">
          + New Patient
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" placeholder="Search patients by name..." value={search} onChange={handleSearch}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition" />
      </div>

      {/* Patient list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : patients.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No patients found</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {patients.map(p => (
              <Link key={p.id} to={`/patients/${p.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-semibold text-sm">
                    {p.first_name[0]}{p.last_name[0]}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">{p.first_name} {p.last_name}</div>
                    <div className="text-sm text-slate-400">
                      {p.date_of_birth && `DOB: ${new Date(p.date_of_birth).toLocaleDateString()}`}
                      {p.phone && ` • ${p.phone}`}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-slate-400">
                  {p.last_visit ? `Last visit: ${new Date(p.last_visit).toLocaleDateString()}` : 'No visits'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Add patient modal */}
      {showAdd && <AddPatientModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}
    </div>
  )
}

function AddPatientModal({ onClose, onSave }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', date_of_birth: '', phone: '', email: '' })
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">New Patient</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={form.first_name} onChange={v => set('first_name', v)} required />
            <Input label="Last Name" value={form.last_name} onChange={v => set('last_name', v)} required />
          </div>
          <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={v => set('date_of_birth', v)} />
          <Input label="Phone" value={form.phone} onChange={v => set('phone', v)} />
          <Input label="Email" type="email" value={form.email} onChange={v => set('email', v)} />
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.first_name || !form.last_name}
            className="flex-1 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">Save</button>
        </div>
      </div>
    </div>
  )
}

function Input({ label, type = 'text', value, onChange, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition" />
    </div>
  )
}
