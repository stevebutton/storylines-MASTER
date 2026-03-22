import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

const PANEL_WIDTH = 380;

// Split content into pages at paragraph (HTML) or sentence (plain text) boundaries.
const splitHtmlIntoPages = (content, maxChars = 500) => {
    if (!content) return [];

    // HTML path — split at </p> boundaries
    if (/<p[\s>]/i.test(content)) {
        const paragraphRegex = /<p[^>]*>.*?<\/p>/gi;
        const paragraphs = content.match(paragraphRegex);
        if (paragraphs && paragraphs.length > 0) {
            const stripTags = (str) => str.replace(/<[^>]*>/g, '');
            const pages = [];
            let currentPageContent = '';
            let currentTextLength  = 0;
            for (const paragraph of paragraphs) {
                const textLength = stripTags(paragraph).length;
                if (currentPageContent && (currentTextLength + textLength) > maxChars) {
                    pages.push(currentPageContent);
                    currentPageContent = paragraph;
                    currentTextLength  = textLength;
                } else {
                    currentPageContent += paragraph;
                    currentTextLength  += textLength;
                }
            }
            if (currentPageContent) pages.push(currentPageContent);
            return pages.length > 0 ? pages : [content];
        }
    }

    // Plain text path — split at sentence end (. ! ?) then word boundary
    if (content.length <= maxChars) return [content];
    const pages = [];
    let remaining = content;
    while (remaining.length > maxChars) {
        const slice = remaining.slice(0, maxChars);
        const lastSentence = Math.max(
            slice.lastIndexOf('. '),
            slice.lastIndexOf('! '),
            slice.lastIndexOf('? '),
        );
        const splitAt = lastSentence > 0 ? lastSentence + 2 : maxChars;
        pages.push(remaining.slice(0, splitAt).trim());
        remaining = remaining.slice(splitAt).trim();
    }
    if (remaining) pages.push(remaining);
    return pages;
};

const THEME_FONTS = {
    c: 'Righteous, cursive',
    f: 'Oswald, sans-serif',
    k: 'Oswald, sans-serif',
};

// ── Inline save helper ────────────────────────────────────────────────────────

async function saveSlideField(slideId, field, value) {
    const { error } = await supabase
        .from('slides')
        .update({ [field]: value || null })
        .eq('id', slideId);
    return !error;
}

// ── Editable inline field components ─────────────────────────────────────────

/** Single-line inline editor — renders as styled text or input */
function InlineText({ value, onSave, className, style, placeholder = 'Click to edit…', tag: Tag = 'span' }) {
    const [editing, setEditing]   = useState(false);
    const [draft, setDraft]       = useState(value || '');
    const [saveState, setSaveState] = useState(null); // null | 'saving' | 'saved'
    const inputRef = useRef(null);

    useEffect(() => { setDraft(value || ''); }, [value]);
    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    const commit = useCallback(async () => {
        setEditing(false);
        if (draft === (value || '')) return;
        setSaveState('saving');
        const ok = await onSave(draft.trim());
        setSaveState(ok ? 'saved' : null);
        if (ok) setTimeout(() => setSaveState(null), 1500);
    }, [draft, value, onSave]);

    if (editing) {
        return (
            <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); } }}
                className={className}
                style={{ ...style, background: 'rgba(255,255,255,0.12)', border: 'none', outline: 'none', borderBottom: '1px solid rgba(255,255,255,0.4)', width: '100%', borderRadius: 0 }}
                placeholder={placeholder}
            />
        );
    }

    return (
        <Tag
            className={`${className} group/edit relative cursor-text`}
            style={style}
            onClick={() => setEditing(true)}
            title="Click to edit"
        >
            {value || <span className="opacity-30 italic">{placeholder}</span>}
            {saveState === 'saved' && (
                <span className="ml-2 text-xs text-green-400 font-normal not-italic">✓</span>
            )}
            <span className="absolute -right-5 top-0 opacity-0 group-hover/edit:opacity-60 transition-opacity text-white text-xs select-none pointer-events-none">✎</span>
        </Tag>
    );
}

