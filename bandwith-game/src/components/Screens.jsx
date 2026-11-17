import { LANES, accuracy, grade } from '../hooks/useGameEngine'
import './Screens.css'

const ICONS = {
  play:  'M8 5v14l11-7z',
  retry: 'M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z',
  home:  'M12 3 3 11h2v9h5v-6h4v6h5v-9h2z',
}

function Button({ icon, primary, children, ...props }) {
  return (
    <button className={primary ? 'btn btn-primary' : 'btn'} {...props}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d={ICONS[icon]} />
      </svg>
      {children}
    </button>
  )
}

export function Menu({ best, onPlay }) {
  return (
    <main className="screen">
      <div className="panel">
        <div className="logo" aria-hidden="true">
          {LANES.map(l => <span key={l.key} style={{ '--c': l.color }} />)}
        </div>
        <h1 className="title">BandWith</h1>
        <p className="lead">Hit each note as it lands on the line.</p>

        <ul className="keys" aria-label="Lane keys">
          {LANES.map(l => <li key={l.key} style={{ '--c': l.color }}><kbd>{l.label}</kbd></li>)}
        </ul>
        <p className="hint">Press the keys or tap the lanes. Esc pauses.</p>

        <Button icon="play" primary autoFocus onClick={onPlay}>Play</Button>
        {best > 0 && <p className="best">Best <strong>{best.toLocaleString()}</strong></p>}
      </div>
    </main>
  )
}

export function PauseMenu({ onResume, onRestart, onQuit }) {
  return (
    <div className="screen" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div className="panel">
        <h2 id="pause-title" className="heading">Paused</h2>
        <div className="actions">
          <Button icon="play" primary autoFocus onClick={onResume}>Resume</Button>
          <Button icon="retry" onClick={onRestart}>Restart</Button>
          <Button icon="home" onClick={onQuit}>Quit to menu</Button>
        </div>
      </div>
    </div>
  )
}

export function Result({ stats, best, newBest, onRetry, onQuit }) {
  const g = grade(stats)
  return (
    <div className="screen" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className="panel">
        <h2 id="result-title" className="heading">{g === 'F' ? 'Failed' : 'Track clear'}</h2>
        <div className={`grade grade-${g}`} aria-label={`Grade ${g}`}>{g}</div>

        <div className="score">{stats.score.toLocaleString()}</div>
        <p className="best">
          {newBest ? <strong className="new-best">New best!</strong> : <>Best <strong>{best.toLocaleString()}</strong></>}
        </p>

        <dl className="stats">
          <div><dt>Accuracy</dt><dd>{accuracy(stats).toFixed(1)}%</dd></div>
          <div><dt>Max combo</dt><dd>{stats.maxCombo}</dd></div>
        </dl>
        <dl className="stats judgements">
          {['perfect', 'good', 'ok', 'miss'].map(t => (
            <div key={t}>
              <dt style={{ color: `var(--${t})` }}>{t}</dt>
              <dd>{stats[t]}</dd>
            </div>
          ))}
        </dl>

        <div className="actions">
          <Button icon="retry" primary autoFocus onClick={onRetry}>Retry</Button>
          <Button icon="home" onClick={onQuit}>Menu</Button>
        </div>
      </div>
    </div>
  )
}
