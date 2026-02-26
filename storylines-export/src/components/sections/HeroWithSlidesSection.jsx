import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HeroWithSlidesSection({ 
  title, 
  tagline, 
  image_url, 
  video_url,
  cta_text,
  cta_link,
  slides = []
}) {
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    if (slides.length > 0 && !selectedSlide) {
      setSelectedSlide(slides[0]);
      setCurrentSlideIndex(0);
    }
  }, [slides]);

  const nextSlide = () => {
    const nextIndex = (currentSlideIndex + 1) % slides.length;
    setCurrentSlideIndex(nextIndex);
    setSelectedSlide(slides[nextIndex]);
  };

  const prevSlide = () => {
    const prevIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
    setCurrentSlideIndex(prevIndex);
    setSelectedSlide(slides[prevIndex]);
  };

  const handleCTAClick = () => {
    if (cta_link) {
      if (cta_link.startsWith('http')) {
        window.open(cta_link, '_blank');
      } else {
        window.location.href = cta_link;
      }
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background */}
      {video_url ? (
        <video
          src={video_url}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
      ) : image_url ? (
        <img src={image_url} alt={title} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-700" />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />

      {/* Main Content - Left Side */}
      <div className="relative h-full flex items-center px-8 md:px-16 lg:px-24 z-10">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl"
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            {title}
          </h1>
          {tagline && (
            <p className="text-xl md:text-2xl text-white/90 mb-8 font-light">
              {tagline}
            </p>
          )}
          {cta_text && (
            <Button
              onClick={handleCTAClick}
              size="lg"
              className="bg-white text-slate-900 hover:bg-white/90 text-lg px-8 py-6 rounded-full shadow-xl"
            >
              {cta_text}
            </Button>
          )}
        </motion.div>
      </div>

      {/* Slides Panel - Right Side */}
      {slides.length > 0 && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="absolute right-0 top-0 h-full w-full md:w-[480px] bg-white/95 backdrop-blur-sm shadow-2xl z-20"
        >
          <div className="h-full flex flex-col">
            {/* Slide Content */}
            <div className="flex-1 overflow-y-auto p-8">
              <AnimatePresence mode="wait">
                {selectedSlide && (
                  <motion.div
                    key={selectedSlide.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {selectedSlide.image_url && (
                      <img
                        src={selectedSlide.image_url}
                        alt={selectedSlide.title}
                        className="w-full h-64 object-cover rounded-lg mb-6"
                      />
                    )}
                    <h2 className="text-3xl font-bold text-slate-900 mb-4">
                      {selectedSlide.title}
                    </h2>
                    {selectedSlide.description && (
                      <p className="text-lg text-slate-600 leading-relaxed mb-6">
                        {selectedSlide.description}
                      </p>
                    )}
                    {selectedSlide.link && (
                      <a
                        href={selectedSlide.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Learn more →
                      </a>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation Controls */}
            <div className="border-t border-slate-200 p-6 bg-white">
              <div className="flex items-center justify-between">
                <button
                  onClick={prevSlide}
                  disabled={slides.length <= 1}
                  className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-slate-700" />
                </button>

                <div className="flex items-center gap-2">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentSlideIndex(index);
                        setSelectedSlide(slides[index]);
                      }}
                      className={`h-2 rounded-full transition-all ${
                        index === currentSlideIndex
                          ? 'w-8 bg-amber-600'
                          : 'w-2 bg-slate-300 hover:bg-slate-400'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={nextSlide}
                  disabled={slides.length <= 1}
                  className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-slate-700" />
                </button>
              </div>
              <p className="text-center text-sm text-slate-500 mt-3">
                {currentSlideIndex + 1} of {slides.length}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}