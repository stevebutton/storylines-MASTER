import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { pillShell, pillBtn, pillDivider } from './StoryViewPill';

/**
 * FullscreenNavPill — Story view context sub-pill.
 *
 * Prev / slide count / Next / divider / Close in dark frosted glass.
 * No positioning — rendered inside StoryViewPill's subPill slot.
 */
export default function FullscreenNavPill({
    onPrev,
    onNext,
    onClose,
    hasMultiple = true,
    current = 1,
    total = 1,
}) {
    return (
        <div className={pillShell}>
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
