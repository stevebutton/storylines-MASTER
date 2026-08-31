import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react'

const PANEL_W = 300
const EXPANDED_W = 700
const GAP = 12
const STEP = PANEL_W + GAP
const TRACK_H = 590
const INTRO_W = 400  // panels start here; intro text fills the space to the left
const OUTRO_W = 400  // outro text fills the space to the right when fully scrolled
const CAROUSEL_BG = 'http://storylines.flywheelsites.com/wp-content/uploads/2026/08/serene-african-savanna-landscape-with-distant-tree-2026-01-05-04-45-16-utc-1-1.jpg'

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
  @keyframes carouselCardFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes carouselSlideFromRight {
    from { opacity: 0; transform: translateX(24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes mosaicFadeDown {
    from { opacity: 0; transform: translateY(-12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes routeSlideIn {
    from { opacity: 0; transform: translateY(calc(-50% - 5px)) translateX(300px); }
    to   { opacity: 1; transform: translateY(calc(-50% - 5px)) translateX(0); }
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
  .description-content p { margin: 0 0 10px; font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 300; line-height: 1.5; color: rgba(255,255,255,0.9); }
  .description-content p:last-child { margin-bottom: 0; }
  .description-content h1, .description-content h2, .description-content h3, .description-content h4, .description-content h5 { font-family: 'Oswald', sans-serif; color: #fff; margin: 0 0 8px; line-height: 1.2; font-weight: 500; }
  .description-content h1 { font-size: 22px; }
  .description-content h2 { font-size: 18px; }
  .description-content h3 { font-size: 16px; }
  .description-content h4 { font-size: 14px; }
  .description-content h5 { font-size: 13px; }
  .description-content ul, .description-content ol { margin: 0 0 10px; padding-left: 18px; }
  .description-content li { font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 300; line-height: 1.5; color: rgba(255,255,255,0.9); margin-bottom: 4px; }
  .description-content strong { color: #fff; font-weight: 600; }
  .description-content em { font-style: italic; }
  .description-content a { color: #fbbf24; text-decoration: underline; }
`

// ─── Individual panel ─────────────────────────────────────────────────────────

function Panel({ panel, isHovered, isExpanded, onClose }) {
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
        cursor: isExpanded ? 'default' : 'pointer',
        transition: 'width 0.45s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
        backgroundColor: isHovered && !isExpanded
          ? 'rgba(255,255,255,0.2)'
          : 'rgba(255,255,255,0.1)',
      }}
    >
      {/* Inner clip wrapper — keeps media and overlays clipped to card shape */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '16px', overflow: 'hidden' }}>

        {/* Collapsed image — always shown, zooms on hover */}
        {panel.image && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${panel.image})`,
            backgroundSize: 'auto',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            transform: isHovered && !isExpanded ? 'translateY(-50px)' : 'translateY(0)',
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
            autoPlay muted playsInline
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
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,1) 100%)',
          zIndex: 1,
          opacity: isExpanded ? 0 : isHovered ? 0.5 : 0.325,
          transition: 'opacity 0.45s ease',
        }} />

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

      </div>{/* end inner clip wrapper */}

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
            transition: 'transform 0.4s ease, top 0.4s ease, opacity 0.3s ease',
            ...(isExpanded
              ? { top: '50%', transform: 'translateY(-50%)' }
              : {
                  top: '320px',
                  transform: isHovered ? 'translateY(-60px)' : 'translateY(0)',
                }
            ),
          }}
        >
          <h2 style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: '30px',
            lineHeight: 1.1,
            color: '#ffffff',
            transition: 'font-size 0.4s ease, text-shadow 0.4s ease',
            textShadow: isHovered && !isExpanded
              ? '0 2px 16px rgba(0,0,0,0.8)'
              : '0 2px 16px rgba(0,0,0,0)',
            margin: 0,
            textAlign: 'center',
          }}>
            {panel.category}
          </h2>

          {panel.description && (
            <div
              className="description-content"
              style={{
                position: 'absolute',
                top: 'calc(100% + 12px)',
                left: 0,
                right: 0,
                margin: 0,
                opacity: isHovered && !isExpanded ? 1 : 0,
                transition: 'opacity 0.3s ease 0.15s',
              }}
              dangerouslySetInnerHTML={{ __html: panel.description }}
            />
          )}
        </div>
      )}

      {/* Content panel — always rendered; opacity/transform transition handles enter and exit */}
      <div style={{
          position: 'absolute',
          top: -20,
          right: -270,
          width: 300,
          height: 'calc(100% + 40px)',
          zIndex: 6,
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          padding: '28px 24px',
          boxSizing: 'border-box',
          overflowY: 'auto',
          opacity: isExpanded ? 1 : 0,
          transform: isExpanded ? 'translateX(0)' : 'translateX(24px)',
          pointerEvents: isExpanded ? 'auto' : 'none',
          transition: isExpanded
            ? 'opacity 0.6s ease 1s, transform 0.6s ease 1s'
            : 'opacity 0.3s ease, transform 0.3s ease',
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); onClose && onClose() }}
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
            fontSize: '26px',
            lineHeight: 1.1,
            margin: '-10px 0 16px',
            color: '#000',
            textAlign: 'left',
          }}>
            {panel.category}
          </h2>

          <div
            className="mosaic-content"
            dangerouslySetInnerHTML={{ __html: panel.content }}
          />

          {panel.link && (
            <a
              href={panel.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginTop: '16px',
                padding: '8px 20px',
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
    </div>
  )
}

// ─── Carousel ─────────────────────────────────────────────────────────────────

export default function Carousel({ panels, intro, outro }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState(null)
  const [introMounted, setIntroMounted] = useState(false)
  const dragRef = useRef({ active: false, startX: 0, startOffset: 0, moved: false })
  const clickTargetRef = useRef(null)
  const collapseTimer = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setIntroMounted(true), 500)
    return () => clearTimeout(t)
  }, [])

  const scheduleCollapse = () => {
    collapseTimer.current = setTimeout(() => setExpandedIdx(null), 80)
  }
  const cancelCollapse = () => clearTimeout(collapseTimer.current)

  const maxOffset = Math.max(0, (panels.length - 1) * STEP)
  const introOpacity = introMounted ? Math.max(0, 1 - offset / (PANEL_W * 0.5)) : 0
  const outroOpacity = introMounted && maxOffset > 0
    ? Math.max(0, 1 - (maxOffset - offset) / (PANEL_W * 0.5))
    : 0
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
    const x = e.clientX - trackRect.left - INTRO_W + offset
    // Walk actual panel widths — Math.floor(x/STEP) breaks when a panel is expanded
    let panelStart = 0
    let clickIdx = null
    for (let i = 0; i < panels.length; i++) {
      const w = expandedIdx === i ? EXPANDED_W : PANEL_W
      if (x >= panelStart && x < panelStart + w) { clickIdx = i; break }
      panelStart += w + GAP
    }
    clickTargetRef.current = clickIdx
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

  return (
    <div style={{ backgroundColor: 'white', paddingTop: 50, paddingBottom: 50 }}>
    <div style={{
      width: '100%',
      backgroundImage: `url(${CAROUSEL_BG})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <style>{PROSE_CSS}</style>

      {/* Carousel track */}
      <div style={{ position: 'relative', height: `${TRACK_H}px` }} onMouseLeave={scheduleCollapse}>

        {/* Route map — outside overflow:hidden so it bleeds into white areas */}
        <img
          src="http://storylines.flywheelsites.com/wp-content/uploads/2026/08/RouteMapV2-7.png"
          alt=""
          style={{
            position: 'absolute',
            left: 220,
            width: '807px',
            height: 'auto',
            top: '50%',
            pointerEvents: 'none',
            zIndex: 0,
            animation: 'routeSlideIn 4s ease forwards',
          }}
        />
        <button onClick={() => { handleClose(); snapTo(currentIndex - 1) }} style={arrowStyle(canPrev, 'left')}>
          <ChevronLeft style={{ width: '18px', height: '18px', color: '#334155' }} />
        </button>

        {/* Intro text — stationary in the background, covered by panels as they scroll left */}
        {intro && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: INTRO_W,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            padding: '70px 48px 24px 50px',
            boxSizing: 'border-box',
            zIndex: 0,
            pointerEvents: 'none',
            opacity: introOpacity,
            transition: 'opacity 1s ease',
          }}>
            {intro.category && (
              <h2 style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: '28px',
                lineHeight: 1.1,
                color: '#1e293b',
                margin: '0 0 12px',
                textAlign: 'right',
              }}>
                {intro.category}
              </h2>
            )}
            {intro.content && (
              <div
                className="mosaic-content"
                style={{ fontSize: '14px', lineHeight: 1.65, color: '#475569' }}
                dangerouslySetInnerHTML={{ __html: intro.content }}
              />
            )}
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            cursor: isDragging ? 'grabbing' : 'grab',
            overflow: 'hidden',
            zIndex: 1,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Background image inside this stacking context so backdrop-filter on cards can sample it */}
          {/* Pre-blurred background — clipped to hovered card's area */}
          {(() => {
            const INS = 40
            const clipPath = hoveredIdx !== null ? (() => {
              const cardL = INTRO_W - offset + hoveredIdx * (PANEL_W + GAP) + INS
              const cardT = 36 + INS
              const cardB = TRACK_H + INS * 2 - cardT - (TRACK_H - 36 - 86)
              return `inset(${cardT}px calc(100% - ${cardL + PANEL_W}px) ${cardB}px ${cardL}px round 16px)`
            })() : 'inset(50% 50% 50% 50%)'
            return (
              <div style={{
                position: 'absolute',
                inset: `-${INS}px`,
                backgroundImage: `url(${CAROUSEL_BG})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(20px)',
                opacity: hoveredIdx !== null ? 1 : 0,
                clipPath,
                transition: 'opacity 0.4s ease, clip-path 0.2s ease',
                zIndex: 0,
              }} />
            )
          })()}

          <div
            style={{
              position: 'relative',
              display: 'flex',
              gap: `${GAP}px`,
              height: '100%',
              paddingTop: '36px',
              paddingBottom: '86px',
              transform: `translateX(calc(${INTRO_W}px - ${offset}px))`,
              transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              userSelect: 'none',
            }}
          >

            {panels.map((panel, idx) => {
              const isHov = hoveredIdx === idx
              return (
                <div
                  key={panel.id ?? idx}
                  style={{
                    flexShrink: 0,
                    height: '100%',
                    animation: `carouselCardFadeIn 1s ease ${idx + 1}s both`,
                    position: 'relative',
                    zIndex: expandedIdx === idx ? 10 : 1,
                  }}
                  onMouseEnter={() => { if (!dragRef.current.active) setHoveredIdx(idx) }}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <Panel
                    panel={panel}
                    isHovered={isHov}
                    isExpanded={expandedIdx === idx}
                    onClose={handleClose}
                  />
                </div>
              )
            })}

            {/* Outro — natural flex item after last card, dissolves in at scroll end */}
            {outro && (
              <div style={{
                flexShrink: 0,
                width: OUTRO_W,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '24px 48px',
                boxSizing: 'border-box',
                pointerEvents: 'none',
                opacity: outroOpacity,
                transition: 'opacity 1s ease',
                transform: 'translateY(-75px)',
              }}>
                {outro.category && (
                  <h2 style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontSize: '28px',
                    lineHeight: 1.1,
                    color: '#1e293b',
                    margin: '0 0 12px',
                    textAlign: 'left',
                  }}>
                    {outro.category}
                  </h2>
                )}
                {outro.content && (
                  <div
                    className="mosaic-content"
                    style={{ fontSize: '14px', lineHeight: 1.65, color: '#475569' }}
                    dangerouslySetInnerHTML={{ __html: outro.content }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <button onClick={() => { handleClose(); snapTo(currentIndex + 1) }} style={arrowStyle(canNext, 'right')}>
          <ChevronRight style={{ width: '18px', height: '18px', color: '#334155' }} />
        </button>

      </div>
    </div>
    </div>
  )
}
