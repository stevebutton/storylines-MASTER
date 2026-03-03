import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import PdfThumbnail from '@/components/pdf/PdfThumbnail';

/**
 * FloatingControlStrip
 *
 * Bottom pill for fullscreen image navigation.
 * Optionally shows a PDF thumbnail immediately to the left of the pill
 * when the current slide has a pdf_url attached.
 */
export default function FloatingControlStrip({ onPrev, onNext, onClose, hasMultipleSlides, pdfUrl }) {
    return (
        <div className="fixed bottom-8 left-0 z-[9999] flex justify-end items-center gap-3 pr-2 pointer-events-none" style={{ width: 380 }}>

            {/* PDF thumbnail — shown when current slide has a PDF */}
            {pdfUrl && (
                <div className="pointer-events-none flex-shrink-0 rounded-lg overflow-hidden shadow-xl"
                     style={{ height: 60, width: 43 }}>
                    <PdfThumbnail url={pdfUrl} className="w-full h-full object-cover" />
                </div>
            )}

            {/* Control pill */}
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-full px-2 py-2 shadow-2xl pointer-events-auto">
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
