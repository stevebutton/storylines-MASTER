import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const STORYLINES_CONTENT = [
  {
    image: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800&q=80',
    title: 'Welcome to Storylines',
    description: 'Storylines is a platform for creating immersive, location-based narratives that bring stories to life through interactive maps and rich media.'
  },
  {
    image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80',
    title: 'Create Your Journey',
    description: 'Build captivating stories by combining stunning visuals with geographic locations. Guide your audience through chapters that unfold across the map.'
  },
  {
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
    title: 'Share Your Story',
    description: 'Publish your stories and let your audience explore them in an engaging, interactive format. Perfect for travel logs, historical narratives, or educational content.'
  }
];

export default function WhatIsStorylinesPanel({ isOpen, onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % STORYLINES_CONTENT.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + STORYLINES_CONTENT.length) % STORYLINES_CONTENT.length);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 z-[80]"
            onClick={onClose}
          />

          {/* Sliding Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full md:w-[500px] z-[90] flex items-center justify-center"
          >
            <div className="relative h-full w-full flex items-center justify-center p-8">
              {/* Card Container */}
              <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full">
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all"
                >
                  <X className="w-5 h-5 text-slate-800" />
                </button>

                {/* Slide Content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Image */}
                    <div className="relative h-64 w-full">
                      <img
                        src={STORYLINES_CONTENT[currentSlide].image}
                        alt={STORYLINES_CONTENT[currentSlide].title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>

                    {/* Text Content */}
                    <div className="p-8">
                      <h3 className="text-2xl font-semibold text-slate-900 mb-4">
                        {STORYLINES_CONTENT[currentSlide].title}
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        {STORYLINES_CONTENT[currentSlide].description}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Navigation Controls */}
                {STORYLINES_CONTENT.length > 1 && (
                  <div className="px-8 pb-8 flex items-center justify-between">
                    <button
                      onClick={prevSlide}
                      className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                      disabled={currentSlide === 0}
                    >
                      <ChevronLeft className="w-5 h-5 text-slate-700" />
                    </button>

                    {/* Dots Indicator */}
                    <div className="flex gap-2">
                      {STORYLINES_CONTENT.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentSlide(index)}
                          className={`h-2 rounded-full transition-all ${
                            index === currentSlide
                              ? 'w-8 bg-amber-600'
                              : 'w-2 bg-slate-300 hover:bg-slate-400'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={nextSlide}
                      className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                      disabled={currentSlide === STORYLINES_CONTENT.length - 1}
                    >
                      <ChevronRight className="w-5 h-5 text-slate-700" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}