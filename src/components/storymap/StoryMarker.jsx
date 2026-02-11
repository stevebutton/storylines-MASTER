import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

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
  }, []);

  const handleMouseEnter = () => {
    if (markerRef.current) {
      const rect = markerRef.current.getBoundingClientRect();
      setMarkerPosition({ top: rect.top, left: rect.left });
    }
    setIsHovered(true);
    onMouseEnter();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onMouseLeave();
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
          width: '240px',
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
        animate={{ 
          height: '40px'
        }}
        transition={{ 
          opacity: { duration: 0.2 }
        }}
        onMouseEnter={handleMouseEnter}
        onClick={onClick}
      >
        <div style={{ display: 'flex', width: '100%', height: '40px' }}>
          {/* Thumbnail */}
          <div style={{
            width: '40px',
            height: '40px',
            flexShrink: 0,
            overflow: 'hidden'
          }}>
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
          </div>

          {/* Title */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '15px',
            color: '#1e293b',
            fontSize: '0.875rem',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'Raleway, sans-serif',
            flex: 1
          }}>
            {storyProps.title}
          </div>
        </div>
      </motion.div>

      {/* Expanded marker via portal */}
      {isHovered && portalContainer && createPortal(
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            position: 'fixed',
            top: markerPosition.top,
            left: markerPosition.left,
            transform: 'translate(-50%, -50%)',
            width: '240px',
            height: '240px',
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
          onClick={onClick}
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
            initial={{ fontSize: '0.875rem', fontWeight: 500, paddingLeft: '15px', paddingTop: '0' }}
            animate={{ fontSize: '1.125rem', fontWeight: 700, paddingLeft: '12px', paddingTop: '12px' }}
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
              <p style={{
                fontSize: '11px',
                color: '#94a3b8',
                margin: '0 0 8px 0'
              }}>
                {publicationDate}
              </p>
            )}

            {storyProps.subtitle && (
              <p style={{
                fontSize: '12px',
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

            <div style={{
              display: 'inline-block',
              padding: '6px 14px',
              background: '#d97706',
              color: 'white',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              marginTop: 'auto',
              width: 'fit-content'
            }}>
              View Story →
            </div>
          </motion.div>
        </motion.div>,
        portalContainer
      )}
    </>
  );
}