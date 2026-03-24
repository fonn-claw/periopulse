import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const STATUS_COLORS = {
  proposed: 'bg-amber-50 text-amber-700 border-amber-200',
  accepted: 'bg-sky-50 text-sky-700 border-sky-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  declined: 'bg-red-50 text-red-700 border-red-200',
}

const CDT_CODES = [
  { code: 'D0120', name: 'Periodic Oral Evaluation', fee: 65 },
  { code: 'D0150', name: 'Comprehensive Oral Evaluation', fee: 95 },
  { code: 'D1110', name: 'Adult Prophylaxis', fee: 125 },
  { code: 'D1208', name: 'Fluoride Treatment', fee: 35 },
  { code: 'D2750', name: 'PFM Crown', fee: 1200 },
  { code: 'D2950', name: 'Core Buildup', fee: 350 },
  { code: 'D4341', name: 'SRP - Per Quadrant', fee: 250 },
  { code: 'D4910', name: 'Periodontal Maintenance', fee: 175 },
  { code: 'D6010', name: 'Implant Body', fee: 3500 },
  { code: 'D6065', name: 'Implant Crown', fee: 1800 },
  { code: 'D9972', name: 'In-office Whitening', fee: 500 },
]

export default function Treatments() {
  const { patientId } = useParams()
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    api.get(`/patients/${patientId}/treatments`).then(setPlans).catch(console.error).finally(() => setLoading(false))
  }, [patientId])

  const updateStatus = async (planId, status) => {
    await api.patch(`/treatments/${planId}/status`, { status })
    setPlans(plans.map(p => p.id === planId ? { ...p, status } : p))
  }

  const handleAdd = async (data) => {
    const plan = await api.post(`/patients/${patientId}/treatments`, data)
    setPlans([{ ...plan, items: data.items, provider_name: user.name }, ...plans])
    setShowAdd(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/patients/${patientId}`} className="text-sm text-sky-600 hover:text-sky-700">&larr; Back to Patient</Link>
          <h1 className="text-2xl font-bold text-slate-800">Treatment Plans</h1>
        </div>
        {['dentist', 'hygienist'].includes(user?.role) && (
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium">
            + New Plan
          </button>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">{[1,2].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl" />)}</div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">No treatment plans</div>
      ) : plans.map(plan => (
        <div key={plan.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">{plan.title}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                <span>{plan.provider_name}</span>
                <span>{new Date(plan.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[plan.status]}`}>
                {plan.status?.replace('_', ' ')}
              </span>
              {user?.role === 'patient' && plan.status === 'proposed' && (
                <>
                  <button onClick={() => updateStatus(plan.id, 'accepted')}
                    className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-medium">Accept</button>
                  <button onClick={() => updateStatus(plan.id, 'declined')}
                    className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-medium">Decline</button>
                </>
              )}
              {['dentist', 'hygienist'].includes(user?.role) && (
                <select value={plan.status}
                  onChange={e => updateStatus(plan.id, e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600">
                  <option value="proposed">Proposed</option>
                  <option value="accepted">Accepted</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="declined">Declined</option>
                </select>
              )}
            </div>
          </div>

          {/* Items */}
          {plan.items?.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs">
                  <th className="text-left px-6 py-2 font-medium">Procedure</th>
                  <th className="text-left px-4 py-2 font-medium">CDT Code</th>
                  <th className="text-center px-4 py-2 font-medium">Tooth</th>
                  <th className="text-right px-6 py-2 font-medium">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {plan.items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-6 py-2.5 text-slate-700">{item.procedure_name}</td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{item.cdt_code}</td>
                    <td className="px-4 py-2.5 text-center text-slate-500">{item.tooth_number || '—'}</td>
                    <td className="px-6 py-2.5 text-right text-slate-700 font-medium">${Number(item.fee).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan="3" className="px-6 py-3 text-right text-sm font-medium text-slate-500">Total</td>
                  <td className="px-6 py-3 text-right font-bold text-slate-800">
                    ${plan.items.reduce((s, i) => s + Number(i.fee || 0), 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      ))}

      {showAdd && <AddTreatmentModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}
    </div>
  )
}

function AddTreatmentModal({ onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [items, setItems] = useState([{ procedure_name: '', cdt_code: '', tooth_number: '', fee: 0 }])

  const addItem = () => setItems([...items, { procedure_name: '', cdt_code: '', tooth_number: '', fee: 0 }])
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i, field, val) => {
    const newItems = [...items]
    newItems[i] = { ...newItems[i], [field]: val }
    // Auto-fill from CDT code
    if (field === 'cdt_code') {
      const cdt = CDT_CODES.find(c => c.code === val)
      if (cdt) {
        newItems[i].procedure_name = cdt.name
        newItems[i].fee = cdt.fee
      }
    }
    setItems(newItems)
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">New Treatment Plan</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-600 mb-1">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-sky-400 outline-none"
            placeholder="e.g., SRP - Full Mouth" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-600">Procedures</label>
            <button onClick={addItem} className="text-xs text-sky-600 hover:text-sky-700">+ Add Procedure</button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <select value={item.cdt_code} onChange={e => updateItem(i, 'cdt_code', e.target.value)}
                className="w-32 px-2 py-2 border border-slate-200 rounded-lg text-xs focus:border-sky-400 outline-none">
                <option value="">CDT Code</option>
                {CDT_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
              <input value={item.procedure_name} onChange={e => updateItem(i, 'procedure_name', e.target.value)}
                className="flex-1 px-2 py-2 border border-slate-200 rounded-lg text-sm focus:border-sky-400 outline-none"
                placeholder="Procedure name" />
              <input type="number" value={item.tooth_number} onChange={e => updateItem(i, 'tooth_number', e.target.value ? parseInt(e.target.value) : '')}
                className="w-16 px-2 py-2 border border-slate-200 rounded-lg text-sm focus:border-sky-400 outline-none text-center"
                placeholder="#" min="1" max="32" />
              <input type="number" value={item.fee} onChange={e => updateItem(i, 'fee', parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-2 border border-slate-200 rounded-lg text-sm focus:border-sky-400 outline-none text-right"
                placeholder="Fee" />
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 px-1 py-2">×</button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onSave({ title, items })} disabled={!title.trim() || items.every(i => !i.procedure_name)}
            className="flex-1 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">Create Plan</button>
        </div>
      </div>
    </div>
  )
}
