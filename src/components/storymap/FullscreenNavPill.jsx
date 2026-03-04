import React from 'react';
import { ChevronLeft, ChevronRight, X, Image, BookOpen, Clock } from 'lucide-react';
import { pillShell, pillBtn, pillBtnActive, pillDivider } from './StoryViewPill';

/**
 * FullscreenNavPill — Story view context sub-pill.
 *
 * Mode toggle (Picture | Story | Timeline) + Prev / count / Next + Close.
 * No positioning — rendered inside StoryViewPill's subPill slot.
 */
export default function FullscreenNavPill({
    onPrev,
    onNext,
    onClose,
    hasMultiple  = true,
    current      = 1,
    total        = 1,
    mode         = 'story',
    onModeChange,
}) {
    return (
        <div className={pillShell}>
            {/* Mode toggles */}
            {onModeChange && (
                <>
                    <button
                        onClick={() => onModeChange('picture')}
                        className={mode === 'picture' ? pillBtnActive : pillBtn}
                        title="Picture"
                        aria-label="Picture view"
                    >
                        <Image className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => onModeChange('story')}
                        className={mode === 'story' ? pillBtnActive : pillBtn}
                        title="Story"
                        aria-label="Story view"
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => onModeChange('timeline')}
                        className={mode === 'timeline' ? pillBtnActive : pillBtn}
                        title="Timeline"
                        aria-label="Timeline view"
                    >
                        <Clock className="w-3.5 h-3.5" />
                    </button>
                    {pillDivider}
                </>
            )}

            {/* Navigation */}
            <button
                onClick={onPrev}
                disabled={!hasMultiple}
                className={pillBtn}
                aria-label="Previous slide"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-white/50 text-xs tabular-nums px-2 select-none">
                {current} / {total}
            </span>

            <button
                onClick={onNext}
                disabled={!hasMultiple}
                className={pillBtn}
                aria-label="Next slide"
            >
                <ChevronRight className="w-4 h-4" />
            </button>

            {pillDivider}

            <button
                onClick={onClose}
                className={pillBtn}
                aria-label="Close"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
