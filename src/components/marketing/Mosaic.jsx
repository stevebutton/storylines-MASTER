import { useState, useRef, useEffect } from 'react'
import { Play, X } from 'lucide-react'

const CARD_H = 380
const GAP = 24
const SHRUNK_W = 200
const CONTENT_PANEL_W = 350

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

// ─── Prose styles ─────────────────────────────────────────────────────────────

const PROSE_CSS = `
  .mosaic-content p { margin: 0 0 12px; font-size: 13px; line-height: 1.65; color: rgba(255,255,255,0.85); }
  .mosaic-content p:last-child { margin-bottom: 0; }
  .mosaic-content h2, .mosaic-content h3 { font-family: 'Instrument Serif', serif; font-style: italic; color: #fff; margin: 0 0 8px; line-height: 1.2; }
  .mosaic-content h2 { font-size: 20px; }
  .mosaic-content h3 { font-size: 16px; }
  .mosaic-content ul, .mosaic-content ol { margin: 0 0 12px; padding-left: 18px; }
  .mosaic-content li { font-size: 13px; line-height: 1.65; color: rgba(255,255,255,0.85); margin-bottom: 4px; }
  .mosaic-content strong { color: #fff; font-weight: 600; }
  .mosaic-content a { color: #2C97BE; text-decoration: underline; }
`

// ─── Panel ────────────────────────────────────────────────────────────────────

