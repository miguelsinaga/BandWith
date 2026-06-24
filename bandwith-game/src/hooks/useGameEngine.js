import { useState, useRef, useCallback } from 'react'

export const LANES = [
  { key: 'd', label: 'D', color: '#60a5fa' },
  { key: 'f', label: 'F', color: '#34d399' },
  { key: 'j', label: 'J', color: '#f472b6' },
  { key: 'k', label: 'K', color: '#facc15' },
]

export const LANE_KEYS  = LANES.map(l => l.key)
export const APPROACH_MS = 1600

const TIMING   = { perfect: 50, good: 100, ok: 150 }
const SCORE_VAL = { perfect: 300, good: 100, ok: 50, miss: 0 }

export function useGameEngine() {
  const [notes, setNotes]             = useState([])
  const [gameState, setGameState]     = useState('idle')
  const [pressedLanes, setPressedLanes] = useState({})
  const [score, setScore]             = useState(0)
  const [combo, setCombo]             = useState(0)
  const [maxCombo, setMaxCombo]       = useState(0)
  const [hp, setHp]                   = useState(100)
  const [accuracy, setAccuracy]       = useState(100)
  const [hitFeedback, setHitFeedback] = useState([])

  const audioCtxRef     = useRef(null)
  const startTimeRef    = useRef(0)
  const beatmapRef      = useRef([])
  const nextNoteIdxRef  = useRef(0)
  const noteIdRef       = useRef(0)
  const rafRef          = useRef(null)
  const missIntervalRef = useRef(null)
  const gameActiveRef   = useRef(false)
  const comboRef        = useRef(0)
  const scoreRef        = useRef(0)
  const hitsRef         = useRef({ perfect: 0, good: 0, ok: 0, miss: 0, total: 0 })

  const getCurrentTime = useCallback(() => {
    if (!audioCtxRef.current) return 0
    return (audioCtxRef.current.currentTime - startTimeRef.current) * 1000
  }, [])

  const endGame = useCallback(() => {
    if (!gameActiveRef.current) return
    gameActiveRef.current = false
    cancelAnimationFrame(rafRef.current)
    clearInterval(missIntervalRef.current)
    setGameState('result')
  }, [])

  const calcAccuracy = useCallback(() => {
    const h = hitsRef.current
    if (h.total === 0) return 100
    const weighted    = h.perfect * 300 + h.good * 100 + h.ok * 50
    const maxWeighted = h.total * 300
    return Math.round((weighted / maxWeighted) * 10000) / 100
  }, [])

  const showFeedback = useCallback((type, lane) => {
    const id = Date.now() + Math.random()
    setHitFeedback(prev => [...prev, { id, type, lane }])
    setTimeout(() => {
      setHitFeedback(prev => prev.filter(f => f.id !== id))
    }, 500)
  }, [])

  const registerHit = useCallback((type, lane) => {
    hitsRef.current[type]++
    hitsRef.current.total++

    if (type !== 'miss') {
      comboRef.current++
      const bonus = Math.floor(comboRef.current / 10)
      scoreRef.current += SCORE_VAL[type] * (1 + bonus * 0.1)
      setScore(Math.floor(scoreRef.current))
      setCombo(comboRef.current)
      setMaxCombo(prev => Math.max(prev, comboRef.current))
      setHp(prev => Math.min(100, prev + 3))
    } else {
      comboRef.current = 0
      setCombo(0)
      setHp(prev => {
        const next = prev - 12
        if (next <= 0) { endGame(); return 0 }
        return next
      })
    }

    setAccuracy(calcAccuracy())
    showFeedback(type, lane)
  }, [calcAccuracy, showFeedback, endGame])

  const spawnLoop = useCallback(() => {
    if (!gameActiveRef.current) return
    const now = getCurrentTime()
    const bm  = beatmapRef.current

    while (
      nextNoteIdxRef.current < bm.length &&
      bm[nextNoteIdxRef.current].time - APPROACH_MS <= now
    ) {
      const note = bm[nextNoteIdxRef.current]
      const id   = noteIdRef.current++
      setNotes(prev => [...prev, { id, lane: note.lane, hitTime: note.time }])
      nextNoteIdxRef.current++
    }

    if (nextNoteIdxRef.current >= bm.length) {
      setNotes(prev => {
        if (prev.length === 0) { setTimeout(endGame, 800); return prev }
        return prev
      })
    }

    rafRef.current = requestAnimationFrame(spawnLoop)
  }, [getCurrentTime, endGame])

  const startGame = useCallback((beatmap, audioCtx, audioStartTime) => {
    beatmapRef.current     = [...beatmap].sort((a, b) => a.time - b.time)
    audioCtxRef.current    = audioCtx
    startTimeRef.current   = audioStartTime
    nextNoteIdxRef.current = 0
    noteIdRef.current      = 0
    gameActiveRef.current  = true
    comboRef.current       = 0
    scoreRef.current       = 0
    hitsRef.current        = { perfect: 0, good: 0, ok: 0, miss: 0, total: 0 }

    setNotes([])
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setHp(100)
    setAccuracy(100)
    setHitFeedback([])
    setGameState('playing')

    missIntervalRef.current = setInterval(() => {
      if (!gameActiveRef.current) return
      const now = getCurrentTime()
      setNotes(prev => {
        const remaining = []
        for (const n of prev) {
          if (now - n.hitTime > TIMING.ok + 50) {
            registerHit('miss', n.lane)
          } else {
            remaining.push(n)
          }
        }
        return remaining
      })
    }, 50)

    rafRef.current = requestAnimationFrame(spawnLoop)
  }, [getCurrentTime, registerHit, spawnLoop])

  const pressLane = useCallback((laneKey) => {
    if (!gameActiveRef.current) return
    const now = getCurrentTime()

    setNotes(prev => {
      const laneNotes = prev.filter(n => n.lane === laneKey)
      if (laneNotes.length === 0) return prev

      const earliest = laneNotes.reduce((a, b) =>
        Math.abs(now - a.hitTime) < Math.abs(now - b.hitTime) ? a : b
      )
      const diff = Math.abs(now - earliest.hitTime)
      if (diff > TIMING.ok) return prev

      let type = 'ok'
      if (diff <= TIMING.perfect) type = 'perfect'
      else if (diff <= TIMING.good) type = 'good'

      registerHit(type, laneKey)
      return prev.filter(n => n.id !== earliest.id)
    })
  }, [getCurrentTime, registerHit])

  const setLanePressed = useCallback((key, pressed) => {
    setPressedLanes(prev => ({ ...prev, [key]: pressed }))
  }, [])

  return {
    notes, gameState, pressedLanes,
    score, combo, maxCombo, hp, accuracy, hitFeedback,
    setGameState, startGame, pressLane,
    setLanePressed, getCurrentTime,
  }
}