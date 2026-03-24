import { useMemo } from 'react'

// Universal numbering: 1-16 upper right to left, 17-32 lower left to right
const UPPER_TEETH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
const LOWER_TEETH = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17]

const SEVERITY_COLORS = {
  healthy: '#10B981',
  watch: '#F59E0B',
  moderate: '#F97316',
  severe: '#EF4444',
}

const TOOTH_NAMES = {
  1: '3rd Molar', 2: '2nd Molar', 3: '1st Molar', 4: '2nd Premolar', 5: '1st Premolar',
  6: 'Canine', 7: 'Lateral Incisor', 8: 'Central Incisor', 9: 'Central Incisor', 10: 'Lateral Incisor',
  11: 'Canine', 12: '1st Premolar', 13: '2nd Premolar', 14: '1st Molar', 15: '2nd Molar', 16: '3rd Molar',
  17: '3rd Molar', 18: '2nd Molar', 19: '1st Molar', 20: '2nd Premolar', 21: '1st Premolar',
  22: 'Canine', 23: 'Lateral Incisor', 24: 'Central Incisor', 25: 'Central Incisor', 26: 'Lateral Incisor',
  27: 'Canine', 28: '1st Premolar', 29: '2nd Premolar', 30: '1st Molar', 31: '2nd Molar', 32: '3rd Molar',
}

function toothPath(num, x, y, isUpper) {
  // Molars are wider, incisors narrower
  const isMolar = [1,2,3,14,15,16,17,18,19,30,31,32].includes(num)
  const isPremolar = [4,5,12,13,20,21,28,29].includes(num)
  const w = isMolar ? 22 : isPremolar ? 18 : 15
  const h = isMolar ? 28 : isPremolar ? 26 : 24

  if (isUpper) {
    // Root goes up, crown at bottom
    return `M${x-w/2},${y} Q${x-w/2-2},${y-h*0.6} ${x},${y-h} Q${x+w/2+2},${y-h*0.6} ${x+w/2},${y} Q${x+w/4},${y+4} ${x},${y+5} Q${x-w/4},${y+4} ${x-w/2},${y}`
  } else {
    // Root goes down, crown at top
    return `M${x-w/2},${y} Q${x-w/2-2},${y+h*0.6} ${x},${y+h} Q${x+w/2+2},${y+h*0.6} ${x+w/2},${y} Q${x+w/4},${y-4} ${x},${y-5} Q${x-w/4},${y-4} ${x-w/2},${y}`
  }
}

export default function ToothSVG({ selectedTooth, onSelectTooth, getToothSeverity, toothData, readings }) {
  const bopCounts = useMemo(() => {
    const counts = {}
    for (let t = 1; t <= 32; t++) {
      const sites = readings?.[t] || {}
      counts[t] = Object.values(sites).filter(s => s.bleeding_on_probing).length
    }
    return counts
  }, [readings])

  return (
    <svg viewBox="0 0 580 360" className="w-full" style={{ maxHeight: '55vh' }}>
      {/* Background */}
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#F1F5F9" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Arch labels */}
      <text x="290" y="22" textAnchor="middle" className="fill-slate-300 text-[10px] font-medium uppercase tracking-widest">Maxillary (Upper)</text>
      <text x="290" y="348" textAnchor="middle" className="fill-slate-300 text-[10px] font-medium uppercase tracking-widest">Mandibular (Lower)</text>

      {/* Midline */}
      <line x1="290" y1="30" x2="290" y2="330" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />

      {/* Right/Left labels */}
      <text x="15" y="180" textAnchor="middle" className="fill-slate-300 text-[9px]" transform="rotate(-90,15,180)">RIGHT</text>
      <text x="570" y="180" textAnchor="middle" className="fill-slate-300 text-[9px]" transform="rotate(90,570,180)">LEFT</text>

      {/* Upper teeth */}
      {UPPER_TEETH.map((num, i) => {
        const x = 40 + i * 33
        const y = 100
        const severity = getToothSeverity(num)
        const color = SEVERITY_COLORS[severity]
        const isSelected = selectedTooth === num
        const isMissing = toothData?.[num]?.missing

        return (
          <g key={num} onClick={() => onSelectTooth(num)} className="cursor-pointer" role="button" tabIndex={0}>
            {/* Selection ring */}
            {isSelected && <circle cx={x} cy={y} r="22" fill="none" stroke="#0EA5E9" strokeWidth="2" filter="url(#glow)" />}

            {/* Tooth */}
            <path d={toothPath(num, x, y, true)}
              fill={isMissing ? '#F1F5F9' : `${color}20`}
              stroke={isMissing ? '#CBD5E1' : color}
              strokeWidth={isSelected ? 2.5 : 1.5}
              strokeDasharray={isMissing ? '3 2' : 'none'}
              className="transition-all duration-150 hover:opacity-80"
            />

            {/* BOP indicator dots */}
            {bopCounts[num] > 0 && !isMissing && (
              <circle cx={x + 10} cy={y - 18} r="4" fill="#EF4444" opacity="0.8" />
            )}

            {/* Tooth number */}
            <text x={x} y={y + 22} textAnchor="middle" className="fill-slate-500 text-[10px] font-medium select-none">{num}</text>

            {/* Max depth label */}
            {!isMissing && readings?.[num] && (() => {
              const maxD = Math.max(...Object.values(readings[num]).map(s => s.pocket_depth))
              return maxD > 0 ? (
                <text x={x} y={y - 24} textAnchor="middle" className="text-[9px] font-bold select-none" fill={color}>{maxD}</text>
              ) : null
            })()}
          </g>
        )
      })}

      {/* Lower teeth */}
      {LOWER_TEETH.map((num, i) => {
        const x = 40 + i * 33
        const y = 250
        const severity = getToothSeverity(num)
        const color = SEVERITY_COLORS[severity]
        const isSelected = selectedTooth === num
        const isMissing = toothData?.[num]?.missing

        return (
          <g key={num} onClick={() => onSelectTooth(num)} className="cursor-pointer" role="button" tabIndex={0}>
            {isSelected && <circle cx={x} cy={y} r="22" fill="none" stroke="#0EA5E9" strokeWidth="2" filter="url(#glow)" />}

            <path d={toothPath(num, x, y, false)}
              fill={isMissing ? '#F1F5F9' : `${color}20`}
              stroke={isMissing ? '#CBD5E1' : color}
              strokeWidth={isSelected ? 2.5 : 1.5}
              strokeDasharray={isMissing ? '3 2' : 'none'}
              className="transition-all duration-150 hover:opacity-80"
            />

            {bopCounts[num] > 0 && !isMissing && (
              <circle cx={x + 10} cy={y + 24} r="4" fill="#EF4444" opacity="0.8" />
            )}

            <text x={x} y={y - 15} textAnchor="middle" className="fill-slate-500 text-[10px] font-medium select-none">{num}</text>

            {!isMissing && readings?.[num] && (() => {
              const maxD = Math.max(...Object.values(readings[num]).map(s => s.pocket_depth))
              return maxD > 0 ? (
                <text x={x} y={y + 38} textAnchor="middle" className="text-[9px] font-bold select-none" fill={color}>{maxD}</text>
              ) : null
            })()}
          </g>
        )
      })}
    </svg>
  )
}

export { TOOTH_NAMES, SEVERITY_COLORS }
