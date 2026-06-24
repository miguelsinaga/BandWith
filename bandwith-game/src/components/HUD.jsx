import { LANES } from '../hooks/useGameEngine'
import './HUD.css'

const LABEL = { perfect: 'PERFECT', good: 'GOOD', ok: 'OK', miss: 'MISS' }
const COLOR = {
  perfect: '#60a5fa',
  good:    '#34d399',
  ok:      '#facc15',
  miss:    '#f87171',
}

export default function HUD({ score, combo, hp, accuracy, hitFeedback }) {
  return (
    <div className="hud">

      <div className="hud-top-left">
        <div className="hud-score">{score.toLocaleString()}</div>
        <div className="hud-accuracy">{accuracy.toFixed(1)}%</div>
      </div>

      <div className="hud-top-right">
        {combo > 1 && (
          <div className="hud-combo">
            <span className="combo-num">{combo}</span>
            <span className="combo-x">x</span>
          </div>
        )}
      </div>

      <div className="hud-bottom">
        <div className="hp-track">
          <div
            className="hp-fill"
            style={{
              width: `${hp}%`,
              background: hp > 50 ? '#34d399' : hp > 25 ? '#facc15' : '#f87171',
            }}
          />
        </div>
      </div>

      {hitFeedback.map(f => {
        const laneIdx = LANES.findIndex(l => l.key === f.lane)
        return (
          <div
            key={f.id}
            className="lane-feedback"
            style={{
              color: COLOR[f.type],
              '--lane-idx':   laneIdx,
              '--lane-count': LANES.length,
            }}
          >
            {LABEL[f.type]}
          </div>
        )
      })}

    </div>
  )
}