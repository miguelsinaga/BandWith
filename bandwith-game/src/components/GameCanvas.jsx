import { useEffect, useRef } from 'react'
import { LANES, LANE_KEYS, APPROACH_MS } from '../hooks/useGameEngine'

const NOTE_H     = 28
const HIT_Y_FRAC = 0.82   // hit zone at 82% from top
const LANE_GAP   = 6
const FX_MS      = 450
const JUDGEMENTS = ['perfect', 'good', 'ok', 'miss']

function layout(W) {
  const totalW = Math.min(W - 32, 420)
  return { totalW, startX: (W - totalW) / 2, laneW: (totalW - LANE_GAP * (LANES.length - 1)) / LANES.length }
}

export default function GameCanvas({ notesRef, fxRef, pressedRef, time, onPress, onRelease }) {
  const canvasRef = useRef(null)
  const pointers  = useRef(new Map())   // pointerId -> lane key, for multi-touch

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const css    = getComputedStyle(canvas)
    const judgeColor = Object.fromEntries(JUDGEMENTS.map(t => [t, css.getPropertyValue(`--${t}`).trim()]))
    const font   = css.getPropertyValue('--font-display')
    let raf

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const W   = canvas.clientWidth
      const H   = canvas.clientHeight
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width  = Math.round(W * dpr)
        canvas.height = Math.round(H * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const now = time()
      const { totalW, startX, laneW } = layout(W)
      const hitY  = H * HIT_Y_FRAC
      const laneX = (i) => startX + i * (laneW + LANE_GAP)

      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#0d0d1c')
      bg.addColorStop(1, '#07070d')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      LANES.forEach((lane, i) => {
        const lx      = laneX(i)
        const pressed = pressedRef.current[lane.key]

        ctx.fillStyle = 'rgba(255,255,255,0.035)'
        ctx.fillRect(lx, 0, laneW, H)

        if (pressed) {
          const beam = ctx.createLinearGradient(0, hitY, 0, hitY - H * 0.5)
          beam.addColorStop(0, lane.color + '66')
          beam.addColorStop(1, lane.color + '00')
          ctx.fillStyle = beam
          ctx.fillRect(lx, hitY - H * 0.5, laneW, H * 0.5)
        }

        ctx.beginPath()
        ctx.roundRect(lx + 2, hitY, laneW - 4, NOTE_H, 6)
        ctx.globalAlpha = pressed ? 0.9 : 0.12
        ctx.fillStyle   = lane.color
        ctx.fill()
        ctx.globalAlpha = pressed ? 1 : 0.6
        ctx.strokeStyle = lane.color
        ctx.lineWidth   = pressed ? 2.5 : 1.5
        ctx.stroke()
        ctx.globalAlpha = 1

        ctx.fillStyle    = pressed ? '#07070d' : 'rgba(255,255,255,0.7)'
        ctx.font         = `700 15px ${font}`
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(lane.label, lx + laneW / 2, hitY + NOTE_H / 2 + 1)
      })

      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth   = 1
      ctx.beginPath()
      ctx.moveTo(startX, hitY)
      ctx.lineTo(startX + totalW, hitY)
      ctx.stroke()

      for (const note of notesRef.current) {
        const i        = LANE_KEYS.indexOf(note.lane)
        const progress = (now - (note.hitTime - APPROACH_MS)) / APPROACH_MS   // 0 = top, 1 = at hitY
        const ny       = progress * hitY
        const lx       = laneX(i)

        ctx.save()
        ctx.globalAlpha = Math.min(1, progress * 3 + 0.2)
        ctx.shadowColor = LANES[i].color
        ctx.shadowBlur  = 14
        ctx.fillStyle   = LANES[i].color
        ctx.beginPath()
        ctx.roundRect(lx + 3, ny, laneW - 6, NOTE_H, 6)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.fillStyle  = 'rgba(255,255,255,0.4)'
        ctx.beginPath()
        ctx.roundRect(lx + 6, ny + 4, laneW - 12, 5, 2.5)
        ctx.fill()
        ctx.restore()
      }

      // Judgement text plus a ring burst on the receptor
      const wall = performance.now()
      for (const fx of fxRef.current) {
        const p = (wall - fx.at) / FX_MS
        if (p >= 1) continue
        const i  = LANE_KEYS.indexOf(fx.lane)
        const lx = laneX(i)
        ctx.globalAlpha = 1 - p * p
        if (fx.type !== 'miss') {
          const grow = p * 12
          ctx.strokeStyle = LANES[i].color
          ctx.lineWidth   = 2
          ctx.beginPath()
          ctx.roundRect(lx + 2 - grow, hitY - grow, laneW - 4 + grow * 2, NOTE_H + grow * 2, 6 + grow)
          ctx.stroke()
        }
        ctx.fillStyle = judgeColor[fx.type]
        ctx.font      = `700 13px ${font}`
        ctx.fillText(fx.type.toUpperCase(), lx + laneW / 2, hitY - 22 - p * 24)
        ctx.globalAlpha = 1
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [notesRef, fxRef, pressedRef, time])

  const laneAt = (e) => {
    const { totalW, startX } = layout(e.currentTarget.clientWidth)
    const i = Math.floor((e.nativeEvent.offsetX - startX) / totalW * LANES.length)
    return LANE_KEYS[Math.max(0, Math.min(LANES.length - 1, i))]
  }
  const pointerUp = (e) => {
    const key = pointers.current.get(e.pointerId)
    if (!key) return
    pointers.current.delete(e.pointerId)
    onRelease(key)
  }

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      role="img"
      aria-label="Note lanes"
      onPointerDown={(e) => {
        const key = laneAt(e)
        pointers.current.set(e.pointerId, key)
        onPress(key)
      }}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
    />
  )
}
