import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react'

const PANEL_W = 300
const EXPANDED_W = 700
const GAP = 12
const STEP = PANEL_W + GAP
const TRACK_H = 500

// ─── Video helpers ────────────────────────────────────────────────────────────

function getVideoType(url) {
  if (!url) return null
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube'
  if (/vimeo\.com/.test(url)) return 'vimeo'
  if (/\.mp4/i.test(url)) return 'mp4'
  return null
}

function getEmbedUrl(url, type) {
  if (type === 'youtube') {
    const id = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1]
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : url
  }
  if (type === 'vimeo') {
    const id = url.match(/vimeo\.com\/(\d+)/)?.[1]
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : url
  }
  return url
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PROSE_CSS = `
  @keyframes carouselFadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mosaicFadeDown {
    from { opacity: 0; transform: translateY(-12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .panel-content p { margin: 0 0 12px; font-size: 13px; line-height: 1.65; color: rgba(255,255,255,0.85); }
  .panel-content p:last-child { margin-bottom: 0; }
  .panel-content h2, .panel-content h3 { font-family: 'Oswald', sans-serif; color: #fff; margin: 0 0 8px; line-height: 1.2; }
  .panel-content h2 { font-size: 20px; }
  .panel-content h3 { font-size: 16px; }
  .panel-content ul, .panel-content ol { margin: 0 0 12px; padding-left: 18px; }
  .panel-content li { font-size: 13px; line-height: 1.65; color: rgba(255,255,255,0.85); margin-bottom: 4px; }
  .panel-content strong { color: #fff; font-weight: 600; }
  .panel-content a { color: #2C97BE; text-decoration: underline; }
  .mosaic-content p { margin: 0 0 12px; font-family: 'Montserrat', sans-serif; font-size: 16px; font-weight: 300; line-height: 1.5em; color: rgba(0,0,0,0.8); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  .mosaic-content p:last-child { margin-bottom: 0; }
  .mosaic-content h2, .mosaic-content h3 { font-family: 'Oswald', sans-serif; color: #000; margin: 0 0 8px; line-height: 1.2; }
  .mosaic-content h2 { font-size: 20px; }
  .mosaic-content h3 { font-size: 16px; }
  .mosaic-content ul, .mosaic-content ol { margin: 0 0 12px; padding-left: 18px; }
  .mosaic-content li { font-family: 'Montserrat', sans-serif; font-size: 15px; font-weight: 300; line-height: 1.5em; color: rgba(0,0,0,0.8); margin-bottom: 4px; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  .mosaic-content strong { color: #000; font-weight: 600; }
  .mosaic-content a { color: #2C97BE; text-decoration: underline; }
`

// ─── Individual panel ─────────────────────────────────────────────────────────

