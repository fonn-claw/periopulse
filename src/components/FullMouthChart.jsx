const UPPER = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
const LOWER = [32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17]
const BUCCAL = ['DB','B','MB']
const LINGUAL = ['DL','L','ML']

function depthBg(d) {
  if (d >= 6) return 'bg-red-500 text-white'
  if (d >= 5) return 'bg-orange-400 text-white'
  if (d >= 4) return 'bg-amber-300 text-amber-900'
  if (d > 0) return 'bg-emerald-50 text-emerald-700'
  return 'text-slate-300'
}

export default function FullMouthChart({ readings, toothData }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
      <h3 className="font-semibold text-slate-700 mb-4">Full Mouth Periodontal Chart — All 192 Probing Points</h3>

      {/* Upper arch */}
      <div className="mb-6">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Maxillary (Upper)</h4>
        <ChartGrid teeth={UPPER} readings={readings} toothData={toothData} isUpper={true} />
      </div>

      {/* Lower arch */}
      <div>
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Mandibular (Lower)</h4>
        <ChartGrid teeth={LOWER} readings={readings} toothData={toothData} isUpper={false} />
      </div>
    </div>
  )
}

function ChartGrid({ teeth, readings, toothData, isUpper }) {
  const rows = isUpper ? [
    { label: 'Buccal', sites: BUCCAL },
    { label: 'Lingual', sites: LINGUAL },
  ] : [
    { label: 'Lingual', sites: LINGUAL },
    { label: 'Buccal', sites: BUCCAL },
  ]

  return (
    <div className="min-w-[700px]">
      {/* Tooth numbers */}
      <div className="flex">
        <div className="w-16 shrink-0" />
        {teeth.map(t => (
          <div key={t} className="flex-1 text-center">
            <span className={`text-xs font-bold ${toothData?.[t]?.missing ? 'text-slate-300 line-through' : 'text-slate-600'}`}>
              {t}
            </span>
          </div>
        ))}
      </div>

      {rows.map(row => (
        <div key={row.label}>
          <div className="flex items-center my-0.5">
            <div className="w-16 shrink-0 text-[10px] text-slate-400 font-medium pr-2 text-right">{row.label}</div>
            {teeth.map(t => (
              <div key={t} className="flex-1 flex justify-center gap-px">
                {row.sites.map(s => {
                  const d = readings?.[t]?.[s]?.pocket_depth || 0
                  const bop = readings?.[t]?.[s]?.bleeding_on_probing
                  return (
                    <div key={s}
                      className={`w-5 h-5 flex items-center justify-center text-[9px] font-mono font-bold rounded-sm ${depthBg(d)} ${bop ? 'ring-1 ring-red-400' : ''}`}
                      title={`#${t} ${s}: ${d}mm${bop ? ' (BOP)' : ''}`}>
                      {d > 0 ? d : '·'}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Recession row */}
      <div className="flex items-center my-0.5">
        <div className="w-16 shrink-0 text-[10px] text-slate-400 font-medium pr-2 text-right">Recession</div>
        {teeth.map(t => {
          const maxR = Math.max(...Object.values(readings?.[t] || {}).map(s => s.recession || 0))
          return (
            <div key={t} className="flex-1 text-center">
              <span className={`text-[10px] font-mono ${maxR > 0 ? 'text-violet-600 font-bold' : 'text-slate-300'}`}>
                {maxR > 0 ? maxR : '·'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Mobility row */}
      <div className="flex items-center my-0.5">
        <div className="w-16 shrink-0 text-[10px] text-slate-400 font-medium pr-2 text-right">Mobility</div>
        {teeth.map(t => (
          <div key={t} className="flex-1 text-center">
            <span className={`text-[10px] font-mono ${(toothData?.[t]?.mobility || 0) > 0 ? 'text-orange-600 font-bold' : 'text-slate-300'}`}>
              {(toothData?.[t]?.mobility || 0) > 0 ? toothData[t].mobility : '·'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