function MosaicPanel({ panel, isHovered, isExpanded, onExpand, onClose }) {
  const [playing, setPlaying] = useState(false)
  const videoType = getVideoType(panel.videoUrl)
  const hasMedia = !!(panel.image || panel.videoUrl)
  const isMp4 = videoType === 'mp4'
  const isEmbeddable = videoType === 'youtube' || videoType === 'vimeo'

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: isExpanded
          ? '0 8px 40px rgba(0,0,0,0.35)'
          : '0 4px 24px rgba(0,0,0,0.15)',
        position: 'relative',
        overflow: 'hidden',
        cursor: isExpanded ? 'default' : 'pointer',
        scale: isExpanded ? '1.1' : '1',
        transition: 'scale 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease',
        backgroundColor: isHovered && !isExpanded
          ? 'rgba(255,255,255,0.2)'
          : 'rgba(255,255,255,0.1)',
        backdropFilter: hasMedia ? 'none' : 'blur(12px)',
        WebkitBackdropFilter: hasMedia ? 'none' : 'blur(12px)',
        ...(panel.image && !isMp4 && {
          backgroundImage: `url(${panel.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }),
      }}
    >
      {/* mp4 autoplay background */}
      {isMp4 && (
        <video
          autoPlay muted loop playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        >
          <source src={panel.videoUrl} type="video/mp4" />
        </video>
      )}

      {/* Gradient overlay */}
      {hasMedia && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 100%)',
          zIndex: 1,
        }} />
      )}

      {/* YouTube / Vimeo iframe */}
      {isEmbeddable && playing && (
        <div style={{ position: 'absolute', inset: 0, right: isExpanded ? CONTENT_PANEL_W : 0, zIndex: 5 }}>
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
            left: isExpanded ? '25%' : '50%',
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
            right: isExpanded ? `${CONTENT_PANEL_W + 20}px` : '20px',
            ...(isExpanded
              ? { top: '50%', transform: 'translateY(-50%)' }
              : {
                  bottom: '40px',
                  transform: isHovered ? 'translateY(-60px)' : 'translateY(0)',
                }
            ),
            zIndex: 2,
            transition: 'transform 0.4s ease, right 0.45s cubic-bezier(0.4, 0, 0.2, 1), top 0.4s ease',
          }}
        >
          <h2 style={{
            fontFamily: "'Instrument Serif', serif",
            fontStyle: 'italic',
            fontSize: isExpanded ? '38px' : '30px',
            lineHeight: 1.1,
            margin: 0,
            color: hasMedia ? '#ffffff' : '#2C97BE',
            transition: 'font-size 0.4s ease',
          }}>
            {panel.category}
          </h2>

          {panel.description && (
            <p style={{
              position: 'absolute',
              top: 'calc(100% + 12px)',
              left: 0,
              right: 0,
              margin: 0,
              fontSize: '12px',
              lineHeight: 1.5,
              opacity: isHovered && !isExpanded ? 1 : 0,
              transition: 'opacity 0.3s ease 0.15s',
              color: hasMedia ? 'rgba(255,255,255,0.9)' : '#475569',
            }}>
              {panel.description}
            </p>
          )}
        </div>
      )}

      {/* Expanded right panel */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: CONTENT_PANEL_W,
        height: '100%',
        background: 'rgba(10, 15, 25, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 4,
        display: 'flex',
        flexDirection: 'column',
        opacity: isExpanded ? 1 : 0,
        pointerEvents: isExpanded ? 'auto' : 'none',
        transition: 'opacity 0.3s ease 0.2s',
      }}>
        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.8)' }} />
        </button>

        {/* Find Out More button */}
        {panel.link && (
          <a
            href={panel.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: '28px',
              left: '24px',
              right: '24px',
              zIndex: 6,
              display: 'block',
              textAlign: 'center',
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              letterSpacing: '0.04em',
              textDecoration: 'none',
              backdropFilter: 'blur(8px)',
              transition: 'background 0.2s ease, border-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.22)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
            }}
          >
            Find Out More
          </a>
        )}

        {/* Scrollable content */}
        <div
          className="mosaic-content"
          style={{
            position: 'absolute',
            bottom: panel.link ? '80px' : '0px',
            left: 0,
            right: 0,
            maxHeight: panel.link ? 'calc(100% - 130px)' : 'calc(100% - 50px)',
            overflowY: 'auto',
            padding: '24px 24px 16px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.15) transparent',
          }}
          dangerouslySetInnerHTML={{ __html: panel.content }}
        />
      </div>
    </div>
  )
}

// ─── Mosaic grid ──────────────────────────────────────────────────────────────

export default function Mosaic({ panels }) {
  const containerRef = useRef(null)
  const [containerW, setContainerW] = useState(1216)
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [expandedIdx, setExpandedIdx] = useState(null)

  // Measure inner container width for precise card sizing
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => setContainerW(entry.contentRect.width))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  if (!panels.length) return null

  const row1 = panels.slice(0, 2)
  const row2 = panels.slice(2, 5)

  const normalW = Math.floor((containerW - GAP * 2) / 3)

  // Width for a card given its global index
  const getCardW = (idx) => {
    if (expandedIdx === null) return normalW

    const inRow1 = idx < 2
    const expandedInRow1 = expandedIdx < 2
    const expandedInRow2 = expandedIdx >= 2

    // Different row from expanded card — unchanged
    if ((inRow1 && expandedInRow2) || (!inRow1 && expandedInRow1)) return normalW

    if (idx === expandedIdx) {
      // Use the 3-card formula for both rows so expanded size is consistent
      return containerW - SHRUNK_W * 2 - GAP * 2
    }

    return SHRUNK_W
  }

  const handleClose = () => setExpandedIdx(null)

  const handleMouseEnter = (idx) => {
    setHoveredIdx(idx)
    setExpandedIdx(idx)
  }

  const renderCard = (panel, globalIdx) => (
    <div
      key={panel.id ?? globalIdx}
      style={{
        width: getCardW(globalIdx),
        height: CARD_H,
        flexShrink: 0,
        transition: 'width 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        zIndex: expandedIdx === globalIdx ? 10 : 1,
      }}
      onMouseEnter={() => handleMouseEnter(globalIdx)}
      onMouseLeave={() => { setHoveredIdx(null); handleClose() }}
    >
      <MosaicPanel
        panel={panel}
        isHovered={hoveredIdx === globalIdx}
        isExpanded={expandedIdx === globalIdx}
        onExpand={() => {}}
        onClose={handleClose}
      />
    </div>
  )

  // Row 1 justify: center when collapsed, flex-start when expanded (to keep layout stable)
  const row1Justify = expandedIdx !== null && expandedIdx < 2 ? 'flex-start' : 'center'

  return (
    <div style={{ width: '100%', maxWidth: 1340, margin: '0 auto', padding: '24px 32px', boxSizing: 'border-box' }}>
      <style>{PROSE_CSS}</style>

      <div ref={containerRef}>
        {/* Row 1 — 2 cards, centered when not expanded */}
        <div style={{ display: 'flex', gap: GAP, marginBottom: GAP, justifyContent: row1Justify, marginLeft: 100 }}>
          {row1.map((panel, idx) => renderCard(panel, idx))}
        </div>

        {/* Row 2 — 3 cards */}
        {row2.length > 0 && (
          <div style={{ display: 'flex', gap: GAP }}>
            {row2.map((panel, idx) => renderCard(panel, idx + 2))}
          </div>
        )}
      </div>
    </div>
  )
}
