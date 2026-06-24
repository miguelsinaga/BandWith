import { useEffect, useRef } from 'react'
import { LANES, APPROACH_MS } from '../hooks/useGameEngine'

const NOTE_H     = 28
const HIT_Y_FRAC = 0.82   // hit zone at 82% from top
const LANE_GAP   = 6

export default function GameCanvas({ notes, pressedLanes, getCurrentTime, canvasRef: externalRef }) {
  const internalRef = useRef(null)
  const canvasRef   = externalRef || internalRef
  const rafRef      = useRef(null)
  const notesRef    = useRef(notes)

  useEffect(() => { notesRef.current = notes }, [notes])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const now  = canvas.__getTime?.() ?? 0
      const W    = canvas.width
      const H    = canvas.height
      const totalW    = Math.min(W * 0.55, 340)
      const laneW     = (totalW - LANE_GAP * (LANES.length - 1)) / LANES.length
      const startX    = (W - totalW) / 2
      const hitY      = H * HIT_Y_FRAC

      ctx.clearRect(0, 0, W, H)

      // BG
      ctx.fillStyle = '#08080f'
      ctx.fillRect(0, 0, W, H)

      // Lane columns
      LANES.forEach((lane, i) => {
        const lx = startX + i * (laneW + LANE_GAP)

        // lane bg
        ctx.fillStyle = 'rgba(255,255,255,0.03)'
        ctx.fillRect(lx, 0, laneW, H)

        // lane border subtle
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'
        ctx.lineWidth = 1
        ctx.strokeRect(lx, 0, laneW, H)

        // hit zone receptor
        const pressed = canvas.__pressedLanes?.[lane.key]
        const rxColor = pressed ? lane.color : 'rgba(255,255,255,0.15)'
        const rxGlow  = pressed ? 0.7 : 0

        // receptor base
        ctx.fillStyle = rxColor
        ctx.globalAlpha = pressed ? 0.9 : 0.3
        ctx.beginPath()
        ctx.roundRect(lx + 2, hitY, laneW - 4, NOTE_H, 6)
        ctx.fill()
        ctx.globalAlpha = 1

        // receptor border
        ctx.strokeStyle = pressed ? lane.color : 'rgba(255,255,255,0.3)'
        ctx.lineWidth = pressed ? 2.5 : 1.5
        ctx.beginPath()
        ctx.roundRect(lx + 2, hitY, laneW - 4, NOTE_H, 6)
        ctx.stroke()

        // key label inside receptor
        ctx.fillStyle = pressed ? '#fff' : 'rgba(255,255,255,0.4)'
        ctx.font = `bold ${Math.round(laneW * 0.32)}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(lane.label, lx + laneW / 2, hitY + NOTE_H / 2)
      })

      // hit zone line
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(startX, hitY)
      ctx.lineTo(startX + totalW, hitY)
      ctx.stroke()
      ctx.setLineDash([])

      // Notes
      const currentNotes = notesRef.current
      currentNotes.forEach(note => {
        const laneIdx = LANES.findIndex(l => l.key === note.lane)
        if (laneIdx < 0) return
        const lane = LANES[laneIdx]
        const lx   = startX + laneIdx * (laneW + LANE_GAP)

        const elapsed  = now - (note.hitTime - APPROACH_MS)
        const progress = elapsed / APPROACH_MS          // 0 = top, 1 = at hitY
        const ny       = progress * hitY

        // Glow behind note
        ctx.save()
        ctx.shadowColor = lane.color
        ctx.shadowBlur  = 12

        // Note body
        ctx.fillStyle = lane.color
        ctx.globalAlpha = Math.min(1, progress * 3 + 0.2)
        ctx.beginPath()
        ctx.roundRect(lx + 3, ny, laneW - 6, NOTE_H, 5)
        ctx.fill()

        // Note highlight stripe
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.beginPath()
        ctx.roundRect(lx + 5, ny + 3, laneW - 10, 5, 2)
        ctx.fill()

        ctx.globalAlpha = 1
        ctx.restore()
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  // Keep canvas up-to-date with pressed state and time
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.__pressedLanes = pressedLanes
    }
  }, [pressedLanes])

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.__getTime = getCurrentTime
    }
  }, [getCurrentTime])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
