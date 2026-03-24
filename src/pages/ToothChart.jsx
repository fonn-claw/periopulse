import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import ToothSVG from '../components/ToothSVG'
import FullMouthChart from '../components/FullMouthChart'
import FindingsPanel from '../components/FindingsPanel'

const SITES = ['DB', 'B', 'MB', 'DL', 'L', 'ML']

function initReadings() {
  const r = {}
  for (let t = 1; t <= 32; t++) {
    r[t] = {}
    for (const s of SITES) {
      r[t][s] = { pocket_depth: 0, recession: 0, bleeding_on_probing: false, suppuration: false }
    }
  }
  return r
}

function initToothData() {
  const d = {}
  for (let t = 1; t <= 32; t++) {
    d[t] = { mobility: 0, furcation: 0, missing: false, implant: false }
  }
  return d
}

export default function ToothChart() {
  const { patientId, visitId } = useParams()
  const [readings, setReadings] = useState(initReadings)
  const [toothData, setToothData] = useState(initToothData)
  const [selectedTooth, setSelectedTooth] = useState(null)
  const [view, setView] = useState('chart') // 'chart' | 'fullmouth'
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/visits/${visitId}/charting`),
      api.get(`/visits/${visitId}/tooth-data`),
    ]).then(([chartData, tdData]) => {
      if (chartData.readings?.length > 0) {
        const r = initReadings()
        for (const rd of chartData.readings) {
          if (r[rd.tooth_number] && r[rd.tooth_number][rd.site]) {
            r[rd.tooth_number][rd.site] = {
              pocket_depth: rd.pocket_depth,
              recession: rd.recession,
              bleeding_on_probing: rd.bleeding_on_probing,
              suppuration: rd.suppuration,
            }
          }
        }
        setReadings(r)
      }
      if (tdData?.length > 0) {
        const td = initToothData()
        for (const f of tdData) {
          td[f.tooth_number] = {
            mobility: f.mobility,
            furcation: f.furcation,
            missing: f.missing,
            implant: f.implant,
          }
        }
        setToothData(td)
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [visitId])

  const updateReading = useCallback((tooth, site, field, value) => {
    setReadings(prev => ({
      ...prev,
      [tooth]: {
        ...prev[tooth],
        [site]: { ...prev[tooth][site], [field]: value },
      },
    }))
    setSaved(false)
  }, [])

  const updateToothData = useCallback((tooth, field, value) => {
    setToothData(prev => ({
      ...prev,
      [tooth]: { ...prev[tooth], [field]: value },
    }))
    setSaved(false)
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const readingsFlat = []
      for (let t = 1; t <= 32; t++) {
        for (const s of SITES) {
          readingsFlat.push({ tooth_number: t, site: s, ...readings[t][s] })
        }
      }
      const findingsFlat = []
      for (let t = 1; t <= 32; t++) {
        findingsFlat.push({ tooth_number: t, ...toothData[t] })
      }
      await Promise.all([
        api.post(`/visits/${visitId}/charting`, { readings: readingsFlat }),
        api.post(`/visits/${visitId}/tooth-data`, { findings: findingsFlat }),
      ])
      setSaved(true)
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  const getToothSeverity = (tooth) => {
    const depths = Object.values(readings[tooth] || {}).map(r => r.pocket_depth)
    const max = Math.max(...depths)
    if (max >= 6) return 'severe'
    if (max >= 5) return 'moderate'
    if (max >= 4) return 'watch'
    return 'healthy'
  }

  if (loading) return <div className="animate-pulse h-96 bg-slate-200 rounded-xl" />

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/patients/${patientId}`} className="text-sm text-sky-600 hover:text-sky-700">&larr; Back to Patient</Link>
          <h1 className="text-2xl font-bold text-slate-800">Periodontal Chart</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setView('chart')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'chart' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
              Tooth Chart
            </button>
            <button onClick={() => setView('fullmouth')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'fullmouth' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
              Full Mouth
            </button>
          </div>
          <button onClick={save} disabled={saving}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              saved ? 'bg-emerald-500 text-white' : 'bg-sky-500 hover:bg-sky-600 text-white'
            } disabled:opacity-50`}>
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Chart'}
          </button>
        </div>
      </div>

      {/* Severity legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-slate-400">Severity:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400" /> Healthy (1-3mm)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400" /> Watch (4mm)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400" /> Moderate (5mm)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" /> Severe (6mm+)</span>
      </div>

      {view === 'chart' ? (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Tooth chart */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <ToothSVG
                selectedTooth={selectedTooth}
                onSelectTooth={setSelectedTooth}
                getToothSeverity={getToothSeverity}
                toothData={toothData}
                readings={readings}
              />
            </div>
          </div>

          {/* Findings panel */}
          <div>
            {selectedTooth ? (
              <FindingsPanel
                tooth={selectedTooth}
                readings={readings[selectedTooth]}
                toothData={toothData[selectedTooth]}
                onUpdateReading={(site, field, value) => updateReading(selectedTooth, site, field, value)}
                onUpdateToothData={(field, value) => updateToothData(selectedTooth, field, value)}
              />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                <p className="text-lg mb-2">Select a tooth</p>
                <p className="text-sm">Click any tooth to record findings</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <FullMouthChart readings={readings} toothData={toothData} />
      )}
    </div>
  )
}
