import { useState, useRef } from 'react'
import { Activity, Zap, Brain, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'

const PANEL_W = 280
const GAP = 12
const STEP = PANEL_W + GAP

const categoryIcons = [Activity, Zap, Brain, Sparkles, Activity, Zap, Brain, Sparkles, Activity, Zap]

export default function Carousel({ panels }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ active: false, startX: 0, startOffset: 0, moved: false })

  const maxOffset = (panels.length - 1) * STEP
  const currentIndex = Math.round(offset / STEP)
  const canPrev = offset > 0
  const canNext = offset < maxOffset

  const snapTo = (index) => {
    setOffset(Math.max(0, Math.min(panels.length - 1, index)) * STEP)
  }

  const handlePointerDown = (e) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { active: true, startX: e.clientX, startOffset: offset, moved: false }
    setIsDragging(true)
  }

  const handlePointerMove = (e) => {
    if (!dragRef.current.active) return
    const delta = dragRef.current.startX - e.clientX
    if (Math.abs(delta) > 4) dragRef.current.moved = true
    setOffset(Math.max(0, Math.min(maxOffset, dragRef.current.startOffset + delta)))
  }

  const handlePointerUp = () => {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    setIsDragging(false)
    snapTo(Math.round(offset / STEP))
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>

      {/* Prev arrow */}
      <button
        onClick={() => snapTo(currentIndex - 1)}
        style={{
          position: 'absolute',
          left: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: '36px',
          height: '36px',
          opacity: canPrev ? 1 : 0,
          pointerEvents: canPrev ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          cursor: 'pointer',
        }}
      >
        <ChevronLeft style={{ width: '18px', height: '18px', color: '#334155' }} />
      </button>

      {/* Track */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          cursor: isDragging ? 'grabbing' : 'grab',
          clipPath: 'inset(0)',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          style={{
            display: 'flex',
            gap: `${GAP}px`,
            height: '100%',
            paddingTop: '16px',
            paddingBottom: '16px',
            transform: `translateX(calc(48px - ${offset}px))`,
            transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            userSelect: 'none',
          }}
        >
          {panels.map((panel, idx) => {
            const isHovered = hoveredIdx === idx
            const Icon = categoryIcons[idx]

            return (
              <div
                key={idx}
                data-panel-idx={idx}
                style={{
                  flexShrink: 0,
                  width: `${PANEL_W}px`,
                  height: '100%',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => !dragRef.current.active && setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: isHovered ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                    backdropFilter: panel.image ? 'none' : 'blur(12px)',
                    WebkitBackdropFilter: panel.image ? 'none' : 'blur(12px)',
                    scale: isHovered ? '1.05' : '1',
                    transition: 'background-color 0.3s ease, scale 0.3s ease',
                    ...(panel.image && {
                      backgroundImage: `url(${panel.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }),
                  }}
                >
                  {/* Gradient overlay */}
                  {panel.image && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.6) 100%)',
                    }} />
                  )}

                  {/* Icon + title container — bottom anchored, slides up on hover */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '20px',
                      right: '20px',
                      bottom: '40px',
                      transform: isHovered ? 'translateY(-60px)' : 'translateY(0)',
                      transition: 'transform 0.4s ease',
                    }}
                  >
                    <Icon style={{ width: '28px', height: '28px', marginBottom: '10px' }} className={panel.image ? 'text-white/80' : 'text-slate-500'} />
                    <h2
                      style={{
                        fontFamily: "'Instrument Serif', serif",
                        fontStyle: 'italic',
                        fontSize: '30px',
                        lineHeight: 1.0,
                        color: panel.image ? '#ffffff' : '#2C97BE',
                      }}
                    >
                      {panel.category}
                    </h2>

                    {panel.description && (
                      <p
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 12px)',
                          left: 0,
                          right: 0,
                          fontSize: '12px',
                          lineHeight: 1.5,
                          opacity: isHovered ? 1 : 0,
                          transition: 'opacity 0.3s ease 0.15s',
                          color: panel.image ? 'rgba(255,255,255,0.9)' : '#475569',
                        }}
                      >
                        {panel.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Next arrow */}
      <button
        onClick={() => snapTo(currentIndex + 1)}
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: '36px',
          height: '36px',
          opacity: canNext ? 1 : 0,
          pointerEvents: canNext ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          cursor: 'pointer',
        }}
      >
        <ChevronRight style={{ width: '18px', height: '18px', color: '#334155' }} />
      </button>

    </div>
  )
}
