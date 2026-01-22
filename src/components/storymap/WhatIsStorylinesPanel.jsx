import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function WhatIsStorylinesPanel({ isOpen, onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState([]);

  useEffect(() => {
    loadSlides();
  }, []);

  const loadSlides = async () => {
    try {
      const slidesData = await base44.entities.StorylinesSlide.list('order');
      setSlides(slidesData);
    } catch (error) {
      console.error('Failed to load storylines slides:', error);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  if (slides.length === 0) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="fixed inset-0 bg-black/50 z-[80]"
            onClick={onClose}
          />

          {/* Sliding Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
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
                      {slides[currentSlide]?.image && (
                        <img
                          src={slides[currentSlide].image}
                          alt={slides[currentSlide].title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>

                    {/* Text Content */}
                    <div className="p-8">
                      <h3 className="text-2xl font-semibold text-slate-900 mb-4">
                        {slides[currentSlide]?.title}
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        {slides[currentSlide]?.description}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Navigation Controls */}
                {slides.length > 1 && (
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
                      {slides.map((_, index) => (
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
                      disabled={currentSlide === slides.length - 1}
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