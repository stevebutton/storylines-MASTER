import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StoryMarker({ 
  storyProps, 
  publicationDate,
  onMouseEnter, 
  onMouseLeave, 
  onClick 
}) {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    onMouseEnter();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onMouseLeave();
  };

  return (
    <motion.div
      className="story-marker"
      style={{
        width: '240px',
        borderRadius: '10px',
        backgroundColor: 'white',
        boxShadow: isHovered ? '0 8px 24px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: 'pointer',
        transform: 'translate(-50%, -50%)',
        transformOrigin: 'top center',
        position: 'relative'
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
      {/* Top row: thumbnail + title */}
      <div style={{
        width: '100%',
        height: '40px',
        display: 'flex',
        flexShrink: 0
      }}>
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
          width: '200px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '15px',
          fontSize: '0.875rem',
          color: '#1e293b',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontFamily: 'Raleway, sans-serif'
        }}>
          {storyProps.title}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              width: '100%',
              height: '200px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Raleway, sans-serif'
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