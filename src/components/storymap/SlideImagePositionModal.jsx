import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

const PRESETS = [
    { label: 'Top',    value: '50% 0%'   },
    { label: 'Centre', value: '50% 50%'  },
    { label: 'Bottom', value: '50% 100%' },
    { label: 'Left',   value: '0% 50%'   },
    { label: 'Right',  value: '100% 50%' },
];

/**
 * SlideImagePositionModal — drag the focal point on the slide image.
 * Saves image_position directly to Supabase on confirm.
 */
export default function SlideImagePositionModal({ slide, isOpen, onClose, onSaved }) {
    const [position, setPosition] = useState('50% 50%');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved]       = useState(false);
    const isDragging  = useRef(false);
    const imgRef      = useRef(null);

    // Sync position when slide changes
    useEffect(() => {
        setPosition(slide?.image_position || '50% 50%');
        setSaved(false);
    }, [slide?.id]);

    const updateFromEvent = useCallback((e) => {
        if (!imgRef.current) return;
        const rect = imgRef.current.getBoundingClientRect();
        const px = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left)  / rect.width)  * 100)));
        const py = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top)   / rect.height) * 100)));
        setPosition(`${px}% ${py}%`);
    }, []);

    const onMouseDown = (e) => { isDragging.current = true;  updateFromEvent(e); };
    const onMouseMove = (e) => { if (isDragging.current) updateFromEvent(e); };
    const onMouseUp   = ()  => { isDragging.current = false; };

    const handleSave = async () => {
        if (!slide?.id) return;
        setIsSaving(true);
        const { error } = await supabase
            .from('slides')
            .update({ image_position: position })
            .eq('id', slide.id);
        setIsSaving(false);
        if (!error) {
            setSaved(true);
            onSaved?.(slide.id, position);
            setTimeout(onClose, 800);
        }
    };

    const [px, py] = position.split(' ').map(v => parseFloat(v));

    if (!slide?.image) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[200030] flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

                    {/* Panel */}
                    <motion.div
                        className="relative z-10 bg-slate-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
                        style={{ width: 560, maxHeight: '85vh' }}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1    }}
                        exit={   { opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                            <div>
                                <h2 className="text-white text-sm font-medium">Adjust Image Position</h2>
                                <p className="text-white/40 text-xs mt-0.5">Drag or click to set the focal point</p>
                            </div>
                            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Image drag area */}
                        <div
                            className="relative select-none"
                            style={{ height: 360, cursor: 'crosshair' }}
                            onMouseDown={onMouseDown}
                            onMouseMove={onMouseMove}
                            onMouseUp={onMouseUp}
                            onMouseLeave={onMouseUp}
                        >
                            <img
                                ref={imgRef}
                                src={slide.image}
                                alt=""
                                className="w-full h-full object-cover pointer-events-none"
                                style={{ objectPosition: position }}
                                draggable={false}
                            />

                            {/* Crosshair */}
                            <div
                                className="absolute pointer-events-none"
                                style={{
                                    left: `${px}%`,
                                    top:  `${py}%`,
                                    transform: 'translate(-50%, -50%)',
                                }}
                            >
                                {/* Arms */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-10 bg-white/70 drop-shadow-md" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-[1px] bg-white/70 drop-shadow-md" />
                                {/* Centre dot */}
                                <div className="w-4 h-4 rounded-full border-2 border-white bg-white/30 shadow-lg" />
                            </div>
                        </div>

                        {/* Presets + Save */}
                        <div className="px-5 py-4 flex items-center justify-between gap-3 border-t border-white/10">
                            <div className="flex items-center gap-2 flex-wrap">
                                {PRESETS.map(p => (
                                    <button
                                        key={p.label}
                                        onClick={() => setPosition(p.value)}
                                        className={[
                                            'px-3 py-1.5 text-xs rounded-lg border transition-colors',
                                            position === p.value
                                                ? 'bg-white text-slate-900 border-white'
                                                : 'text-white/60 border-white/20 hover:border-white/50 hover:text-white',
                                        ].join(' ')}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || saved}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
                            >
                                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {saved ? '✓ Saved' : isSaving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
