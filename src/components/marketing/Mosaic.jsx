import { useState, useRef, useEffect } from 'react'

const CARD_H = 380
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
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .mosaic-content p { margin: 0 0 12px; font-family: 'Montserrat', sans-serif; font-size: 15px; font-weight: 300; line-height: 1.5em; color: rgba(0,0,0,0.8); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  .mosaic-content p:last-child { margin-bottom: 0; }
  .mosaic-content h2, .mosaic-content h3 { font-family: 'Instrument Serif', serif; font-style: italic; color: #000; margin: 0 0 8px; line-height: 1.2; }
  .mosaic-content h2 { font-size: 20px; }
  .mosaic-content h3 { font-size: 16px; }
  .mosaic-content ul, .mosaic-content ol { margin: 0 0 12px; padding-left: 18px; }
  .mosaic-content li { font-family: 'Montserrat', sans-serif; font-size: 15px; font-weight: 300; line-height: 1.5em; color: rgba(0,0,0,0.8); margin-bottom: 4px; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  .mosaic-content strong { color: #000; font-weight: 600; }
  .mosaic-content a { color: #2C97BE; text-decoration: underline; }
`

// ─── Card ─────────────────────────────────────────────────────────────────────

function MosaicCard({ panel, isHovered, isExpanded }) {
  const videoType = getVideoType(panel.videoUrl)
  const hasMedia = !!(panel.image || panel.videoUrl)
  const isMp4 = videoType === 'mp4'

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.2)',
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
        ...(panel.image && !isMp4 && {
          backgroundImage: `url(${panel.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }),
      }}
    >
      {isMp4 && (
        <video
          autoPlay muted loop playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        >
          <source src={panel.videoUrl} type="video/mp4" />
        </video>
      )}

      {hasMedia && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 100%)',
          zIndex: 1,
        }} />
      )}

      {/* Title + description */}
      <div style={{
        position: 'absolute',
        left: isExpanded ? 0 : '20px',
        right: isExpanded ? 0 : '20px',
        bottom: '40px',
        zIndex: 2,
        textAlign: isExpanded ? 'center' : 'left',
        transition: 'left 0.45s cubic-bezier(0.4, 0, 0.2, 1), right 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <h2 style={{
          fontFamily: "'Instrument Serif', serif",
          fontStyle: 'italic',
          fontSize: isExpanded ? '60px' : '42px',
          lineHeight: 1.1,
          margin: 0,
          color: hasMedia ? '#ffffff' : '#2C97BE',
          transition: 'font-size 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          {panel.category}
        </h2>

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

function MosaicContentPanel({ panel }) {
  return (
    <div style={{
      borderRadius: '16px',
      background: 'rgba(255,255,255,0.45)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.2)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      padding: '28px 40px 32px',
      position: 'relative',
      animation: 'mosaicFadeDown 0.35s ease',
    }}>

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
  const [containerW, setContainerW] = useState(1276)
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [expandedIdx, setExpandedIdx] = useState(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => setContainerW(entry.contentRect.width))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  if (!panels.length) return null

  const cards = panels.slice(0, 3)
  const normalW = Math.floor((containerW - GAP * 2) / 3)
  const expandedW = containerW - SHRUNK_W * 2 - GAP * 2

  const getCardW = (idx) => {
    if (expandedIdx === null) return normalW
    if (idx === expandedIdx) return expandedW
    return SHRUNK_W
  }

  // Center content panel under the expanded card
  const contentPanelW = normalW + 100
  const contentPanelLeft = expandedIdx !== null
    ? expandedIdx * (SHRUNK_W + GAP) + (expandedW - contentPanelW) / 2
    : 0

  return (
    <div style={{ width: '100%', maxWidth: 1340, margin: '0 auto', padding: '24px 32px', boxSizing: 'border-box' }}>
      <style>{PROSE_CSS}</style>

      <div
        ref={containerRef}
        onMouseLeave={() => { setExpandedIdx(null); setHoveredIdx(null) }}
      >
        {/* Card row */}
        <div style={{ display: 'flex', gap: GAP }}>
          {cards.map((panel, idx) => (
            <div
              key={panel.id ?? idx}
              style={{
                width: getCardW(idx),
                height: CARD_H,
                flexShrink: 0,
                position: 'relative',
                zIndex: expandedIdx === idx ? 2 : 1,
                transition: 'width 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={() => { setHoveredIdx(idx); setExpandedIdx(idx) }}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <MosaicCard
                panel={panel}
                isHovered={hoveredIdx === idx}
                isExpanded={expandedIdx === idx}
              />
            </div>
          ))}
        </div>

        {/* Content panel below — width matches original card, aligned to card's left edge */}
        {expandedIdx !== null && panels[expandedIdx] && (
          <div style={{
            marginTop: GAP,
            marginLeft: contentPanelLeft,
            width: contentPanelW,
          }}>
            <MosaicContentPanel
              key={expandedIdx}
              panel={panels[expandedIdx]}
            />
          </div>
        )}
      </div>
    </div>
  )
}
