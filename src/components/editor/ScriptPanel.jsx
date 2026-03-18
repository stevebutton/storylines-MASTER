import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ScriptPanel({ isOpen, onClose, chapters, slides, onUpdateChapter, onUpdateSlide }) {
    const sortedChapters = [...(chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const chapterSlides = (chapterId) =>
        [...(slides || [])]
            .filter(s => s.chapter_id === chapterId)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/30 z-[80]"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-[75vw] bg-white shadow-2xl z-[90] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-8 py-5 border-b flex-shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">Script</h2>
                                <p className="text-sm text-slate-500 mt-0.5">Edit titles, captions and extended content. Changes are saved with the story.</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="max-w-[760px] mx-auto px-8 py-10">

                                {sortedChapters.length === 0 && (
                                    <p className="text-slate-400 text-sm">No chapters yet. Add chapters and slides in the editor to see them here.</p>
                                )}

                                {sortedChapters.map((chapter, chIdx) => {
                                    const cSlides = chapterSlides(chapter.id);
                                    return (
                                        <div key={chapter.id} className="mb-16">

                                            {/* Chapter heading */}
                                            <div className="mb-5">
                                                <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-1">
                                                    Chapter {chIdx + 1}
                                                </p>
                                                <input
                                                    value={chapter.name || ''}
                                                    onChange={(e) => onUpdateChapter({ ...chapter, name: e.target.value })}
                                                    placeholder="Chapter title"
                                                    className="w-full text-2xl font-bold text-slate-800 bg-transparent border-0 border-b-2 border-transparent focus:border-amber-400 focus:outline-none pb-1 transition-colors"
                                                />
                                                <textarea
                                                    value={chapter.description || ''}
                                                    onChange={(e) => onUpdateChapter({ ...chapter, description: e.target.value })}
                                                    placeholder="Chapter description…"
                                                    rows={2}
                                                    className="w-full mt-2 text-sm text-slate-600 bg-transparent border-0 border-b border-transparent focus:border-amber-400 focus:outline-none resize-none transition-colors placeholder:text-slate-300"
                                                />
                                            </div>

                                            {/* Slides */}
                                            {cSlides.length === 0 && (
                                                <p className="text-slate-300 text-sm pl-5">No slides in this chapter.</p>
                                            )}

                                            {cSlides.map((slide, sIdx) => (
                                                <div
                                                    key={slide.id}
                                                    className="mb-8 pl-5 border-l-2 border-slate-100 hover:border-amber-300 transition-colors"
                                                >
                                                    <p className="text-xs font-medium text-slate-400 mb-2">
                                                        Slide {sIdx + 1}
                                                        {slide.location && <span className="ml-2 text-slate-300">· {slide.location}</span>}
                                                    </p>

                                                    {/* Title */}
                                                    <input
                                                        value={slide.title || ''}
                                                        onChange={(e) => onUpdateSlide({ ...slide, title: e.target.value })}
                                                        placeholder="Slide title"
                                                        className="w-full text-base font-semibold text-slate-800 bg-transparent border-0 border-b border-transparent focus:border-amber-400 focus:outline-none pb-0.5 mb-3 transition-colors placeholder:text-slate-300"
                                                    />

                                                    {/* Description */}
                                                    <textarea
                                                        value={slide.description || ''}
                                                        onChange={(e) => onUpdateSlide({ ...slide, description: e.target.value })}
                                                        placeholder="Caption…"
                                                        rows={3}
                                                        className="w-full text-sm text-slate-700 bg-transparent border-0 border-b border-transparent focus:border-amber-400 focus:outline-none resize-none mb-3 transition-colors placeholder:text-slate-300"
                                                    />

                                                    {/* Extended content */}
                                                    <textarea
                                                        value={slide.extended_content || ''}
                                                        onChange={(e) => onUpdateSlide({ ...slide, extended_content: e.target.value })}
                                                        placeholder="Extended content…"
                                                        rows={5}
                                                        className="w-full text-sm text-slate-500 bg-transparent border-0 border-b border-transparent focus:border-amber-400 focus:outline-none resize-none transition-colors placeholder:text-slate-300"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
