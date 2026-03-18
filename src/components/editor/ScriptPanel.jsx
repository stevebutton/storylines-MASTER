import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const TOOLBAR = [['bold', 'italic', 'underline'], [{ list: 'bullet' }], ['link']];

// Override Quill's fixed-height default so fields expand to full content length
const QUILL_STYLES = `
    .script-quill .ql-toolbar { border: none; border-bottom: 1px solid #e2e8f0; padding: 4px 0; }
    .script-quill .ql-container { border: none; height: auto; overflow: visible; font-size: 0.875rem; font-family: inherit; }
    .script-quill .ql-editor { padding: 8px 0; min-height: 0 !important; overflow: visible; line-height: 1.7; }
    .script-quill .ql-editor.ql-blank::before { left: 0; font-style: normal; color: #cbd5e1; }
    .script-quill .ql-editor p { margin-bottom: 0.5em; }
`;

export default function ScriptPanel({ isOpen, onClose, chapters, slides, onUpdateChapter, onUpdateSlide }) {
    const [localChapters, setLocalChapters] = useState([]);
    const [localSlides, setLocalSlides]     = useState([]);
    const localSlidesRef   = useRef([]);
    const localChaptersRef = useRef([]);
    const debounceRef      = useRef({});
    const chapterRefs      = useRef([]);

    // Sync from props each time the panel opens
    useEffect(() => {
        if (isOpen) {
            const sorted = [...(chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setLocalChapters(sorted);
            localChaptersRef.current = sorted;
            const allSlides = [...(slides || [])];
            setLocalSlides(allSlides);
            localSlidesRef.current = allSlides;
        }
    }, [isOpen]);

    const handleSlideChange = (slideId, field, value) => {
        setLocalSlides(prev => {
            const updated = prev.map(s => s.id === slideId ? { ...s, [field]: value } : s);
            localSlidesRef.current = updated;
            return updated;
        });
        clearTimeout(debounceRef.current[slideId + field]);
        debounceRef.current[slideId + field] = setTimeout(() => {
            const slide = localSlidesRef.current.find(s => s.id === slideId);
            if (slide) onUpdateSlide(slide);
        }, 500);
    };

    const handleChapterChange = (chapterId, field, value) => {
        setLocalChapters(prev => {
            const updated = prev.map(c => c.id === chapterId ? { ...c, [field]: value } : c);
            localChaptersRef.current = updated;
            return updated;
        });
        clearTimeout(debounceRef.current[chapterId + field]);
        debounceRef.current[chapterId + field] = setTimeout(() => {
            const chapter = localChaptersRef.current.find(c => c.id === chapterId);
            if (chapter) onUpdateChapter(chapter);
        }, 500);
    };

    const scrollToChapter = (idx) => {
        chapterRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const chapterSlides = (chapterId) =>
        localSlides
            .filter(s => s.chapter_id === chapterId)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="fixed top-[260px] left-0 right-0 bottom-0 bg-white z-[90] flex"
                >
                    <style>{QUILL_STYLES}</style>

                    {/* ── Left nav ── */}
                    <div className="w-[220px] flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col h-full">
                        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                            <div>
                                <h2 className="text-base font-bold text-slate-800">Script</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Save when done</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto py-3">
                            {localChapters.map((ch, idx) => (
                                <button
                                    key={ch.id}
                                    onClick={() => scrollToChapter(idx)}
                                    className="w-full text-left px-4 py-2.5 hover:bg-white transition-colors group"
                                >
                                    <span className="text-xs text-slate-400 block">Ch {idx + 1}</span>
                                    <span className="text-sm text-slate-700 font-medium truncate block group-hover:text-amber-600 transition-colors">
                                        {ch.name || 'Untitled'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Main content ── */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="max-w-[820px] mx-auto px-12 py-12">

                            {localChapters.length === 0 && (
                                <p className="text-slate-400 text-sm">No chapters yet. Add chapters and slides in the editor to see them here.</p>
                            )}

                            {localChapters.map((chapter, chIdx) => {
                                const cSlides = chapterSlides(chapter.id);
                                return (
                                    <div
                                        key={chapter.id}
                                        ref={el => chapterRefs.current[chIdx] = el}
                                        className="mb-20"
                                        style={{ scrollMarginTop: '32px' }}
                                    >
                                        {/* Chapter heading */}
                                        <div className="mb-8 pb-6 border-b-2 border-slate-100">
                                            <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">
                                                Chapter {chIdx + 1}
                                            </p>
                                            <input
                                                value={chapter.name || ''}
                                                onChange={(e) => handleChapterChange(chapter.id, 'name', e.target.value)}
                                                placeholder="Chapter title"
                                                className="w-full text-3xl font-bold text-slate-800 bg-transparent border-0 border-b-2 border-transparent focus:border-amber-400 focus:outline-none pb-1 mb-5 transition-colors placeholder:text-slate-200"
                                            />
                                            <div className="script-quill">
                                                <ReactQuill
                                                    value={chapter.description || ''}
                                                    onChange={(content) => handleChapterChange(chapter.id, 'description', content)}
                                                    placeholder="Chapter description…"
                                                    modules={{ toolbar: TOOLBAR }}
                                                />
                                            </div>
                                        </div>

                                        {/* Slides */}
                                        {cSlides.length === 0 && (
                                            <p className="text-slate-300 text-sm pl-6">No slides in this chapter.</p>
                                        )}

                                        {cSlides.map((slide, sIdx) => (
                                            <div
                                                key={slide.id}
                                                className="mb-10 pl-6 border-l-2 border-slate-100 hover:border-amber-300 transition-colors"
                                            >
                                                <p className="text-xs font-medium text-slate-400 mb-3">
                                                    Slide {sIdx + 1}
                                                    {slide.location && (
                                                        <span className="ml-2 text-slate-300">· {slide.location}</span>
                                                    )}
                                                </p>

                                                {/* Title */}
                                                <input
                                                    value={slide.title || ''}
                                                    onChange={(e) => handleSlideChange(slide.id, 'title', e.target.value)}
                                                    placeholder="Slide title"
                                                    className="w-full text-lg font-semibold text-slate-800 bg-transparent border-0 border-b border-transparent focus:border-amber-400 focus:outline-none pb-0.5 mb-5 transition-colors placeholder:text-slate-200"
                                                />

                                                {/* Description */}
                                                <div className="mb-5 script-quill">
                                                    <ReactQuill
                                                        value={slide.description || ''}
                                                        onChange={(content) => handleSlideChange(slide.id, 'description', content)}
                                                        placeholder="Caption…"
                                                        modules={{ toolbar: TOOLBAR }}
                                                    />
                                                </div>

                                                {/* Extended content */}
                                                <div className="script-quill text-slate-500">
                                                    <ReactQuill
                                                        value={slide.extended_content || ''}
                                                        onChange={(content) => handleSlideChange(slide.id, 'extended_content', content)}
                                                        placeholder="Extended content…"
                                                        modules={{ toolbar: TOOLBAR }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
