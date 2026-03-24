import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function NoteDetail() {
  const { noteId } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [changeSummary, setChangeSummary] = useState('')

  const load = () => {
    api.get(`/notes/${noteId}`).then(setData).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [noteId])

  const handleEdit = async () => {
    await api.post(`/notes/${noteId}/edit`, { content: editContent, change_summary: changeSummary || 'Edit' })
    setEditing(false)
    load()
  }

  if (loading) return <div className="animate-pulse h-48 bg-slate-200 rounded-xl" />
  if (!data) return <div className="text-slate-500">Note not found</div>

  const { note, versions } = data
  const canEdit = ['hygienist', 'dentist'].includes(user?.role)

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/patients/${note.patient_id}/notes`} className="text-sm text-sky-600 hover:text-sky-700">&larr; Back to Notes</Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-2xl font-bold text-slate-800">Clinical Note</h1>
          {canEdit && !editing && (
            <button onClick={() => { setEditContent(note.content); setEditing(true) }}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
              Edit Note
            </button>
          )}
        </div>
      </div>

      {/* Note info */}
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-xs font-medium capitalize">
          {note.note_type?.replace('_', ' ')}
        </span>
        <span>By {note.author_name}</span>
        <span>{new Date(note.created_at).toLocaleString()}</span>
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">
          {versions.length} version{versions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Current content or edit mode */}
      {editing ? (
        <div className="bg-white rounded-xl border border-sky-200 p-5 space-y-4">
          <h3 className="font-medium text-slate-700">Edit Note</h3>
          <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
            rows={8} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-sky-400 outline-none resize-none" />
          <input value={changeSummary} onChange={e => setChangeSummary(e.target.value)}
            placeholder="Change summary (optional)" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-sky-400 outline-none" />
          <p className="text-xs text-slate-400">
            Note: Original version is preserved. A new version will be created.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setEditing(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600">Cancel</button>
            <button onClick={handleEdit} className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium">
              Save New Version
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
        </div>
      )}

      {/* Version history */}
      <div>
        <h3 className="font-semibold text-slate-700 mb-3">Version History</h3>
        <div className="space-y-3">
          {versions.map((v, i) => (
            <div key={v.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    i === versions.length - 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    v{v.version_number}
                  </span>
                  <span className="text-sm text-slate-500">{v.editor_name}</span>
                  <span className="text-xs text-slate-400">{new Date(v.created_at).toLocaleString()}</span>
                </div>
                <span className="text-xs text-slate-400">{v.change_summary}</span>
              </div>

              <p className="text-sm text-slate-600 whitespace-pre-wrap">{v.content}</p>

              {/* Show diff indicator */}
              {i > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-50">
                  <DiffIndicator prev={versions[i - 1].content} current={v.content} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DiffIndicator({ prev, current }) {
  if (prev === current) return <span className="text-xs text-slate-400">No changes</span>

  const prevLines = prev.split('\n')
  const currLines = current.split('\n')
  const added = currLines.filter(l => !prevLines.includes(l)).length
  const removed = prevLines.filter(l => !currLines.includes(l)).length

  return (
    <div className="flex items-center gap-3 text-xs">
      {added > 0 && <span className="text-emerald-600">+{added} line{added !== 1 ? 's' : ''} added</span>}
      {removed > 0 && <span className="text-red-500">-{removed} line{removed !== 1 ? 's' : ''} removed</span>}
    </div>
  )
}