function Panel({ panel, isHovered, isExpanded }) {
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef(null)
  const videoType = getVideoType(panel.videoUrl)
  const expandedVideoType = getVideoType(panel.expandedVideoUrl)
  const hasMedia = !!(panel.image || panel.expandedImage || panel.expandedVideoUrl || panel.videoUrl)
  const isMp4 = videoType === 'mp4'
  const isExpandedMp4 = expandedVideoType === 'mp4'
  const isEmbeddable = videoType === 'youtube' || videoType === 'vimeo'

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isExpanded) {
      video.currentTime = 0
      video.play().catch(() => {})
    } else {
      video.pause()
      video.currentTime = 0
    }
  }, [isExpanded])

  return (
    <div
      style={{
        width: isExpanded ? `${EXPANDED_W}px` : `${PANEL_W}px`,
        height: '100%',
        flexShrink: 0,
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: isExpanded
          ? '0 8px 40px rgba(0,0,0,0.35)'
          : '0 4px 24px rgba(0,0,0,0.15)',
        position: 'relative',
        overflow: 'hidden',
        cursor: isExpanded ? 'default' : 'pointer',
        transition: 'width 0.45s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
        backgroundColor: isHovered && !isExpanded
          ? 'rgba(255,255,255,0.2)'
          : 'rgba(255,255,255,0.1)',
        backdropFilter: hasMedia ? 'none' : 'blur(12px)',
        WebkitBackdropFilter: hasMedia ? 'none' : 'blur(12px)',
      }}
    >
      {/* Collapsed image — always shown, zooms on hover */}
      {panel.image && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${panel.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: isHovered && !isExpanded ? 'scale(1.10)' : 'scale(1)',
          transition: 'transform 0.5s ease',
        }} />
      )}

      {/* Expanded image — crossfades in over collapsed image on expand */}
      {panel.expandedImage && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${panel.expandedImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: isExpanded ? 1 : 0,
          transition: 'opacity 0.7s ease',
        }} />
      )}

      {/* Expanded video — dissolves in over collapsed image on expand */}
      {isExpandedMp4 && (
        <video
          ref={videoRef}
          muted loop playsInline
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            opacity: isExpanded ? 1 : 0,
            transition: 'opacity 0.7s ease',
          }}
        >
          <source src={panel.expandedVideoUrl} type="video/mp4" />
        </video>
      )}

      {/* mp4 autoplay background — standalone, always playing */}
      {isMp4 && (
        <video
          autoPlay muted loop playsInline
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            transform: isHovered && !isExpanded ? 'scale(1.10)' : 'scale(1)',
            transition: 'transform 0.5s ease',
          }}
        >
          <source src={panel.videoUrl} type="video/mp4" />
        </video>
      )}

      {/* Gradient overlay */}
      {hasMedia && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.65) 100%)',
          zIndex: 1,
          opacity: isExpanded ? 0 : 1,
          transition: 'opacity 0.45s ease',
        }} />
      )}

      {/* YouTube / Vimeo iframe */}
      {isEmbeddable && playing && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
          <iframe
            src={getEmbedUrl(panel.videoUrl, videoType)}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>
      )}

      {/* Play button */}
      {isEmbeddable && !playing && (
        <button
          onClick={(e) => { e.stopPropagation(); setPlaying(true) }}
          style={{
            position: 'absolute',
            top: '50%',
            left: PANEL_W / 2,
            transform: 'translate(-50%, -50%)',
            zIndex: 3,
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(6px)',
            border: '2px solid rgba(255,255,255,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: isHovered ? 1 : 0.65,
            transition: 'opacity 0.3s ease',
          }}
        >
          <Play style={{ width: 20, height: 20, color: 'white', fill: 'white' }} />
        </button>
      )}

      {/* Title + description */}
      {!playing && (
        <div
          style={{
            position: 'absolute',
            left: '20px',
            right: '20px',
            zIndex: 2,
            opacity: isExpanded ? 0 : 1,
            transition: 'transform 0.4s ease, top 0.4s ease, bottom 0.4s ease, opacity 0.3s ease',
            ...(isExpanded
              ? { top: '50%', transform: 'translateY(-50%)' }
              : {
                  bottom: '40px',
                  transform: isHovered ? 'translateY(-60px)' : 'translateY(0)',
                }
            ),
          }}
        >
          <h2 style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: '30px',
            lineHeight: 1.1,
            color: hasMedia ? '#ffffff' : '#2C97BE',
            transition: 'font-size 0.4s ease',
            margin: 0,
          }}>
            {panel.category}
          </h2>

          {panel.description && (
            <p style={{
              position: 'absolute',
              top: 'calc(100% + 12px)',
              left: 0,
              right: 0,
              fontSize: '12px',
              lineHeight: 1.5,
              margin: 0,
              opacity: isHovered && !isExpanded ? 1 : 0,
              transition: 'opacity 0.3s ease 0.15s',
              color: hasMedia ? 'rgba(255,255,255,0.9)' : '#475569',
            }}>
              {panel.description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Carousel ─────────────────────────────────────────────────────────────────

export default function Carousel({ panels }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState(null)
  const dragRef = useRef({ active: false, startX: 0, startOffset: 0, moved: false })
  const clickTargetRef = useRef(null)

  const maxOffset = Math.max(0, (panels.length - 1) * STEP)
  const currentIndex = Math.round(offset / STEP)
  const canPrev = offset > 0
  const canNext = offset < maxOffset

  const snapTo = (index) => {
    setOffset(Math.max(0, Math.min(panels.length - 1, index)) * STEP)
  }

  const handleExpand = (idx) => {
    snapTo(idx)
    setExpandedIdx(idx)
  }

  const handleClose = () => setExpandedIdx(null)

  const handlePointerDown = (e) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { active: true, startX: e.clientX, startOffset: offset, moved: false }
    setIsDragging(true)
    const trackRect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - trackRect.left - 48 + offset
    const idx = Math.floor(x / STEP)
    clickTargetRef.current = (idx >= 0 && idx < panels.length) ? idx : null
  }

  const handlePointerMove = (e) => {
    if (!dragRef.current.active) return
    const delta = dragRef.current.startX - e.clientX
    if (Math.abs(delta) > 4) {
      dragRef.current.moved = true
      if (expandedIdx !== null) setExpandedIdx(null)
    }
    setOffset(Math.max(0, Math.min(maxOffset, dragRef.current.startOffset + delta)))
  }

  const handlePointerUp = () => {
    if (!dragRef.current.active) return
    const wasMoved = dragRef.current.moved
    dragRef.current.active = false
    setIsDragging(false)
    snapTo(Math.round(offset / STEP))
    if (!wasMoved && clickTargetRef.current !== null) {
      if (expandedIdx === clickTargetRef.current) {
        handleClose()
      } else {
        handleExpand(clickTargetRef.current)
      }
    }
  }

  if (!panels.length) return null

  const arrowStyle = (visible, side) => ({
    position: 'absolute',
    top: '50%',
    [side]: '8px',
    transform: 'translateY(-50%)',
    zIndex: 10,
    width: '36px',
    height: '36px',
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? 'auto' : 'none',
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
  })

  const activePanel = expandedIdx !== null ? panels[expandedIdx] : null

  return (
    <div style={{ width: '100%' }}>
      <style>{PROSE_CSS}</style>

      {/* Carousel track */}
      <div style={{ position: 'relative', height: `${TRACK_H}px` }}>
        <button onClick={() => { handleClose(); snapTo(currentIndex - 1) }} style={arrowStyle(canPrev, 'left')}>
          <ChevronLeft style={{ width: '18px', height: '18px', color: '#334155' }} />
        </button>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            cursor: isDragging ? 'grabbing' : 'grab',
            overflow: 'hidden',
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
            {panels.map((panel, idx) => (
              <div
                key={panel.id ?? idx}
                style={{ flexShrink: 0, height: '100%' }}
                onMouseEnter={() => { if (!dragRef.current.active) setHoveredIdx(idx) }}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <Panel
                  panel={panel}
                  isHovered={hoveredIdx === idx}
                  isExpanded={expandedIdx === idx}
                />
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => { handleClose(); snapTo(currentIndex + 1) }} style={arrowStyle(canNext, 'right')}>
          <ChevronRight style={{ width: '18px', height: '18px', color: '#334155' }} />
        </button>
      </div>

      {/* Content panel below — Mosaic styling */}
      {activePanel && (
        <div
          key={expandedIdx}
          style={{
            marginTop: '-60px',
            marginLeft: '78px',
            width: `${EXPANDED_W - 60}px`,
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.45)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            padding: '28px 40px 32px',
            position: 'relative',
            zIndex: 10,
            animation: 'carouselFadeIn 0.4s ease both',
          }}
        >
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.06)',
              border: '1px solid rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: 14, height: 14, color: 'rgba(0,0,0,0.5)' }} />
          </button>

          <h2 style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: '30px',
            lineHeight: 1.1,
            margin: '-10px 0 16px',
            color: '#000',
            textAlign: 'center',
            animation: 'mosaicFadeDown 0.4s ease both',
          }}>
            {activePanel.category}
          </h2>

          <div
            className="mosaic-content"
            style={{ animation: 'mosaicFadeDown 0.4s ease 0.15s both' }}
            dangerouslySetInnerHTML={{ __html: activePanel.content }}
          />

          {activePanel.link && (
            <a
              href={activePanel.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginTop: '20px',
                padding: '10px 24px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.2)',
                color: '#000',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '13px',
                fontWeight: 500,
                letterSpacing: '0.04em',
                textDecoration: 'none',
                transition: 'background 0.2s ease, border-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.15)'
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.08)'
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)'
              }}
            >
              Find Out More
            </a>
          )}
        </div>
      )}
    </div>
  )
}
