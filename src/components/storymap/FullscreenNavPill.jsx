import React from 'react';
import { ChevronLeft, ChevronRight, Image, BookOpen, Clock } from 'lucide-react';
import { pillShell, pillBtn, pillBtnActive, pillDivider } from './StoryViewPill';

const pillBtnInner = pillBtn.replace('flex-1', 'w-full');
const pillBtnActiveInner = pillBtnActive.replace('flex-1', 'w-full');

const forcePointer = (e) => e.currentTarget.style.setProperty('cursor', 'pointer', 'important');

function TooltipBtn({ label, active, onClick, align = 'center', offsetX = 0, children }) {
    const pos = align === 'left'
        ? 'left-0'
        : 'left-1/2 -translate-x-1/2';
    return (
        <div className="relative group flex-1 h-full">
            <button
                onClick={onClick}
                className={active ? pillBtnActiveInner : pillBtnInner}
                style={{ cursor: 'pointer' }}
                onMouseEnter={forcePointer}
                onMouseMove={forcePointer}
                aria-label={label}
            >
                {children}
            </button>
            <span
                className={`
                    absolute bottom-full ${pos} mb-[10px]
                    text-white text-xs font-light whitespace-nowrap uppercase tracking-widest
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-150
                    pointer-events-none select-none
                    drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]
                `}
                style={offsetX ? { marginLeft: offsetX } : undefined}
            >
                {label}
            </span>
        </div>
    );
}

/**
 * FullscreenNavPill — Story view context sub-pill.
 *
 * Mode toggle (Picture | Story | Timeline) + Prev / count / Next.
 * No positioning — rendered inside StoryViewPill's subPill slot.
 */
export default function FullscreenNavPill({
    onPrev,
    onNext,
    hasMultiple  = true,
    hasTimeline  = false,
    mode         = 'story',
    onModeChange,
}) {
    return (
        <div className={pillShell}>
            {/* Mode toggles */}
            {onModeChange && (
                <>
                    <TooltipBtn label="Pictures" active={mode === 'picture'} onClick={() => onModeChange('picture')} align="left" offsetX={10}>
                        <Image className="w-5 h-5" />
                    </TooltipBtn>
                    <TooltipBtn label="Story" active={mode === 'story'} onClick={() => onModeChange('story')}>
                        <BookOpen className="w-5 h-5" />
                    </TooltipBtn>
                    {hasTimeline && (
                        <TooltipBtn label="Timeline" active={mode === 'timeline'} onClick={() => onModeChange('timeline')}>
                            <Clock className="w-5 h-5" />
                        </TooltipBtn>
                    )}
                    {pillDivider}
                </>
            )}

            {/* Navigation */}
            <button
                onClick={onPrev}
                disabled={!hasMultiple}
                className={pillBtn}
                style={{ cursor: hasMultiple ? 'pointer' : 'default' }}
                onMouseEnter={hasMultiple ? forcePointer : undefined}
                onMouseMove={hasMultiple ? forcePointer : undefined}
                aria-label="Previous slide"
            >
                <ChevronLeft className="w-8 h-8" />
            </button>

            <button
                onClick={onNext}
                disabled={!hasMultiple}
                className={pillBtn}
                style={{ cursor: hasMultiple ? 'pointer' : 'default' }}
                onMouseEnter={hasMultiple ? forcePointer : undefined}
                onMouseMove={hasMultiple ? forcePointer : undefined}
                aria-label="Next slide"
            >
                <ChevronRight className="w-8 h-8" />
            </button>
        </div>
    );
}
