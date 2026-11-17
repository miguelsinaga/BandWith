import { accuracy } from '../hooks/useGameEngine'
import './HUD.css'

export default function HUD({ stats, countdown, onPause }) {
  const { score, combo, hp } = stats
  const hpLevel = hp > 50 ? 'high' : hp > 25 ? 'mid' : 'low'

  return (
    <div className="hud">
      <div
        className="hp-track"
        role="progressbar"
        aria-label="HP"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hp}
      >
        <div className={`hp-fill hp-${hpLevel}`} style={{ transform: `scaleX(${hp / 100})` }} />
      </div>

      <div className="hud-score">
        <div className="hud-score-num">{score.toLocaleString()}</div>
        <div className="hud-accuracy">{accuracy(stats).toFixed(1)}%</div>
      </div>

      <button className="hud-pause" onClick={onPause} aria-label="Pause">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="currentColor" d="M7 5h3v14H7zM14 5h3v14h-3z" />
        </svg>
      </button>

      {combo > 1 && (
        <div className="hud-combo">
          {/* key restarts the pop animation on every hit */}
          <span key={combo} className="hud-combo-num">{combo}</span>
          <span className="hud-combo-label">COMBO</span>
        </div>
      )}

      {countdown > 0 && <div key={countdown} className="hud-countdown">{countdown}</div>}
    </div>
  )
}
