import { useState, useRef, useCallback, useEffect } from 'react'

export const LANES = [
  { key: 'd', label: 'D', color: '#60a5fa', freq: 392 },
  { key: 'f', label: 'F', color: '#34d399', freq: 440 },
  { key: 'j', label: 'J', color: '#f472b6', freq: 523 },
  { key: 'k', label: 'K', color: '#facc15', freq: 587 },
]

export const LANE_KEYS   = LANES.map(l => l.key)
export const APPROACH_MS = 1600

const LEAD_IN_MS = 3000   // countdown before song time 0
const BEAT_MS    = 400    // the sample beatmap sits on a 150 BPM grid
const TIMING     = { perfect: 50, good: 100, ok: 150 }
const SCORE_VAL  = { perfect: 300, good: 100, ok: 50 }
const BEST_KEY   = 'bandwith.best'

export const NEW_STATS = { score: 0, combo: 0, maxCombo: 0, hp: 100, perfect: 0, good: 0, ok: 0, miss: 0 }

export function judgeTiming(diffMs) {
  const d = Math.abs(diffMs)
  return d <= TIMING.perfect ? 'perfect' : d <= TIMING.good ? 'good' : d <= TIMING.ok ? 'ok' : null
}

export function applyHit(s, type) {
  if (type === 'miss') return { ...s, miss: s.miss + 1, combo: 0, hp: Math.max(0, s.hp - 12) }
  const combo = s.combo + 1
  return {
    ...s,
    [type]: s[type] + 1,
    combo,
    maxCombo: Math.max(s.maxCombo, combo),
    // +10% per 10 combo, kept in integers
    score: s.score + SCORE_VAL[type] * (10 + Math.floor(combo / 10)) / 10,
    hp: Math.min(100, s.hp + 3),
  }
}

export function accuracy(s) {
  const total = s.perfect + s.good + s.ok + s.miss
  return total ? (s.perfect * 300 + s.good * 100 + s.ok * 50) / (total * 3) : 100
}

export function grade(s) {
  if (s.hp <= 0) return 'F'
  const a = accuracy(s)
  return a >= 95 ? 'S' : a >= 90 ? 'A' : a >= 80 ? 'B' : a >= 70 ? 'C' : 'D'
}

export function readBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 }
}

function blip(ctx, freq, at = ctx.currentTime, dur = 0.09, vol = 0.12, type = 'triangle') {
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  gain.gain.setValueAtTime(vol, at)
  gain.gain.exponentialRampToValueAtTime(0.001, at + dur)
  osc.connect(gain).connect(ctx.destination)
  osc.start(at)
  osc.stop(at + dur)
}

// shortcut: synthesized click track instead of a real song, swap for an audio file (howler is installed) once there is one
function scheduleBacking(ctx, zero, lengthMs) {
  for (let s = 3; s > 0; s--) blip(ctx, 660, zero - s, 0.12, 0.1, 'sine')
  for (let t = 0; t <= lengthMs; t += BEAT_MS / 2) {
    const kick = t % BEAT_MS === 0
    blip(ctx, kick ? 70 : 1800, zero + t / 1000, kick ? 0.14 : 0.03, kick ? 0.35 : 0.03, kick ? 'sine' : 'square')
  }
}

