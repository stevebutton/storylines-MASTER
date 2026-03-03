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
        <div className="fixed bottom-8 right-8 z-[9999] flex flex-col items-end gap-2 pointer-events-auto">

            {/* Control pill */}
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-full px-2 py-2 shadow-2xl">
                <button
                    onClick={onPrev}
                    disabled={!hasMultipleSlides}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-slate-800
                               hover:bg-black/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous slide"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                    onClick={onClose}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-slate-800
                               hover:bg-black/10 transition-colors"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                <button
                    onClick={onNext}
                    disabled={!hasMultipleSlides}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-slate-800
                               hover:bg-black/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next slide"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
