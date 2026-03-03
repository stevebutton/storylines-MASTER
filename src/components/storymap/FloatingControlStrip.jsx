import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import PdfThumbnail from '@/components/pdf/PdfThumbnail';

/**
 * FloatingControlStrip
 *
 * Bottom-left pill for fullscreen image navigation.
 * When the current slide has a PDF, shows a thumbnail + label + title
 * immediately to the left of the nav pill, bottom-aligned.
 */
export default function FloatingControlStrip({ onPrev, onNext, onClose, hasMultipleSlides, pdfUrl, pdfTitle, onPdfClick }) {
    return (
        <div className="fixed bottom-8 left-0 z-[9999] flex justify-end items-end gap-5 pr-2 pointer-events-none" style={{ width: 380 }}>

            {/* PDF section — label above, then title left + thumbnail right */}
            {pdfUrl && (
                <div className="pointer-events-auto flex-shrink-0 flex flex-col gap-1.5">
                    <span className="text-[10px] text-white/80 uppercase tracking-wider font-medium drop-shadow"
                          style={{ paddingLeft: 30 }}>
                        Related Documents
                    </span>
                    <div className="flex items-center gap-1.5">
                        {pdfTitle && (
                            <span className="text-xs text-white font-medium leading-snug drop-shadow max-w-[100px] text-right"
                                  style={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 4,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                  }}>
                                {pdfTitle}
                            </span>
                        )}
                        <button
                            onClick={onPdfClick}
                            className="rounded-lg overflow-hidden shadow-xl flex-shrink-0 hover:opacity-80 transition-opacity"
                            style={{ height: 90, width: 64 }}
                            aria-label="Open document"
                        >
                            <PdfThumbnail url={pdfUrl} className="w-full h-full object-cover" />
                        </button>
                    </div>
                </div>
            )}

            {/* Control pill */}
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-full px-2 py-2 shadow-2xl pointer-events-auto flex-shrink-0">
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
