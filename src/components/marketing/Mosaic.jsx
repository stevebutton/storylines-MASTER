import { useState, useRef, useEffect } from 'react'

const CARD_H = 380
const VIDEO_RATIO = 1440 / 900   // source video aspect ratio
const GAP = 24
const SHRUNK_W = 200
const MOSAIC_BG_VIDEO = 'http://storylines.flywheelsites.com/wp-content/uploads/2026/08/enthusiastic-children-running-toward-camera-at-sch-2025-12-17-11-34-08-utc_1.mp4'

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
  @keyframes mosaicFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes mosaicSlideFromRight {
    from { opacity: 0; transform: translateX(24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes mosaicSlideFromLeft {
    from { opacity: 0; transform: translateX(-24px); }
    to   { opacity: 1; transform: translateX(0); }
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
        border: isHovered ? '3px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.6)',
        boxShadow: isExpanded || isHovered
          ? '0 8px 40px rgba(0,0,0,0.3)'
          : '0 4px 24px rgba(0,0,0,0.15)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 0.3s ease, background-color 0.3s ease, border 0.3s ease',
        backgroundColor: isHovered
          ? 'rgba(255,255,255,0.2)'
          : 'rgba(255,255,255,0.1)',
      }}
    >
      {/* Background image — PNG icons sit above the gradient; cover photos sit below */}
      {panel.image && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${panel.image})`,
          backgroundSize: /\.png$/i.test(panel.image) ? 'auto' : 'cover',
          backgroundPosition: isHovered && !isExpanded ? '50% calc(50% - 50px)' : '50% 50%',
          backgroundRepeat: 'no-repeat',
          zIndex: /\.png$/i.test(panel.image) ? 3 : 0,
          opacity: /\.png$/i.test(panel.image) && isExpanded ? 0 : 1,
          transition: 'background-position 0.4s ease, opacity 0.3s ease',
        }} />
      )}

      {/* Idle / preview video — plays in closed state, fades out on expand */}
      {panel.previewVideoUrl && (
        <video
          ref={previewVideoRef}
          autoPlay muted playsInline
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            zIndex: 1,
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
            zIndex: 1,
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
          position: 'absolute', inset: 0, zIndex: 3,
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

      {/* Gradient base — tight band at bottom, always present */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,1) 100%)',
        opacity: isExpanded ? 0 : 0.5,
        transition: 'opacity 0.45s ease',
      }} />
      {/* Gradient hover boost — broader reach, fades in on hover */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, transparent 15%, rgba(0,0,0,0.85) 100%)',
        opacity: isExpanded ? 0 : isHovered ? 0.75 : 0,
        transition: 'opacity 0.45s ease',
      }} />

      {/* Title + description */}
      <div style={{
        position: 'absolute',
        left: '20px',
        right: '20px',
        bottom: '80px',
        zIndex: 4,
        textAlign: 'center',
        opacity: isExpanded ? 0 : 1,
        transition: 'opacity 0.3s ease, transform 0.4s ease',
        transform: isHovered && !isExpanded ? 'translateY(-60px)' : 'translateY(0)',
      }}>
        {!panel.previewVideoUrl && (
          <h2 style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: '42px',
            lineHeight: 1.1,
            margin: 0,
            color: '#ffffff',
          }}>
            {panel.category}
          </h2>
        )}

        {panel.description && (
          <p style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            left: 0,
            right: 0,
            margin: 0,
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '17px',
            fontWeight: 300,
            lineHeight: '1.3em',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            opacity: isHovered && !isExpanded ? 1 : 0,
            transition: 'opacity 0.3s ease 0.15s',
            color: 'rgba(255,255,255,0.9)',
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
  const outerRef = useRef(null)
  const collapseTimer = useRef(null)
  const [containerW, setContainerW] = useState(1276)
  const [outerW, setOuterW] = useState(1440)
  const [containerRelLeft, setContainerRelLeft] = useState(82)
  const [containerRelTop, setContainerRelTop] = useState(185)
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
    if (!containerRef.current || !outerRef.current) return
    const measure = () => {
      if (!outerRef.current || !containerRef.current) return
      const outerRect = outerRef.current.getBoundingClientRect()
      const containerRect = containerRef.current.getBoundingClientRect()
      setOuterW(outerRect.width)
      setContainerRelLeft(containerRect.left - outerRect.left)
      setContainerRelTop(containerRect.top - outerRect.top)
    }
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === containerRef.current) {
          setContainerW(entry.contentRect.width)
        }
      }
      measure()
    })
    ro.observe(containerRef.current)
    ro.observe(outerRef.current)
    measure()
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
    <div style={{ backgroundColor: 'white', paddingTop: 30, paddingBottom: 30, position: 'relative' }}>

    <div ref={outerRef} style={{ width: '100%', height: '750px', position: 'relative', overflow: 'visible' }}>
      <video
        autoPlay muted loop playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
      >
        <source src="http://storylines.flywheelsites.com/wp-content/uploads/2026/08/enthusiastic-children-running-toward-camera-at-sch-2025-12-17-11-34-08-utc_1.mp4" type="video/mp4" />
      </video>
      <style>{PROSE_CSS}</style>

      {/* PNG overlay — overflow:visible lets it bleed into white areas above and below */}
      <img
        src="http://storylines.flywheelsites.com/wp-content/uploads/2026/08/4paths-2.png"
        alt=""
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(calc(-50% - 20px), calc(-50% + 5px))',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Blurred hover overlay — identical source & sizing to background video,
          guaranteeing perfect registration. clip-path restricts to hovered card
          using outer-wrapper coordinates so no edge-fade issue. */}
      {inView && (() => {
        const clipPath = hoveredIdx !== null
          ? (() => {
              const cardLeft   = containerRelLeft + hoveredIdx * (normalW + GAP)
              const cardTop    = containerRelTop
              const cardRight  = outerW - cardLeft - normalW
              const cardBottom = 750 - cardTop - CARD_H
              return `inset(${cardTop}px ${cardRight}px ${cardBottom}px ${cardLeft}px round 16px)`
            })()
          : 'inset(50% 50% 50% 50%)'
        return (
          <video
            autoPlay muted loop playsInline
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(10px)',
              clipPath,
              opacity: hoveredIdx !== null ? 1 : 0,
              transition: 'opacity 0.4s ease, clip-path 0.2s ease',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <source src={MOSAIC_BG_VIDEO} type="video/mp4" />
          </video>
        )
      })()}

      <div style={{ maxWidth: 1340, margin: '0 auto', height: '100%', display: 'flex', alignItems: 'center', padding: '0 32px', boxSizing: 'border-box', position: 'relative', zIndex: 2 }}>
      <div
        ref={containerRef}
        onMouseLeave={() => { cancelCollapse(); setExpandedIdx(null); setHoveredIdx(null) }}
        style={{ width: '100%', minHeight: inView ? undefined : CARD_H, position: 'relative' }}
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
                animation: `mosaicFadeIn 1s ease ${idx + 1}s both`,
              }}
              onMouseEnter={() => { cancelCollapse(); setHoveredIdx(idx) }}
              onMouseLeave={scheduleCollapse}
              onClick={() => { cancelCollapse(); setExpandedIdx(prev => prev === idx ? null : idx) }}
            >
              {/* inner div expands and overlaps neighbours */}
              <div style={{
                position: 'absolute',
                width: expandedIdx === idx ? expandedW : normalW,
                height: expandedIdx === idx ? expandedH : CARD_H,
                left: expandedIdx === idx ? getExpandedCardLeft(idx) - idx * (normalW + GAP) : 0,
                top: expandedIdx === idx ? (CARD_H - expandedH) / 2 : 0,
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1), height 1s cubic-bezier(0.4, 0, 0.2, 1), left 1s cubic-bezier(0.4, 0, 0.2, 1), top 1s cubic-bezier(0.4, 0, 0.2, 1)',
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
              animation: `${expandedIdx < 2 ? 'mosaicSlideFromRight' : 'mosaicSlideFromLeft'} 0.6s ease 1s both`,
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
    </div>
    </div>
  )
}
