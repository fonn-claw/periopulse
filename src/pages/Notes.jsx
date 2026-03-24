import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const NOTE_TYPES = ['perio_maintenance', 'prophy', 'srp', 'comprehensive_exam', 'general']

export default function Notes() {
  const { patientId } = useParams()
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [visits, setVisits] = useState([])

  useEffect(() => {
    Promise.all([
      api.get(`/patients/${patientId}/notes`),
      api.get(`/patients/${patientId}/visits`),
    ]).then(([n, v]) => { setNotes(n); setVisits(v) })
      .catch(console.error).finally(() => setLoading(false))
  }, [patientId])

  const handleAdd = async (data) => {
    const note = await api.post(`/patients/${patientId}/notes`, data)
    setNotes([{ ...note, author_name: user.name }, ...notes])
    setShowAdd(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/patients/${patientId}`} className="text-sm text-sky-600 hover:text-sky-700">&larr; Back to Patient</Link>
          <h1 className="text-2xl font-bold text-slate-800">Clinical Notes</h1>
        </div>
        {['hygienist', 'dentist'].includes(user?.role) && (
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium">
            + New Note
          </button>
        )}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="animate-pulse space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl" />)}</div>
        ) : notes.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">No notes yet</div>
        ) : notes.map(n => (
          <Link key={n.id} to={`/notes/${n.id}`}
            className="block bg-white rounded-xl border border-slate-200 p-5 hover:border-sky-200 hover:shadow-sm transition-all">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-xs font-medium capitalize">
                    {n.note_type?.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(n.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">{n.content}</p>
              </div>
              <div className="text-xs text-slate-400 whitespace-nowrap ml-4">{n.author_name}</div>
            </div>
            {n.updated_at !== n.created_at && (
              <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                Edited — click to view version history
              </div>
            )}
          </Link>
        ))}
      </div>

      {showAdd && (
        <AddNoteModal
          visits={visits}
          onClose={() => setShowAdd(false)}
          onSave={handleAdd}
        />
      )}
    </div>
  )
}

function AddNoteModal({ visits, onClose, onSave }) {
  const [form, setForm] = useState({ content: '', note_type: 'perio_maintenance', visit_id: visits[0]?.id || null })

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">New Clinical Note</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Note Type</label>
            <select value={form.note_type} onChange={e => setForm({ ...form, note_type: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-sky-400 outline-none">
              {NOTE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          {visits.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Visit</label>
              <select value={form.visit_id || ''} onChange={e => setForm({ ...form, visit_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-sky-400 outline-none">
                <option value="">No visit linked</option>
                {visits.map(v => <option key={v.id} value={v.id}>{new Date(v.visit_date).toLocaleDateString()} — {v.visit_type?.replace('_', ' ')}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Content</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
              rows={6} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-sky-400 outline-none resize-none"
              placeholder="Enter clinical notes..." />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.content.trim()}
            className="flex-1 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">Save Note</button>
        </div>
      </div>
    </div>
  )
}
