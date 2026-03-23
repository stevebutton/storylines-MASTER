import React from 'react';
import { motion } from 'framer-motion';
import { Navigation, MapPin, Plus, Minus, Compass, CloudRain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pillShell, pillDivider } from './StoryViewPill';

/**
 * BottomPillBar — Map context sub-pill.
 *
 * Controls live in a fixed-width (380px) inner section so they are never
 * squeezed by incoming layer buttons. Layer entries animate width 0 → auto
 * and sit beside the controls section, extending the pill rightward.
 */

const ctrl = (active) => cn(
    'flex-1 h-full flex items-center justify-center transition-colors duration-200 cursor-pointer',
    active
        ? 'bg-white text-slate-900'
        : 'text-white/70 hover:text-white hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed'
);

const forcePointer = (e) => e.currentTarget.style.setProperty('cursor', 'pointer', 'important');

export default function BottomPillBar({
    onZoomIn,
    onZoomOut,
    onResetNorth,
    showRoute   = true,
    onToggleRoute,
    showMarkers = true,
    onToggleMarkers,
    pinnedLayers = [],
    onToggleLayer,
    showRainButton = false,
    rainActive     = false,
    onToggleRain,
}) {
    return (
        <div className={pillShell}>

            {/* Controls — fixed 380px so layer buttons never squeeze them */}
            <div style={{
                width: 380,
                flexShrink: 0,
                height: '100%',
                display: 'flex',
                alignItems: 'stretch',
            }}>
                <button onClick={onZoomIn}     className={ctrl(false)} style={{ cursor: 'pointer' }} onMouseEnter={forcePointer} onMouseMove={forcePointer} title="Zoom in">
                    <Plus className="w-4 h-4" />
                </button>
                <button onClick={onZoomOut}    className={ctrl(false)} style={{ cursor: 'pointer' }} onMouseEnter={forcePointer} onMouseMove={forcePointer} title="Zoom out">
                    <Minus className="w-4 h-4" />
                </button>
                <button onClick={onResetNorth} className={ctrl(false)} style={{ cursor: 'pointer' }} onMouseEnter={forcePointer} onMouseMove={forcePointer} title="Reset north">
                    <Compass className="w-4 h-4" />
                </button>

                {pillDivider}

                <button onClick={onToggleRoute}   className={ctrl(showRoute)}   style={{ cursor: 'pointer' }} onMouseEnter={forcePointer} onMouseMove={forcePointer} title="Toggle route">
                    <Navigation className="w-4 h-4" />
                </button>
                <button onClick={onToggleMarkers} className={ctrl(showMarkers)} style={{ cursor: 'pointer' }} onMouseEnter={forcePointer} onMouseMove={forcePointer} title="Toggle markers">
                    <MapPin className="w-4 h-4" />
                </button>

            </div>

            {/* Layer toggles — each entry grows from width:0, pulling the pill
                right without affecting the controls section. */}
            {/* Rain effect toggle */}
            {showRainButton && (
                <motion.div
                    key="rain"
                    initial={{ width: 0, opacity: 0, y: 12 }}
                    animate={{ width: 'auto', opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ flexShrink: 0, height: '100%', display: 'flex', alignItems: 'stretch', overflowX: 'hidden' }}
                >
                    {pillDivider}
                    <button
                        onClick={onToggleRain}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={forcePointer} onMouseMove={forcePointer}
                        className={cn(
                            'flex-none h-full px-3',
                            'flex flex-col items-center justify-center',
                            'transition-colors duration-200 whitespace-nowrap',
                            rainActive
                                ? 'bg-white text-slate-900'
                                : 'text-white/70 hover:text-white hover:bg-white/15'
                        )}
                        title={rainActive ? 'Stop rain' : 'Start rain'}
                    >
                        <CloudRain className="w-3 h-3 flex-shrink-0 mb-0.5" />
                        <span className="text-xs font-medium leading-none">Rain</span>
                    </button>
                </motion.div>
            )}

            {pinnedLayers.map((layer) => (
                <motion.div
                    key={layer.id}
                    initial={{ width: 0, opacity: 0, y: 12 }}
                    animate={{ width: 'auto', opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{
                        flexShrink: 0,
                        height: '100%',
                        display: 'flex',
                        alignItems: 'stretch',
                        overflowX: 'hidden',
                    }}
                >
                    {pillDivider}
                    <button
                        onClick={() => onToggleLayer?.(layer.id)}
                        style={{ cursor: 'pointer' }}
                        className={cn(
                            'flex-none h-full px-3',
                            'flex flex-col items-center justify-center',
                            'transition-colors duration-200 whitespace-nowrap',
                            layer.visible
                                ? 'bg-white text-slate-900'
                                : 'text-white/70 hover:text-white hover:bg-white/15'
                        )}
                        title={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                    >
                        <MapPin className="w-3 h-3 flex-shrink-0 mb-0.5" />
                        <span className="text-xs font-medium leading-none whitespace-nowrap">
                            {layer.name}
                        </span>
                    </button>
                </motion.div>
            ))}
        </div>
    );
}
