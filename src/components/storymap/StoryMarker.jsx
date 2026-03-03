import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Global event name for coordinating single-open state across all StoryMarker instances
const MARKER_OPEN_EVENT = 'storylines:marker-open';

export default function StoryMarker({
  storyProps,
  publicationDate,
  onMouseEnter,
  onMouseLeave,
  onClick
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [portalContainer, setPortalContainer] = useState(null);
  const markerRef = useRef(null);
  const [markerPosition, setMarkerPosition] = useState({ top: 0, left: 0 });
  const markerIdRef = useRef(`sm-${storyProps.id}`);
  const hoverTimerRef = useRef(null);
  const isHoveredRef = useRef(false);

  // Keep ref in sync for use inside event listeners (avoids stale closure)
  useEffect(() => { isHoveredRef.current = isHovered; }, [isHovered]);

  useEffect(() => {
    let container = document.getElementById('story-marker-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'story-marker-portal';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '10000';
      document.body.appendChild(container);
    }
    setPortalContainer(container);

    // Close this marker when any OTHER marker opens
    const handleOtherOpen = (e) => {
      if (e.detail.id !== markerIdRef.current && isHoveredRef.current) {
        setIsHovered(false);
        onMouseLeave();
      }
    };
    window.addEventListener(MARKER_OPEN_EVENT, handleOtherOpen);
    return () => window.removeEventListener(MARKER_OPEN_EVENT, handleOtherOpen);
  }, []);

  const handleMouseEnter = () => {
    // Small delay — prevents accidental opens when passing through en route to another card
    hoverTimerRef.current = setTimeout(() => {
      if (markerRef.current) {
        const rect = markerRef.current.getBoundingClientRect();
        setMarkerPosition({ top: rect.top, left: rect.left });
      }
      // Notify all other markers to close
      window.dispatchEvent(new CustomEvent(MARKER_OPEN_EVENT, { detail: { id: markerIdRef.current } }));
      setIsHovered(true);
      onMouseEnter();
    }, 220);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsHovered(false);
    onMouseLeave();
  };

  // On click: snapshot the expanded card as a raw DOM clone so it survives
  // React unmounting during navigation. Clone stays visible for 5s (long enough
  // to remain open while the destination story's hero loads), then fades out.
  const handleClick = () => {
    if (isHovered) {
      const portalEl = document.getElementById('story-marker-portal');
      const expandedCard = portalEl?.firstChild;
      if (expandedCard) {
        const clone = expandedCard.cloneNode(true);
        clone.style.pointerEvents = 'none';
        clone.style.transition = 'none';
        document.body.appendChild(clone);

        setTimeout(() => {
          clone.style.transition = 'opacity 0.8s ease-in-out';
          clone.style.opacity = '0';
          setTimeout(() => clone.remove(), 800);
        }, 5000);
      }
    }
    onClick();
  };

  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <>
      {/* Base marker - visible when not hovered */}
      <motion.div
        ref={markerRef}
        className="story-marker"
        style={{
          width: 'max-content',
          maxWidth: '380px',
          borderRadius: '10px',
          backgroundColor: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          transform: 'translate(-50%, -50%)',
          transformOrigin: 'top center',
          position: 'relative',
          overflow: 'hidden',
          opacity: isHovered ? 0 : 1
        }}
        animate={{ height: '40px' }}
        transition={{ opacity: { duration: 0.2 } }}
        onMouseEnter={handleMouseEnter}
        onClick={handleClick}
      >
        <div style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
          {/* Thumbnail */}
          <div style={{ width: '40px', height: '40px', flexShrink: 0, overflow: 'hidden' }}>
            {storyProps.hero_image && (
              <img
                src={storyProps.hero_image}
                alt={storyProps.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
          </div>

          {/* Title — nowrap so card grows to fit, capped by maxWidth */}
          <div
            className="text-xs sm:text-sm"
            style={{
              paddingLeft: '12px',
              paddingRight: '14px',
              color: '#1e293b',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              fontFamily: 'Raleway, sans-serif',
            }}
          >
            {storyProps.title}
          </div>
        </div>
      </motion.div>

      {/* Expanded marker via portal */}
      {portalContainer && createPortal(
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, height: '40px' }}
              animate={{ opacity: 1, height: '240px' }}
              exit={{ opacity: 0, height: '40px' }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              style={{
                position: 'fixed',
                top: markerPosition.top,
                left: markerPosition.left,
                transform: 'translate(-50%, -50%)',
                width: '240px',
                borderRadius: '10px',
                backgroundColor: 'white',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                cursor: 'pointer',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                pointerEvents: 'auto'
              }}
              onMouseLeave={handleMouseLeave}
              onClick={handleClick}
            >
          {/* Thumbnail */}
          <motion.div
            initial={{ height: '40px' }}
            animate={{ height: '80px' }}
            transition={{ duration: 1, ease: "easeInOut" }}
            style={{
              width: '240px',
              flexShrink: 0,
              overflow: 'hidden'
            }}
          >
            {storyProps.hero_image && (
              <img 
                src={storyProps.hero_image} 
                alt={storyProps.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            )}
          </motion.div>

          {/* Title */}
          <motion.div
            className="text-sm sm:text-base md:text-lg"
            initial={{ fontWeight: 500, paddingLeft: '15px', paddingTop: '0' }}
            animate={{ fontWeight: 700, paddingLeft: '12px', paddingTop: '12px' }}
            transition={{ duration: 1, ease: "easeInOut" }}
            style={{
              color: '#1e293b',
              fontFamily: 'Raleway, sans-serif',
              lineHeight: 1.2,
              paddingRight: '12px',
              paddingBottom: '8px'
            }}
          >
            {storyProps.title}
          </motion.div>

          {/* Expanded content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              width: '100%',
              padding: '0 12px 12px 12px',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Raleway, sans-serif',
              flex: 1
            }}
          >
            {publicationDate && (
              <p 
                className="text-[10px] sm:text-xs"
                style={{
                color: '#94a3b8',
                margin: '0 0 8px 0'
              }}>
                {publicationDate}
              </p>
            )}

            {storyProps.subtitle && (
              <p 
                className="text-xs sm:text-sm"
                style={{
                color: '#64748b',
                margin: '0 0 8px 0',
                lineHeight: 1.4,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>
                {stripHtml(storyProps.subtitle)}
              </p>
            )}

            <div 
              className="text-xs sm:text-sm"
              style={{
              display: 'inline-block',
              padding: '6px 14px',
              background: '#d97706',
              color: 'white',
              borderRadius: '6px',
              fontWeight: 500,
              marginTop: 'auto',
              width: 'fit-content'
            }}>
              View Story →
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        portalContainer
      )}
    </>
  );
}