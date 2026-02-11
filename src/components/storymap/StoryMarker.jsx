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
    <motion.div
      className="story-marker"
      style={{
        width: '240px',
        borderRadius: '10px',
        backgroundColor: 'white',
        boxShadow: isHovered ? '0 8px 24px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        transform: 'translate(-50%, -50%)',
        transformOrigin: 'top center',
        position: 'relative',
        overflow: 'hidden'
      }}
      animate={{ 
        height: isHovered ? '240px' : '40px',
        zIndex: isHovered ? 1000 : 1
      }}
      transition={{ 
        height: { duration: 1, ease: "easeInOut" },
        zIndex: { duration: 0 }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Top row container */}
      <motion.div
        animate={{
          flexDirection: isHovered ? 'column' : 'row'
        }}
        transition={{ duration: 1, ease: "easeInOut" }}
        style={{
          display: 'flex',
          width: '100%',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Thumbnail */}
        <motion.div
          animate={{
            width: isHovered ? '240px' : '40px',
            height: isHovered ? '80px' : '40px'
          }}
          transition={{ duration: 1, ease: "easeInOut" }}
          style={{
            flexShrink: 0,
            overflow: 'hidden',
            position: 'relative'
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
          animate={{
            paddingLeft: isHovered ? '12px' : '15px',
            paddingRight: isHovered ? '12px' : '0',
            paddingTop: isHovered ? '12px' : '0',
            paddingBottom: isHovered ? '8px' : '0',
            fontSize: isHovered ? '1.125rem' : '0.875rem',
            fontWeight: isHovered ? 700 : 500,
            width: isHovered ? '240px' : '200px',
            height: isHovered ? 'auto' : '40px',
            whiteSpace: isHovered ? 'normal' : 'nowrap'
          }}
          transition={{ duration: 1, ease: "easeInOut" }}
          style={{
            display: 'flex',
            alignItems: isHovered ? 'flex-start' : 'center',
            color: '#1e293b',
            overflow: 'hidden',
            textOverflow: isHovered ? 'clip' : 'ellipsis',
            fontFamily: 'Raleway, sans-serif',
            lineHeight: 1.2
          }}
        >
          {storyProps.title}
        </motion.div>
      </motion.div>

      {/* Expanded content */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
                {storyProps.subtitle}
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
        )}
      </AnimatePresence>
    </motion.div>
  );
}