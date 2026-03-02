import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

/**
 * FloatingControlStrip
 *
 * Bottom-centre pill for fullscreen image navigation.
 * Intentionally contains no text content — only navigation actions.
 * Designed to be reused in other contexts (e.g. map layer controls)
 * by swapping the action set.
 */
export default function FloatingControlStrip({ onPrev, onNext, onClose, counter, hasMultipleSlides }) {
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-auto">

            {/* Slide counter — floats above the pill */}
            {counter && (
                <span className="text-white/80 text-sm font-light tabular-nums bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
                    {counter}
                </span>
            )}

            {/* Control pill */}
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md rounded-full px-2 py-2 shadow-2xl">
                <button
                    onClick={onPrev}
                    disabled={!hasMultipleSlides}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white
                               hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous slide"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                    onClick={onClose}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white
                               hover:bg-white/20 transition-colors"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                <button
                    onClick={onNext}
                    disabled={!hasMultipleSlides}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white
                               hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next slide"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
