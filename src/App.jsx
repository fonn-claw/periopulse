import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import PatientDetail from './pages/PatientDetail'
import ToothChart from './pages/ToothChart'
import Notes from './pages/Notes'
import NoteDetail from './pages/NoteDetail'
import Treatments from './pages/Treatments'
import Portal from './pages/Portal'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" /></div>
  if (!user) return <Navigate to="/login" />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" /></div>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={
          user?.role === 'patient' ? <Navigate to="/portal" /> : <Dashboard />
        } />
        <Route path="patients" element={<ProtectedRoute roles={['hygienist','dentist','admin']}><Patients /></ProtectedRoute>} />
        <Route path="patients/:id" element={<ProtectedRoute roles={['hygienist','dentist','admin']}><PatientDetail /></ProtectedRoute>} />
        <Route path="patients/:patientId/chart/:visitId" element={<ProtectedRoute roles={['hygienist','dentist']}><ToothChart /></ProtectedRoute>} />
        <Route path="patients/:patientId/notes" element={<ProtectedRoute roles={['hygienist','dentist','admin']}><Notes /></ProtectedRoute>} />
        <Route path="notes/:noteId" element={<ProtectedRoute roles={['hygienist','dentist','admin']}><NoteDetail /></ProtectedRoute>} />
        <Route path="patients/:patientId/treatments" element={<ProtectedRoute roles={['hygienist','dentist','admin']}><Treatments /></ProtectedRoute>} />
        <Route path="portal" element={<ProtectedRoute roles={['patient']}><Portal /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}
