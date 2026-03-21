import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const THEME_FONTS = {
    c: 'Righteous, cursive',
    f: 'Oswald, sans-serif',
    k: 'Oswald, sans-serif',
};

export default function StoryHeader({ title, subtitle, tagline, titleImage, subtitleImage, heroImage, heroVideo, heroType, heroVideoLoop = true, onExplore, onWhatIsStorylines, onHeroLoaded, mapStyle = 'a', heroCta = null }) {
    const themeFont = THEME_FONTS[mapStyle] || 'Raleway, sans-serif';
  const [mediaLoaded, setMediaLoaded] = useState(false);

  // When hero props change (including on SPA story switches where this component
  // stays mounted), reset mediaLoaded so the content panel unmounts and its
  // Framer Motion animations replay from scratch for the incoming story.
  // For no-hero stories, immediately re-set to true and fire onHeroLoaded.
  React.useEffect(() => {
    setMediaLoaded(false);
    const willRenderVideo = heroType === 'video' && !!heroVideo;
    const willRenderImage = !willRenderVideo && !!heroImage;
    if (!willRenderVideo && !willRenderImage) {
      setMediaLoaded(true);
      if (onHeroLoaded) onHeroLoaded();
      return;
    }
    // Cached images fire onLoad before React attaches the handler.
    // Check completion immediately so the content panel always mounts.
    if (willRenderImage) {
      const img = new window.Image();
      img.src = heroImage;
      if (img.complete && img.naturalWidth > 0) {
        setMediaLoaded(true);
        if (onHeroLoaded) onHeroLoaded();
      }
    }
  }, [heroImage, heroVideo, heroType]); // eslint-disable-line react-hooks/exhaustive-deps

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
          key={heroVideo}
          src={heroVideo}
          className="absolute inset-0 w-full h-full object-cover z-0"
          autoPlay
          muted
          loop={heroVideoLoop}
          playsInline
          onLoadedData={handleMediaLoad}
          onError={handleMediaLoad}
          initial={{ scale: 1.25, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            scale: { duration: 5, ease: "easeOut", delay: 1 },
            opacity: { duration: 1.5, ease: "easeOut", delay: 1 }
          }}
        />
      ) : heroImage ? (
        <motion.img
          key={heroImage}
          src={heroImage}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover z-0"
          onLoad={handleMediaLoad}
          onError={handleMediaLoad}
          initial={{ scale: 1.25, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            scale: { duration: 5, ease: "easeOut", delay: 1 },
            opacity: { duration: 1.5, ease: "easeOut", delay: 1 }
          }}
        />
      ) : null}

      {/* Subtle overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10 z-[1]" />

      {mediaLoaded && (
        <motion.div
          className="relative z-[95] mx-auto mt-[60px] w-[500px] max-w-[90vw] min-h-[600px] flex flex-col items-center justify-between px-8 py-12 bg-black/25 backdrop-blur-lg"
          data-name="content-panel"
          initial={{ translateY: '-100%', opacity: 0 }}
          animate={{ translateY: '0', opacity: 1 }}
          transition={{ duration: 3, ease: [0.42, 0, 1, 1], delay: 3 }}
        >
          {/* Pin Icon */}
          <motion.img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/a25d3bb0b_PinIcon.png"
            alt="Pin Icon"
            className="w-[87px] h-[75px]"
            data-name="pin-icon"
            initial={{ translateY: '-50px', opacity: 0 }}
            animate={{ translateY: '0', opacity: 1 }}
            transition={{ duration: 2, delay: 7 }}
          />

          {/* Title and Description Container */}
          <div className="flex flex-col items-center" style={{ gap: '30px' }}>
            {/* Tagline — e.g. "a Storylines series" */}
            {tagline && (
              <motion.div
                className="text-center"
                style={{ fontFamily: 'Raleway, sans-serif', fontSize: '1.25rem', fontWeight: 400, letterSpacing: '0.06em', color: 'rgba(245,158,11,0.95)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, delay: 6 }}
                dangerouslySetInnerHTML={{ __html: tagline }}
              />
            )}

            {/* Story Title */}
            <motion.h1
              className="text-white text-6xl font-light text-center"
              style={{ fontFamily: themeFont, fontWeight: 300, lineHeight: '0.95' }}
              data-name="story-title"
              initial={{ translateX: '100px', opacity: 0 }}
              animate={{ translateX: '0', opacity: 1 }}
              transition={{ duration: 2, delay: 6 }}
            >
              {title}
            </motion.h1>

            {/* Description */}
            <motion.div
              className="text-white font-light text-center leading-snug max-w-md"
              style={{ fontFamily: themeFont, fontWeight: 300, fontSize: '1.5rem' }}
              data-name="story-description"
              initial={{ translateY: '100px', opacity: 0 }}
              animate={{ translateY: '0', opacity: 1 }}
              transition={{ duration: 1, delay: 6 }}
              dangerouslySetInnerHTML={{ __html: subtitle }}
            />
          </div>

          {/* Bottom row: scroll arrow + optional secondary CTA */}
          <div className={`flex items-center w-full mt-6 ${heroCta?.url ? 'justify-between' : 'justify-center'}`}>
            <motion.button
              onClick={onExplore}
              className="cursor-pointer pointer-events-auto"
              data-name="scroll-arrow"
              initial={{ translateY: '50px', opacity: 0 }}
              animate={{ translateY: '0', opacity: 1 }}
              transition={{ duration: 2, delay: 7 }}
              whileHover={{
                scale: 1.1,
                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))',
                transition: { duration: 0.2, ease: 'easeInOut' }
              }}
            >
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/a1c59b412_scrolldown-arrow.png"
                alt="Scroll down"
                width="74"
                height="50"
              />
            </motion.button>

            {heroCta?.url && (
              <motion.button
                onClick={() => { window.location.href = heroCta.url; }}
                className="cursor-pointer pointer-events-auto border border-white/50 text-white/80 hover:text-white hover:bg-white/10 px-5 py-2 text-xs uppercase tracking-widest transition-colors"
                style={{ fontFamily: 'Raleway, sans-serif' }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 2, delay: 7 }}
              >
                {heroCta.label || 'Skip'}
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}