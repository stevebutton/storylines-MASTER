import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function StoryHeader({ title, subtitle, titleImage, subtitleImage, heroImage, heroVideo, heroType, onExplore, onWhatIsStorylines, onHeroLoaded }) {
  const [mediaLoaded, setMediaLoaded] = useState(false);

  const handleMediaLoad = () => {
    setMediaLoaded(true);
    if (onHeroLoaded) {
      onHeroLoaded();
    }
  };
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative">
            {/* Hero Video or Image or Gradient Background */}
            {heroType === 'video' && heroVideo ?
      <motion.video
        src={heroVideo}
        className="absolute inset-0 w-full h-full object-cover -z-10"
        autoPlay
        muted
        loop
        playsInline
        onLoadedData={handleMediaLoad}
        initial={{ scale: 1.25, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          scale: { duration: 3, ease: "easeOut" },
          opacity: { duration: 1, ease: "easeIn" }
        }} /> :

      heroImage ?
      <motion.img
        src={heroImage}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover z-0"
        onLoad={handleMediaLoad}
        initial={{ scale: 1.25, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          scale: { duration: 3, ease: "easeOut" },
          opacity: { duration: 1, ease: "easeIn" }
        }} /> :

      null}
            <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/5 z-[1]" />
            
            {mediaLoaded && (
                <div className="relative z-[95] px-6 pointer-events-auto flex flex-col items-center">

                            {/* Decorative line */}
                            <motion.div 
                                className="flex items-center gap-4 mb-8"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, delay: 5 }}
                            >
                                <div className="w-12 h-px bg-white/40" />
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <div className="w-12 h-px bg-white/40" />
                            </motion.div>

                            {/* Title */}
                            {titleImage ? (
                                <motion.img 
                                    src={titleImage} 
                                    alt={title} 
                                    style={{ width: '430px', height: '87px' }} 
                                    className="mb-6 object-contain"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1, delay: 2 }}
                                />
                            ) : (
                                <motion.h1 
                                    className="text-white mb-6 text-4xl font-light text-center tracking-tight leading-tight md:text-6xl lg:text-7xl"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1, delay: 2 }}
                                >
                                    {title}
                                </motion.h1>
                            )}

                            {/* Subtitle */}
                            {subtitleImage ? (
                                <motion.img 
                                    src={subtitleImage} 
                                    alt={subtitle} 
                                    style={{ width: '424px', height: '27px' }} 
                                    className="mb-6 object-contain"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1, delay: 4 }}
                                />
                            ) : (
                                <motion.p 
                                    className="text-white/80 mx-auto my-1 px-1 text-2xl font-light text-center max-w-xl"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1, delay: 4 }}
                                >
                                    {subtitle}
                                </motion.p>
                            )}

                            {/* Buttons */}
                            <div className="flex flex-col items-center" style={{ marginTop: '62px', gap: '50px' }}>
                                <motion.button
                                    onClick={onWhatIsStorylines}
                                    className="cursor-pointer relative z-[95]"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1, delay: 3 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div className="flex items-center justify-center gap-2 bg-white text-slate-800 px-6 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow w-[240px]">
                                        <span>What is Storylines</span>
                                    </div>
                                </motion.button>

                                <motion.button
                                    onClick={onExplore}
                                    className="cursor-pointer relative z-[95]"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1, delay: 7 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div className="flex items-center justify-center gap-2 bg-white text-slate-800 px-6 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow w-[240px]">
                                        <span>Explore the Stories</span>
                                        <ChevronDown className="w-5 h-5" />
                                    </div>
                                </motion.button>
                            </div>
                        </motion.div>
            )}
        </div>);

}