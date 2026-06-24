import { useEffect, useRef } from 'react'
import GameCanvas from './components/GameCanvas'
import { useGameEngine, LANE_KEYS } from './hooks/useGameEngine'
import sampleBeatmap from './assets/beatmaps/sample.json'

export default function App() {
  const engine   = useGameEngine()
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const startTime = audioCtx.currentTime

    engine.startGame(sampleBeatmap, audioCtx, startTime)
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
    <div style={{ width: '100vw', height: '100vh' }}>
      <GameCanvas
        notes={engine.notes}
        pressedLanes={engine.pressedLanes}
        getCurrentTime={engine.getCurrentTime}
      />
    </div>
  )
}