/** Multi-line body editor — replaces pagination with textareas for description + extended */
function BodyEditor({ description, extendedContent, onSaveDescription, onSaveExtended, allowExtended, onDone }) {
    const [desc, setDesc]       = useState(description || '');
    const [ext, setExt]         = useState(extendedContent || '');
    const [saveState, setSaveState] = useState(null);

    const save = useCallback(async () => {
        setSaveState('saving');
        const results = await Promise.all([
            desc !== (description || '') ? onSaveDescription(desc) : Promise.resolve(true),
            allowExtended && ext !== (extendedContent || '') ? onSaveExtended(ext) : Promise.resolve(true),
        ]);
        setSaveState(results.every(Boolean) ? 'saved' : 'error');
        if (results.every(Boolean)) setTimeout(() => { setSaveState(null); onDone(); }, 800);
    }, [desc, ext, description, extendedContent, onSaveDescription, onSaveExtended, allowExtended, onDone]);

    const taClass = 'w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm leading-relaxed resize-none focus:outline-none focus:border-white/50 transition-colors text-right';

    return (
        <div className="space-y-3">
            <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1 text-right">Description</p>
                <textarea
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    rows={4}
                    className={taClass}
                    style={{ fontFamily: 'Raleway, sans-serif' }}
                    placeholder="Slide description…"
                    autoFocus
                />
            </div>
            {allowExtended && (
                <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1 text-right">Extended content</p>
                    <textarea
                        value={ext}
                        onChange={e => setExt(e.target.value)}
                        rows={5}
                        className={taClass}
                        style={{ fontFamily: 'Raleway, sans-serif' }}
                        placeholder="Additional content…"
                    />
                </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
                {saveState === 'error' && <span className="text-red-400 text-xs">Save failed</span>}
                {saveState === 'saved' && <span className="text-green-400 text-xs">✓ Saved</span>}
                <button
                    onClick={onDone}
                    className="px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={save}
                    disabled={saveState === 'saving'}
                    className="px-4 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                    {saveState === 'saving' ? 'Saving…' : 'Save'}
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * TextPanelCarousel
 *
 * Full-bleed left panel for fullscreen image reading.
 * Contains only text content — no slide navigation controls.
 * Collapses off-screen to the left; a tab on the right edge
 * remains visible so the user can re-open it.
 *
 * Entrance: panel slides in from left on mount; content elements
 * stagger in sequentially. No per-slide transition — content
 * updates in place without re-animating.
 *
 * canEdit + onSaved enable inline editing for editors/admins.
 */
const TextPanelCarousel = ({
    chapterTitle,
    slideTitle,
    description,
    extendedContent,
    location,
    slideId,
    chapterId     = null,
    mapStyle      = 'a',
    initialOpen   = true,
    canEdit       = false,
    allowExtended = false,  // show extended_content editor (Story View)
    onSaved       = null,   // (slideId, field, value) => void — update parent state
    onChapterNameSaved = null, // (chapterId, name) => void — update parent state
}) => {
    const themeFont = THEME_FONTS[mapStyle] || 'Raleway, sans-serif';
    const [currentPage, setCurrentPage]   = useState(0);
    const [isPanelOpen, setIsPanelOpen]   = useState(initialOpen);
    const [contentHeight, setContentHeight] = useState('auto');
    const [editingBody, setEditingBody]   = useState(false);
    const pageRefs    = useRef([]);

    // Build paginated content
    const extendedArray = Array.isArray(extendedContent)
        ? extendedContent
        : (extendedContent ? [extendedContent] : []);

    const splitExtended = extendedArray.flatMap(c => splitHtmlIntoPages(c));
    const combinedFirst = [description, splitExtended[0]].filter(Boolean).join('<br>');
    const splitFirst = combinedFirst ? splitHtmlIntoPages(combinedFirst) : [];
    const pages = [
        ...splitFirst.map(content => ({ content })),
        ...splitExtended.slice(1).map(content => ({ content })),
    ];

    // Reset to page 0 on slide change
    useEffect(() => {
        setCurrentPage(0);
        setEditingBody(false);
    }, [chapterTitle, slideTitle]);

    // Measure page height
    useEffect(() => {
        if (pageRefs.current[currentPage]) {
            setContentHeight(pageRefs.current[currentPage].offsetHeight);
        }
    }, [currentPage]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (pageRefs.current[0]) setContentHeight(pageRefs.current[0].offsetHeight);
        }, 120);
        return () => clearTimeout(t);
    }, [slideTitle]);

    const nextPage = () => { if (currentPage < pages.length - 1) setCurrentPage(p => p + 1); };
    const prevPage = () => { if (currentPage > 0) setCurrentPage(p => p - 1); };

    // Shared entrance transition for content elements — staggered delays
    const el = (delay) => ({
        initial:    { opacity: 0, y: 12 },
        animate:    { opacity: 1, y: 0 },
        transition: { delay, duration: 0.55, ease: 'easeOut' },
    });

    // Save helpers — Supabase write + parent state update
    const makeSaver = useCallback((field) => async (value) => {
        const ok = await saveSlideField(slideId, field, value);
        if (ok) onSaved?.(slideId, field, value);
        return ok;
    }, [slideId, onSaved]);

    const saveTitle       = useCallback(makeSaver('title'),            [makeSaver]);
    const saveLocation    = useCallback(makeSaver('location'),         [makeSaver]);
    const saveDescription = useCallback(makeSaver('description'),      [makeSaver]);
    const saveExtended    = useCallback(makeSaver('extended_content'), [makeSaver]);

    const saveChapterName = useCallback(async (value) => {
        if (!chapterId) return false;
        const { error } = await supabase
            .from('chapters')
            .update({ name: value || null })
            .eq('id', chapterId);
        if (!error) onChapterNameSaved?.(chapterId, value);
        return !error;
    }, [chapterId, onChapterNameSaved]);

    return (
        <motion.div
            className="fixed left-0 top-[100px] bottom-0 z-[9999] flex items-stretch pointer-events-auto"
            initial={{ x: -(PANEL_WIDTH + 48) }}
            animate={{ x: isPanelOpen ? 0 : -PANEL_WIDTH }}
            exit={{ opacity: 0, transition: { duration: 1, ease: 'easeInOut' } }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
            {/* ── Text panel ── */}
            <div className="relative overflow-y-auto flex-shrink-0 rounded-br-2xl" style={{ width: PANEL_WIDTH }}>
                <div
                    className="absolute inset-0 backdrop-blur-xl pointer-events-none rounded-br-2xl"
                    style={{
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.40) 0px, rgba(0,0,0,0.25) 200px, rgba(0,0,0,0.25) 100%)',
                        transform: 'translateZ(0)',
                    }}
                />
                <div className="relative p-8 space-y-5">

                    {/* Eyebrow block */}
                    <div key={slideId} style={{ minHeight: 130, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 12 }}>
                        {chapterTitle && (() => {
                            const colonIdx = chapterTitle.indexOf(': ');
                            const prefix = colonIdx !== -1 ? chapterTitle.slice(0, colonIdx + 1) : null;
                            const title  = colonIdx !== -1 ? chapterTitle.slice(colonIdx + 2) : chapterTitle;
                            return (
                                <motion.div
                                    {...el(0.45)}
                                    className="text-right uppercase tracking-widest leading-snug"
                                >
                                    {prefix && (
                                        <p className="text-lg font-medium text-white/70" style={{ fontFamily: themeFont }}>{prefix}</p>
                                    )}
                                    {canEdit && chapterId ? (
                                        <InlineText
                                            value={title}
                                            onSave={saveChapterName}
                                            className="text-xl font-medium text-white"
                                            style={{ fontFamily: themeFont, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                            placeholder="Chapter name…"
                                            tag="p"
                                        />
                                    ) : (
                                        <p className="text-xl font-medium text-white" style={{ fontFamily: themeFont }}>{title}</p>
                                    )}
                                </motion.div>
                            );
                        })()}

                        {/* Location — inline editable */}
                        {(location || canEdit) && (
                            <motion.div
                                {...el(0.6)}
                                className="flex items-center justify-end"
                                style={{ paddingRight: 15 }}
                            >
                                {canEdit ? (
                                    <InlineText
                                        value={location}
                                        onSave={saveLocation}
                                        className="text-sm text-white"
                                        style={{ fontFamily: themeFont, textAlign: 'right' }}
                                        placeholder="Add location…"
                                    />
                                ) : (
                                    <span className="text-sm text-white" style={{ fontFamily: themeFont }}>
                                        {location}
                                    </span>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* Slide title — inline editable; keyed so it re-animates on slide change */}
                    {(slideTitle || canEdit) && (
                        <motion.div
                            key={`title-${slideId}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.55, ease: 'easeOut' }}
                        >
                            {canEdit ? (
                                <InlineText
                                    value={slideTitle}
                                    onSave={saveTitle}
                                    className="text-5xl font-light text-white text-right block w-full"
                                    style={{ fontFamily: themeFont, lineHeight: '0.95' }}
                                    placeholder="Add title…"
                                    tag="div"
                                />
                            ) : (
                                <h3
                                    className="text-5xl font-light text-white text-right"
                                    style={{ fontFamily: themeFont, lineHeight: '0.95' }}
                                >
                                    {slideTitle}
                                </h3>
                            )}
                        </motion.div>
                    )}

                    {/* Body — paginated display or inline editor */}
                    {canEdit && editingBody ? (
                        /* Editor opens instantly — no entrance delay */
                        <motion.div
                            key="body-editor"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            <BodyEditor
                                description={description}
                                extendedContent={typeof extendedContent === 'string' ? extendedContent : (extendedContent?.[0] || '')}
                                onSaveDescription={saveDescription}
                                onSaveExtended={saveExtended}
                                allowExtended={allowExtended}
                                onDone={() => setEditingBody(false)}
                            />
                        </motion.div>
                    ) : pages.length > 0 ? (
                        /* Keyed so it re-animates on slide change */
                        <motion.div
                            key={`body-${slideId}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.0, duration: 0.55, ease: 'easeOut' }}
                        >
                            <motion.div
                                className="relative overflow-hidden"
                                animate={{ height: contentHeight }}
                                transition={{ duration: 0.5, ease: 'easeInOut' }}
                            >
                                {pages.map((page, index) => (
                                    <div
                                        key={index}
                                        ref={el => pageRefs.current[index] = el}
                                        className={index === currentPage ? 'block' : 'hidden'}
                                    >
                                        <div
                                            className={[
                                                'leading-relaxed text-base font-light prose prose-sm max-w-none text-right prose-invert',
                                                canEdit ? 'cursor-text hover:bg-white/10 rounded-lg px-2 -mx-2 transition-colors' : '',
                                            ].join(' ')}
                                            style={{ color: 'white' }}
                                            dangerouslySetInnerHTML={{ __html: page.content }}
                                            onClick={canEdit ? () => setEditingBody(true) : undefined}
                                            title={canEdit ? 'Click to edit' : undefined}
                                        />
                                    </div>
                                ))}
                            </motion.div>

                            {/* Page navigation */}
                            {pages.length > 1 && (
                                <div className="flex items-center justify-end gap-2 pt-5">
                                    <button
                                        onClick={prevPage}
                                        disabled={currentPage === 0}
                                        className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30
                                                   disabled:opacity-30 disabled:cursor-not-allowed
                                                   flex items-center justify-center transition-colors"
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-white" />
                                    </button>

                                    {pages.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i)}
                                            className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                                                i === currentPage ? 'w-8 bg-white' : 'w-8 bg-white/30 hover:bg-white/50'
                                            }`}
                                            aria-label={`Page ${i + 1}`}
                                        />
                                    ))}

                                    <button
                                        onClick={nextPage}
                                        disabled={currentPage === pages.length - 1}
                                        className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30
                                                   disabled:opacity-30 disabled:cursor-not-allowed
                                                   flex items-center justify-center transition-colors"
                                        aria-label="Next page"
                                    >
                                        <ChevronRight className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ) : canEdit ? (
                        /* Empty body — placeholder when canEdit and no content */
                        <motion.div
                            key={`body-empty-${slideId}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.0, duration: 0.55, ease: 'easeOut' }}
                        >
                            <div
                                className="text-white/30 text-sm text-right italic cursor-text hover:bg-white/10 rounded-lg px-2 py-3 -mx-2 transition-colors"
                                onClick={() => setEditingBody(true)}
                            >
                                Click to add description…
                            </div>
                        </motion.div>
                    ) : null}
                </div>
            </div>

            {/* ── Collapse tab ── */}
            <button
                onClick={() => setIsPanelOpen(open => !open)}
                className="self-center w-8 h-16 backdrop-blur-xl rounded-r-xl
                           flex items-center justify-center shadow-lg flex-shrink-0
                           hover:bg-white/10 transition-colors"
                aria-label={isPanelOpen ? 'Hide panel' : 'Show panel'}
            >
                <ChevronLeft
                    className="w-5 h-5 text-white transition-transform duration-300"
                    style={{ transform: isPanelOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}
                />
            </button>
        </motion.div>
    );
};

export default TextPanelCarousel;
