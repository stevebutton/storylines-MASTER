import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function StoryHeader({ title, subtitle, titleImage, subtitleImage, heroImage, heroVideo, heroType, onExplore, onWhatIsStorylines, onHeroLoaded }) {
  const [mediaLoaded, setMediaLoaded] = useState(false);

  // Call onHeroLoaded immediately if no hero media
  React.useEffect(() => {
    if (!heroImage && !heroVideo && onHeroLoaded) {
      setMediaLoaded(true);
      onHeroLoaded();
    }
  }, []);

  const handleMediaLoad = () => {
    setMediaLoaded(true);
    if (onHeroLoaded) {
      onHeroLoaded();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative" data-name="story-header-container">
      {/* Hero Video or Image Background */}
      {heroType === 'video' && heroVideo ? (
        <motion.video
          src={heroVideo}
          className="absolute inset-0 w-full h-full object-cover z-0"
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={handleMediaLoad}
          initial={{ scale: 1.25, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 3, ease: "easeOut" }}
        />
      ) : heroImage ? (
        <motion.img
          src={heroImage}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover z-0"
          onLoad={handleMediaLoad}
          initial={{ scale: 1.25, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 3, ease: "easeOut" }}
        />
      ) : null}

      {/* Subtle overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10 z-[1]" />

      {mediaLoaded && (
        <motion.div
          className="relative z-[95] mx-auto mt-[60px] w-[500px] max-w-[90vw] min-h-[600px] flex flex-col items-center justify-between px-8 py-12"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}
          data-name="content-panel"
          initial={{ translateY: '-100%', opacity: 0 }}
          animate={{ translateY: '0', opacity: 1 }}
          transition={{ duration: 3, ease: [0.42, 0, 1, 1], delay: 5 }}
        >
          {/* Pin Icon */}
          <motion.img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/a25d3bb0b_PinIcon.png"
            alt="Pin Icon"
            className="w-[87px] h-[75px]"
            data-name="pin-icon"
            initial={{ translateY: '-50px', opacity: 0 }}
            animate={{ translateY: '0', opacity: 1 }}
            transition={{ duration: 2, delay: 9 }}
          />

          {/* Title and Description Container */}
          <div className="flex flex-col items-center" style={{ gap: '30px' }}>
            {/* Story Title */}
            <motion.h1
              className="text-white text-6xl font-light text-center leading-none"
              style={{ fontFamily: 'Raleway, sans-serif', fontWeight: 300 }}
              data-name="story-title"
              initial={{ translateX: '100px', opacity: 0 }}
              animate={{ translateX: '0', opacity: 1 }}
              transition={{ duration: 2, delay: 8 }}
            >
              {title}
            </motion.h1>

            {/* Description */}
            <motion.p
              className="text-white text-xl font-light text-center leading-snug max-w-md"
              style={{ fontFamily: 'Raleway, sans-serif', fontWeight: 300 }}
              data-name="story-description"
              initial={{ translateY: '100px', opacity: 0 }}
              animate={{ translateY: '0', opacity: 1 }}
              transition={{ duration: 1, delay: 8 }}
            >
              {subtitle}
            </motion.p>
          </div>

          {/* Scroll Arrow */}
          <motion.button
            onClick={onExplore}
            className="w-[75px] h-[75px] rounded-full border-2 border-white flex items-center justify-center text-white cursor-pointer pointer-events-auto"
            data-name="scroll-arrow"
            initial={{ translateY: '50px', opacity: 0 }}
            animate={{ translateY: '0', opacity: 1 }}
            transition={{ duration: 2, delay: 9 }}
            whileHover={{ 
              scale: 1.1,
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))',
              transition: { duration: 0.2, ease: 'easeInOut' }
            }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}