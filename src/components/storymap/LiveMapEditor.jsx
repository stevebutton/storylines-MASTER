import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crosshair, MapPin, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

export default function LiveMapEditor({ isOpen, onClose, activeSlide, mapInstanceRef, onSlideUpdate, onSlideSave }) {
    const [zoom, setZoom] = useState(12);
    const [bearing, setBearing] = useState(0);
    const [pitch, setPitch] = useState(0);
    const [flyDuration, setFlyDuration] = useState(8);
    const [coordinates, setCoordinates] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Sync panel values from active slide when it changes
    useEffect(() => {
        if (!activeSlide) return;
        setZoom(activeSlide.zoom ?? 12);
        setBearing(activeSlide.bearing ?? 0);
        setPitch(activeSlide.pitch ?? 0);
        setFlyDuration(activeSlide.fly_duration ?? 8);
        setCoordinates(activeSlide.coordinates ?? null);
    }, [activeSlide?.id]);

    const handleSliderChange = (field, value) => {
        const updates = { zoom, bearing, pitch, fly_duration: flyDuration };
        if (field === 'zoom')        { setZoom(value);        updates.zoom = value; }
        if (field === 'bearing')     { setBearing(value);     updates.bearing = value; }
        if (field === 'pitch')       { setPitch(value);       updates.pitch = value; }
        if (field === 'flyDuration') { setFlyDuration(value); updates.fly_duration = value; }
        if (onSlideUpdate) onSlideUpdate(updates);
    };

    const captureMapPosition = () => {
        const map = mapInstanceRef?.current;
        if (!map) { toast.error('Map not ready'); return; }
        const center = map.getCenter();
        setZoom(Math.round(map.getZoom() * 10) / 10);
        setBearing(Math.round(map.getBearing()));
        setPitch(Math.round(map.getPitch()));
        setCoordinates([center.lat, center.lng]);
        toast.success('Map position captured');
    };

    const setSlideCoordinates = () => {
        const map = mapInstanceRef?.current;
        if (!map) { toast.error('Map not ready'); return; }
        const center = map.getCenter();
        setCoordinates([center.lat, center.lng]);
        toast.success('Coordinates set');
    };

    const handleSave = async () => {
        if (!activeSlide?.id) { toast.error('No slide selected'); return; }
        setIsSaving(true);
        try {
            const updateData = { zoom, bearing, pitch, fly_duration: flyDuration };
            if (coordinates) updateData.coordinates = coordinates;
            await base44.entities.Slide.update(activeSlide.id, updateData);
            if (onSlideSave) onSlideSave(activeSlide.id, updateData);
            toast.success('Slide saved');
        } catch {
            toast.error('Failed to save slide');
        } finally {
            setIsSaving(false);
        }
    };

    const slideLabel = activeSlide?.title ? `"${activeSlide.title}"` : 'Current Slide';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                    className="fixed bottom-[76px] right-6 z-[9990] w-[300px] bg-white/97 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/60"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <div className="min-w-0">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Map Editor</div>
                            <div className="text-sm font-medium text-slate-800 truncate">{slideLabel}</div>
                        </div>
                        <button
                            onClick={onClose}
                            className="ml-2 shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Sliders */}
                    <div className="px-4 py-3 space-y-3">
                        <SliderRow label="Zoom" value={zoom} min={1} max={20} step={0.5}
                            display={zoom.toFixed(1)}
                            onChange={v => handleSliderChange('zoom', v)} />
                        <SliderRow label="Bearing" value={bearing} min={-180} max={180} step={1}
                            display={`${bearing}°`}
                            onChange={v => handleSliderChange('bearing', v)} />
                        <SliderRow label="Pitch" value={pitch} min={0} max={85} step={1}
                            display={`${pitch}°`}
                            onChange={v => handleSliderChange('pitch', v)} />
                        <SliderRow label="Fly (s)" value={flyDuration} min={1} max={20} step={0.5}
                            display={`${flyDuration}s`}
                            onChange={v => handleSliderChange('flyDuration', v)} />
                    </div>

                    {/* Action buttons */}
                    <div className="px-4 pb-3 space-y-2">
                        <button
                            onClick={captureMapPosition}
                            className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700 flex items-center justify-center gap-2 transition-colors"
                        >
                            <Crosshair className="w-4 h-4" />
                            Capture Map Position
                        </button>
                        <button
                            onClick={setSlideCoordinates}
                            className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700 flex items-center justify-center gap-2 transition-colors"
                        >
                            <MapPin className="w-4 h-4" />
                            Set Slide Coordinates
                        </button>
                        {coordinates && (
                            <p className="text-[11px] text-slate-400 text-center font-mono">
                                {coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}
                            </p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 pb-4 flex gap-2 justify-end border-t border-slate-100 pt-3">
                        <Button size="sm" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving || !activeSlide?.id}
                            className="bg-slate-800 hover:bg-slate-700 text-white"
                        >
                            {isSaving ? 'Saving…' : <><Save className="w-3 h-3 mr-1" />Save</>}
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function SliderRow({ label, value, min, max, step, display, onChange }) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-[52px] shrink-0">{label}</span>
            <Slider
                min={min}
                max={max}
                step={step}
                value={[value]}
                onValueChange={([v]) => onChange(v)}
                className="flex-1"
            />
            <span className="text-xs font-mono text-slate-700 w-[40px] text-right shrink-0">{display}</span>
        </div>
    );
}