export function useGameEngine() {
  const [phase, setPhase]         = useState('menu')   // menu | playing | paused | result
  const [stats, setStats]         = useState(NEW_STATS)
  const [countdown, setCountdown] = useState(0)
  const [best, setBest]           = useState(readBest)
  const [newBest, setNewBest]     = useState(false)

  // The AudioContext is the game clock: suspending it pauses notes and sound together.
  const ctxRef     = useRef(null)
  const startRef   = useRef(0)
  const beatmapRef = useRef([])
  const nextRef    = useRef(0)
  const statsRef   = useRef(NEW_STATS)
  // Read by the canvas every frame, so they stay out of React state.
  const notesRef   = useRef([])
  const fxRef      = useRef([])
  const pressedRef = useRef({})

  const time = useCallback(() => {
    const ctx = ctxRef.current
    return ctx ? (ctx.currentTime - startRef.current) * 1000 - LEAD_IN_MS : -LEAD_IN_MS
  }, [])

  const judge = useCallback((type, lane) => {
    statsRef.current = applyHit(statsRef.current, type)
    setStats(statsRef.current)
    const at = performance.now()
    fxRef.current = [...fxRef.current.filter(f => at - f.at < 600), { lane, type, at }]
    if (type !== 'miss') blip(ctxRef.current, LANES.find(l => l.key === lane).freq)
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    let raf
    const tick = () => {
      const now = time()
      const bm  = beatmapRef.current
      setCountdown(Math.max(0, Math.ceil(-now / 1000)))

      while (nextRef.current < bm.length && bm[nextRef.current].time - APPROACH_MS <= now) {
        const n = bm[nextRef.current]
        notesRef.current.push({ id: nextRef.current++, lane: n.lane, hitTime: n.time })
      }

      notesRef.current = notesRef.current.filter(n => {
        if (now - n.hitTime <= TIMING.ok) return true
        judge('miss', n.lane)
        return false
      })

      const s      = statsRef.current
      const failed = s.hp <= 0
      const done   = nextRef.current >= bm.length && !notesRef.current.length
        && now > (bm.at(-1)?.time ?? 0) + 800

      if (!failed && !done) { raf = requestAnimationFrame(tick); return }

      ctxRef.current.suspend()
      const prev = readBest()
      if (s.score > prev) {
        try { localStorage.setItem(BEST_KEY, s.score) } catch { /* private mode: best just isn't kept */ }
        setBest(s.score)
      }
      setNewBest(s.score > prev)
      setPhase('result')
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, time, judge])

  // Must be called from a user gesture so the browser lets the AudioContext run.
  const start = useCallback((beatmap) => {
    ctxRef.current?.close()
    const ctx = new AudioContext()
    ctxRef.current     = ctx
    startRef.current   = ctx.currentTime
    beatmapRef.current = [...beatmap].sort((a, b) => a.time - b.time)
    nextRef.current    = 0
    notesRef.current   = []
    fxRef.current      = []
    statsRef.current   = NEW_STATS
    setStats(NEW_STATS)
    setCountdown(LEAD_IN_MS / 1000)
    setPhase('playing')
    scheduleBacking(ctx, ctx.currentTime + LEAD_IN_MS / 1000, beatmapRef.current.at(-1)?.time ?? 0)
  }, [])

  const pause = useCallback(() => {
    if (phase !== 'playing') return
    ctxRef.current.suspend()
    setPhase('paused')
  }, [phase])

  const resume = useCallback(() => {
    if (phase !== 'paused') return
    ctxRef.current.resume()
    setPhase('playing')
  }, [phase])

  const quit = useCallback(() => {
    ctxRef.current?.close()
    ctxRef.current   = null
    notesRef.current = []
    fxRef.current    = []
    setPhase('menu')
  }, [])

  const press = useCallback((key) => {
    pressedRef.current[key] = true
    if (phase !== 'playing') return
    const now    = time()
    const inLane = notesRef.current.filter(n => n.lane === key)
    if (!inLane.length) return
    const note = inLane.reduce((a, b) =>
      Math.abs(now - a.hitTime) <= Math.abs(now - b.hitTime) ? a : b
    )
    const type = judgeTiming(now - note.hitTime)
    if (!type) return
    notesRef.current = notesRef.current.filter(n => n !== note)
    judge(type, key)
  }, [phase, time, judge])

  const release = useCallback((key) => { pressedRef.current[key] = false }, [])

  return {
    phase, stats, countdown, best, newBest,
    notesRef, fxRef, pressedRef,
    time, start, pause, resume, quit, press, release,
  }
}
