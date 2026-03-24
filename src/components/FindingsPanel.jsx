import { TOOTH_NAMES } from './ToothSVG'

const SITES = ['MB', 'B', 'DB', 'ML', 'L', 'DL']
const SITE_LABELS = { MB: 'Mesio-Buccal', B: 'Buccal', DB: 'Disto-Buccal', ML: 'Mesio-Lingual', L: 'Lingual', DL: 'Disto-Lingual' }

export default function FindingsPanel({ tooth, readings, toothData, onUpdateReading, onUpdateToothData }) {
  const cyclePD = (site) => {
    const current = readings[site]?.pocket_depth || 0
    const next = current >= 10 ? 0 : current + 1
    onUpdateReading(site, 'pocket_depth', next)
  }

  const cycleRecession = (site) => {
    const current = readings[site]?.recession || 0
    const next = current >= 10 ? 0 : current + 1
    onUpdateReading(site, 'recession', next)
  }

  const toggleBOP = (site) => {
    onUpdateReading(site, 'bleeding_on_probing', !readings[site]?.bleeding_on_probing)
  }

  const depthColor = (d) => {
    if (d >= 6) return 'bg-red-500 text-white'
    if (d >= 5) return 'bg-orange-400 text-white'
    if (d >= 4) return 'bg-amber-400 text-white'
    return 'bg-emerald-100 text-emerald-700'
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
        <h3 className="font-semibold text-slate-700">Tooth #{tooth}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{TOOTH_NAMES[tooth] || ''} — {tooth <= 16 ? 'Upper' : 'Lower'} {tooth <= 8 || (tooth >= 25 && tooth <= 32) ? 'Right' : 'Left'}</p>
      </div>

      {/* Quick tooth-level findings */}
      <div className="px-5 py-3 border-b border-slate-100 grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Mobility</label>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map(v => (
              <button key={v} onClick={() => onUpdateToothData('mobility', v)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  toothData.mobility === v ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>{v}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Furcation</label>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map(v => (
              <button key={v} onClick={() => onUpdateToothData('furcation', v)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  toothData.furcation === v ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>{v}</button>
            ))}
          </div>
        </div>
        <button onClick={() => onUpdateToothData('missing', !toothData.missing)}
          className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
            toothData.missing ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
          }`}>
          {toothData.missing ? 'Missing ✓' : 'Missing'}
        </button>
        <button onClick={() => onUpdateToothData('implant', !toothData.implant)}
          className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
            toothData.implant ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
          }`}>
          {toothData.implant ? 'Implant ✓' : 'Implant'}
        </button>
      </div>

      {/* Probing depths by site */}
      <div className="px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Probing Depths</span>
          <span className="text-xs text-slate-400">Tap to cycle</span>
        </div>

        <div className="space-y-2">
          {SITES.map(site => (
            <div key={site} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-8 text-right font-mono">{site}</span>

              {/* Pocket depth - tap to cycle */}
              <button onClick={() => cyclePD(site)}
                className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${depthColor(readings[site]?.pocket_depth || 0)}`}>
                {readings[site]?.pocket_depth || 0}
              </button>

              {/* Recession */}
              <button onClick={() => cycleRecession(site)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                  (readings[site]?.recession || 0) > 0 ? 'bg-violet-100 text-violet-700' : 'bg-slate-50 text-slate-400'
                }`}
                title="Recession">
                R{readings[site]?.recession || 0}
              </button>

              {/* BOP */}
              <button onClick={() => toggleBOP(site)}
                className={`w-10 h-10 rounded-lg text-xs font-medium transition-all ${
                  readings[site]?.bleeding_on_probing ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-slate-400'
                }`}
                title="Bleeding on Probing">
                BOP
              </button>

              {/* CAL (calculated) */}
              <span className="text-xs text-slate-400 w-10 text-center" title="Clinical Attachment Level">
                CAL {(readings[site]?.pocket_depth || 0) + (readings[site]?.recession || 0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
