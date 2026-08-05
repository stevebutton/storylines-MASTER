import { useState, useRef, useEffect } from 'react'

const CARD_H = 380
const VIDEO_RATIO = 1440 / 900   // source video aspect ratio
const GAP = 24
const SHRUNK_W = 200

// ─── Video helpers ────────────────────────────────────────────────────────────

function getVideoType(url) {
  if (!url) return null
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube'
  if (/vimeo\.com/.test(url)) return 'vimeo'
  if (/\.mp4/i.test(url)) return 'mp4'
  return null
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PROSE_CSS = `
  @keyframes mosaicFadeDown {
    from { opacity: 0; transform: translateY(-12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
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

// ─── Card ─────────────────────────────────────────────────────────────────────

function MosaicCard({ panel, isHovered, isExpanded }) {
  const videoRef = useRef(null)
  const previewVideoRef = useRef(null)
  const videoType = getVideoType(panel.videoUrl)
  const hasMedia = !!(panel.image || panel.videoUrl || panel.previewVideoUrl)
  const isMp4 = videoType === 'mp4'

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

  useEffect(() => {
    const preview = previewVideoRef.current
    if (!preview) return
    if (isExpanded) {
      preview.pause()
    } else {
      preview.play().catch(() => {})
    }
  }, [isExpanded])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.6)',
        boxShadow: isExpanded || isHovered
          ? '0 8px 40px rgba(0,0,0,0.3)'
          : '0 4px 24px rgba(0,0,0,0.15)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        scale: isHovered ? '1.03' : '1',
        transition: 'scale 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease',
        backgroundColor: isHovered
          ? 'rgba(255,255,255,0.2)'
          : 'rgba(255,255,255,0.1)',
        backdropFilter: hasMedia ? 'none' : 'blur(12px)',
        WebkitBackdropFilter: hasMedia ? 'none' : 'blur(12px)',
        ...(panel.image && {
          backgroundImage: `url(${panel.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }),
      }}
    >
      {/* Idle / preview video — plays in closed state, fades out on expand */}
      {panel.previewVideoUrl && (
        <video
          ref={previewVideoRef}
          autoPlay muted playsInline
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            opacity: isExpanded ? 0 : 1,
            transition: 'opacity 0.7s ease',
          }}
        >
          <source src={panel.previewVideoUrl} type="video/mp4" />
        </video>
      )}

      {/* mp4 — dissolves in over the image on expand, resets on collapse */}
      {isMp4 && (
        <video
          ref={videoRef}
          muted loop playsInline
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            opacity: isExpanded ? 1 : 0,
            transition: 'opacity 0.7s ease',
          }}
        >
          <source src={panel.videoUrl} type="video/mp4" />
        </video>
      )}

      {/* YouTube / Vimeo — mounts on expand so autoplay triggers, unmounts on collapse */}
      {(videoType === 'youtube' || videoType === 'vimeo') && isExpanded && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          animation: 'mosaicFadeDown 0.7s ease',
        }}>
          <iframe
            src={getEmbedUrl(panel.videoUrl, videoType)}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>
      )}

      {/* gradient removed — title is embedded in video */}

      {/* Title + description */}
      <div style={{
        position: 'absolute',
        left: '20px',
        right: '20px',
        bottom: '40px',
        zIndex: 2,
        opacity: isExpanded ? 0 : 1,
        transition: 'opacity 0.3s ease',
      }}>
        {!panel.previewVideoUrl && (
          <h2 style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: '42px',
            lineHeight: 1.1,
            margin: 0,
            color: hasMedia ? '#ffffff' : '#2C97BE',
          }}>
            {panel.category}
          </h2>
        )}

        {panel.description && (
          <p style={{
            position: 'absolute',
            top: 'calc(100% - 8px)',
            left: 0,
            right: 0,
            margin: 0,
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '15px',
            fontWeight: 300,
            lineHeight: '1.5em',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            opacity: isExpanded ? 1 : 0,
            transition: 'opacity 0.3s ease 0.1s',
            color: hasMedia ? 'rgba(255,255,255,0.9)' : '#475569',
          }}>
            {panel.description}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Content panel ────────────────────────────────────────────────────────────

function MosaicContentPanel({ panel, index }) {
  return (
    <div style={{
      borderRadius: '16px',
      background: '#ffffff',
      border: '1px solid rgba(255,255,255,0.6)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      padding: '28px 40px 32px',
      position: 'relative',
      height: '100%',
      boxSizing: 'border-box',
      overflowY: 'auto',
    }}>
      <h2 style={{
        fontFamily: "'Oswald', sans-serif",
        fontSize: '42px',
        lineHeight: 1.1,
        margin: '-10px 0 16px',
        color: '#000',
        textAlign: index < 2 ? 'left' : 'right',
        animation: 'mosaicFadeDown 0.4s ease both',
      }}>
        {panel.category}
      </h2>

      <div
        className="mosaic-content"
        style={{ animation: 'mosaicFadeDown 0.4s ease 0.35s both' }}
        dangerouslySetInnerHTML={{ __html: panel.content }}
      />

      {panel.link && (
        <a
          href={panel.link}
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
  )
}

// ─── Mosaic ───────────────────────────────────────────────────────────────────

export default function Mosaic({ panels }) {
  const containerRef = useRef(null)
  const collapseTimer = useRef(null)
  const [containerW, setContainerW] = useState(1276)
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [expandedIdx, setExpandedIdx] = useState(null)
  const [inView, setInView] = useState(false)

  const scheduleCollapse = () => {
    collapseTimer.current = setTimeout(() => {
      setHoveredIdx(null)
      setExpandedIdx(null)
    }, 80)
  }

  const cancelCollapse = () => clearTimeout(collapseTimer.current)

  // Only render cards once the component scrolls into the viewport
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        io.disconnect()
      }
    }, { threshold: 0.1 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => setContainerW(entry.contentRect.width))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  if (!panels.length) return null

  const cards = panels.slice(0, 4)
  const normalW = Math.floor((containerW - GAP * 3) / 4)
  // expanded card overlaps its neighbours; other slots keep normalW
  const expandedW = Math.round(normalW * 2.5)
  const expandedH = Math.round(expandedW / VIDEO_RATIO)

  // left position of the expanded card in container coords, clamped to container edges
  const getExpandedCardLeft = (idx) => {
    const slotLeft = idx * (normalW + GAP)
    const desired = slotLeft + (normalW - expandedW) / 2
    return Math.max(0, Math.min(containerW - expandedW, desired))
  }

  // Content panel sits beside the expanded card — not below it.
  // Cards 0 & 1 (left half): panel to the right. Cards 2 & 3 (right half): panel to the left.
  // Width is 50% of the available space beside the expanded card.
  // For cards 2 & 3 the panel is right-aligned (flush against the expanded card).
  const sidePanelW = 300
  const sidePanelLeft = expandedIdx !== null
    ? expandedIdx < 2
      ? getExpandedCardLeft(expandedIdx) + expandedW + GAP          // right of card
      : getExpandedCardLeft(expandedIdx) - GAP - sidePanelW         // flush left of card
    : 0

  return (
    <div style={{ width: '100%', maxWidth: 1340, margin: '0 auto', padding: `${24 + (expandedH - CARD_H) / 2}px 32px`, boxSizing: 'border-box' }}>
      <style>{PROSE_CSS}</style>

      <div
        ref={containerRef}
        onMouseLeave={() => { cancelCollapse(); setExpandedIdx(null); setHoveredIdx(null) }}
        style={{ minHeight: inView ? undefined : CARD_H, position: 'relative' }}
      >
        {/* Card row — deferred until component enters the viewport */}
        {inView && <div style={{ display: 'flex', gap: GAP }}>
          {cards.map((panel, idx) => (
            <div
              key={panel.id ?? idx}
              style={{
                width: normalW,
                height: CARD_H,
                flexShrink: 0,
                position: 'relative',
                zIndex: expandedIdx === idx ? 10 : 1,
              }}
              onMouseEnter={() => { cancelCollapse(); setHoveredIdx(idx); setExpandedIdx(idx) }}
              onMouseLeave={scheduleCollapse}
            >
              {/* inner div expands and overlaps neighbours */}
              <div style={{
                position: 'absolute',
                width: expandedIdx === idx ? expandedW : normalW,
                height: expandedIdx === idx ? expandedH : CARD_H,
                left: expandedIdx === idx ? getExpandedCardLeft(idx) - idx * (normalW + GAP) : 0,
                top: expandedIdx === idx ? (CARD_H - expandedH) / 2 : 0,
                transition: 'width 0.45s cubic-bezier(0.4, 0, 0.2, 1), height 0.45s cubic-bezier(0.4, 0, 0.2, 1), left 0.45s cubic-bezier(0.4, 0, 0.2, 1), top 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                <MosaicCard
                  panel={panel}
                  isHovered={hoveredIdx === idx}
                  isExpanded={expandedIdx === idx}
                />
              </div>
            </div>
          ))}
        </div>}

        {/* Content panel — beside the expanded card, vertically centred */}
        {inView && expandedIdx !== null && panels[expandedIdx] && (
          <div
            style={{
              position: 'absolute',
              top: (CARD_H - expandedH) / 2,
              height: expandedH,
              left: sidePanelLeft,
              width: sidePanelW,
              zIndex: 10,
              animation: 'mosaicFadeDown 0.6s ease 2s both',
            }}
            onMouseEnter={cancelCollapse}
            onMouseLeave={scheduleCollapse}
          >
            <MosaicContentPanel
              key={expandedIdx}
              panel={panels[expandedIdx]}
              index={expandedIdx}
            />
          </div>
        )}
      </div>
    </div>
  )
}
