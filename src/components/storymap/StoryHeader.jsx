import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function StoryHeader({ title, subtitle, author, heroImage, heroVideo, heroType, onExplore, onWhatIsStorylines }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative">
            {/* Hero Video or Image or Gradient Background */}
            {heroType === 'video' && heroVideo ?
      <video
        src={heroVideo}
        className="absolute inset-0 w-full h-full object-cover -z-10"
        autoPlay
        muted
        loop
        playsInline /> :

      heroImage ?
      <img
        src={heroImage}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover z-0" /> :

      null}
            <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/5 z-[1]" />
            
            <motion.div
        className="absolute left-[15%] z-[2] px-6 max-w-3xl pointer-events-auto"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3 }}>

                {/* Decorative line */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-px bg-white/40" />
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <div className="w-12 h-px bg-white/40" />
                </div>
                
                {/* Title */}
                <h1 className="text-white mb-6 text-4xl font-light text-left tracking-tight leading-tight md:text-6xl lg:text-7xl">
                    {title}
                </h1>
                
                {/* Subtitle */}
                <p className="text-white/80 mx-auto my-1 px-1 text-2xl font-light text-left max-w-xl">
                    {subtitle}
                </p>
                
                {/* Author */}
                {author &&
        <p className="text-sm text-white/60 tracking-widest uppercase">
                        By {author}
                    </p>
        }
                
                {/* Buttons */}
                <div className="flex flex-col" style={{ marginTop: '62px', gap: '50px' }}>
                    <motion.button
                        onClick={onWhatIsStorylines}
                        className="cursor-pointer relative z-[95]"
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
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <div className="flex items-center justify-center gap-2 bg-white text-slate-800 px-6 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow w-[240px]">
                            <span>Explore the story</span>
                            <ChevronDown className="w-5 h-5" />
                        </div>
                    </motion.button>
                </div>
            </motion.div>
        </div>);

}