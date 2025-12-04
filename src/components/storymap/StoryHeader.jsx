import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function StoryHeader({ title, subtitle, author, onExplore }) {
    return (
        <div className="min-h-screen flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/40 z-10" />
            
            <motion.div 
                className="relative z-20 text-center px-6 max-w-3xl pointer-events-auto"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3 }}
            >
                {/* Decorative line */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    <div className="w-12 h-px bg-white/40" />
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <div className="w-12 h-px bg-white/40" />
                </div>
                
                {/* Title */}
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-light text-white mb-6 leading-tight tracking-tight">
                    {title}
                </h1>
                
                {/* Subtitle */}
                <p className="text-lg md:text-xl text-white/80 font-light max-w-xl mx-auto mb-8">
                    {subtitle}
                </p>
                
                {/* Author */}
                {author && (
                    <p className="text-sm text-white/60 tracking-widest uppercase">
                        By {author}
                    </p>
                )}
                
                {/* Explore button */}
                <motion.button 
                    onClick={onExplore}
                    className="absolute bottom-12 left-1/2 -translate-x-1/2 cursor-pointer group"
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <div className="flex flex-col items-center gap-3 text-white/80 group-hover:text-white transition-colors">
                        <span className="text-sm tracking-widest uppercase font-medium">Explore the story</span>
                        <div className="w-10 h-10 rounded-full border-2 border-white/60 group-hover:border-white flex items-center justify-center transition-colors">
                            <ChevronDown className="w-5 h-5" />
                        </div>
                    </div>
                </motion.button>
            </motion.div>
        </div>
    );
}