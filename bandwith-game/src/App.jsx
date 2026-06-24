import { useEffect, useRef, useState } from 'react'
import GameCanvas from './components/GameCanvas'
import HUD from './components/HUD'
import { useGameEngine, LANE_KEYS } from './hooks/useGameEngine'
import sampleBeatmap from './assets/beatmaps/sample.json'

export default function App() {
  const engine     = useGameEngine()
  const startedRef = useRef(false)
  const [countdown, setCountdown] = useState(3)
  const [phase, setPhase]         = useState('countdown')

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    let count = 3
    const timer = setInterval(() => {
      count--
      setCountdown(count)
      if (count <= 0) {
        clearInterval(timer)
        setPhase('playing')

        const audioCtx  = new (window.AudioContext || window.webkitAudioContext)()
        const startTime = audioCtx.currentTime
        engine.startGame(sampleBeatmap, audioCtx, startTime)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const down = (e) => {
      if (e.repeat) return
      const key = e.key.toLowerCase()
      if (!LANE_KEYS.includes(key)) return
      e.preventDefault()
      engine.pressLane(key)
      engine.setLanePressed(key, true)
    }
    const up = (e) => {
      const key = e.key.toLowerCase()
      if (!LANE_KEYS.includes(key)) return
      engine.setLanePressed(key, false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [engine.pressLane, engine.setLanePressed])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>

      {phase === 'countdown' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          background: 'rgba(8,8,15,0.9)',
        }}>
          <div style={{
            fontSize: 120, fontWeight: 900, color: '#60a5fa',
            textShadow: '0 0 40px rgba(96,165,250,0.6)',
            fontFamily: 'Segoe UI, sans-serif', lineHeight: 1,
          }}>
            {countdown > 0 ? countdown : 'GO!'}
          </div>
          <div style={{
            fontSize: 20, fontWeight: 700, letterSpacing: '0.5em',
            color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace',
          }}>
            D &nbsp; F &nbsp; J &nbsp; K
          </div>
        </div>
      )}

      <GameCanvas
        notes={engine.notes}
        pressedLanes={engine.pressedLanes}
        getCurrentTime={engine.getCurrentTime}
      />

      <HUD
        score={engine.score}
        combo={engine.combo}
        maxCombo={engine.maxCombo}
        hp={engine.hp}
        accuracy={engine.accuracy}
        hitFeedback={engine.hitFeedback}
      />

    </div>
  )
}