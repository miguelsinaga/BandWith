import { useEffect } from 'react'
import GameCanvas from './components/GameCanvas'
import HUD from './components/HUD'
import { Menu, PauseMenu, Result } from './components/Screens'
import { useGameEngine, LANE_KEYS } from './hooks/useGameEngine'
import sampleBeatmap from './assets/beatmaps/sample.json'

export default function App() {
  const engine = useGameEngine()
  const { phase, press, release, pause, resume } = engine
  const play = () => engine.start(sampleBeatmap)

  useEffect(() => {
    const down = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'escape') { if (phase === 'paused') resume(); else pause() }
      if (!LANE_KEYS.includes(key)) return
      e.preventDefault()
      press(key)
    }
    const up = (e) => {
      const key = e.key.toLowerCase()
      if (LANE_KEYS.includes(key)) release(key)
    }
    // The audio clock keeps running in a hidden tab while frames stop, so every note would miss.
    const hide = () => { if (document.hidden) pause() }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    document.addEventListener('visibilitychange', hide)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      document.removeEventListener('visibilitychange', hide)
    }
  }, [phase, press, release, pause, resume])

  return (
    <div className="app">
      <GameCanvas
        notesRef={engine.notesRef}
        fxRef={engine.fxRef}
        pressedRef={engine.pressedRef}
        time={engine.time}
        onPress={press}
        onRelease={release}
      />

      {phase === 'playing' && (
        <HUD stats={engine.stats} countdown={engine.countdown} onPause={pause} />
      )}
      {phase === 'menu' && <Menu best={engine.best} onPlay={play} />}
      {phase === 'paused' && (
        <PauseMenu onResume={resume} onRestart={play} onQuit={engine.quit} />
      )}
      {phase === 'result' && (
        <Result
          stats={engine.stats}
          best={engine.best}
          newBest={engine.newBest}
          onRetry={play}
          onQuit={engine.quit}
        />
      )}
    </div>
  )
}
