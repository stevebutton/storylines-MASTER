import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crosshair, MapPin, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

export default function LiveMapEditor({ isOpen, onClose, activeSlide, mapInstanceRef, onSlideSave }) {
    const [zoom, setZoom] = useState(12);
    const [bearing, setBearing] = useState(0);
    const [pitch, setPitch] = useState(0);
    const [flyDuration, setFlyDuration] = useState(8);

    // coordinates drives both the flyTo target and the amber marker dot.
    // With no camera offset, map.getCenter() == the correct flyTo centre,
    // so "Capture View" writes directly here.
    const [coordinates, setCoordinates] = useState(null);
    const [coordinatesModified, setCoordinatesModified] = useState(false);

    const [isPickingLocation, setIsPickingLocation] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [justCaptured, setJustCaptured] = useState(false);

    const markerRef = useRef(null);
    const clickHandlerRef = useRef(null);

    // Place or move the amber dot at the current coordinates
    const updateMarker = (map, coords) => {
        if (!coords || !map) {
            markerRef.current?.remove();
            markerRef.current = null;
            return;
        }
        if (markerRef.current) {
            markerRef.current.setLngLat([coords[1], coords[0]]);
        } else {
            const el = document.createElement('div');
            el.style.cssText = [
                'width:14px', 'height:14px', 'border-radius:50%',
                'background:#f59e0b', 'border:2px solid white',
                'box-shadow:0 1px 4px rgba(0,0,0,0.5)',
                'pointer-events:none'
            ].join(';');
            markerRef.current = new mapboxgl.Marker({ element: el })
                .setLngLat([coords[1], coords[0]])
                .addTo(map);
        }
    };

    const cancelPickMode = () => {
        const map = mapInstanceRef?.current;
        if (clickHandlerRef.current && map) {
            map.off('click', clickHandlerRef.current);
            clickHandlerRef.current = null;
            map.getCanvas().style.cursor = '';
        }
        setIsPickingLocation(false);
    };

    // Snap the map to the current slide's saved state (no offset)
    const previewOnMap = (z, b, p, coords) => {
        const map = mapInstanceRef?.current;
        const c = coords ?? activeSlide?.coordinates;
        if (!map || !c) return;
        map.easeTo({
            center: [c[1], c[0]],
            zoom: z,
            bearing: b,
            pitch: p,
            offset: [0, 0],
            duration: 0
        });
    };

    // Sync from slide record when editor opens or slide changes
    useEffect(() => {
        if (!isOpen || !activeSlide) return;
        const z  = activeSlide.zoom         ?? 12;
        const b  = activeSlide.bearing      ?? 0;
        const p  = activeSlide.pitch        ?? 0;
        const fd = activeSlide.fly_duration ?? 8;
        const c  = activeSlide.coordinates  ?? null;
        setZoom(z);
        setBearing(b);
        setPitch(p);
        setFlyDuration(fd);
        setCoordinates(c);
        setCoordinatesModified(false);
        cancelPickMode();
        const map = mapInstanceRef?.current;
        updateMarker(map, c);
        previewOnMap(z, b, p, c);
    }, [isOpen, activeSlide?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Clean up on close
    useEffect(() => {
        if (!isOpen) {
            cancelPickMode();
            markerRef.current?.remove();
            markerRef.current = null;
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSliderChange = (field, value) => {
        let z = zoom, b = bearing, p = pitch;
        if (field === 'zoom')        { setZoom(value);    z = value; }
        if (field === 'bearing')     { setBearing(value); b = value; }
        if (field === 'pitch')       { setPitch(value);   p = value; }
        if (field === 'flyDuration') { setFlyDuration(value); }
        previewOnMap(z, b, p, coordinates);
    };

    // Capture View: reads zoom, bearing, pitch AND map centre (flyTo target).
    // The amber dot moves to the new centre — use Pin Location to set a precise point instead.
    const captureMapPosition = () => {
        // Update state immediately so the button reacts even if map calls fail
        setJustCaptured(true);
        setTimeout(() => setJustCaptured(false), 1500);

        const map = mapInstanceRef?.current;
        if (!map) {
            toast.error('Map not ready — try scrolling the story first');
            return;
        }

        try {
            const z = Math.round(map.getZoom() * 10) / 10;
            const b = Math.round(map.getBearing());
            const p = Math.round(map.getPitch());
            const mc = map.getCenter();
            const newCoords = [mc.lat, mc.lng];
            setZoom(z);
            setBearing(b);
            setPitch(p);
            setCoordinates(newCoords);
            setCoordinatesModified(true);
            // Move amber dot to show the new flyTo centre
            try { updateMarker(map, newCoords); } catch (_) {}
            toast.success(`Captured — zoom ${z}, bearing ${b}°, pitch ${p}°`);
        } catch (err) {
            toast.error('Capture failed: ' + (err?.message || 'unknown error'));
        }
    };

    // Pick mode: click a precise location on the map → becomes the flyTo target
    const startPickMode = () => {
        const map = mapInstanceRef?.current;
        if (!map) { toast.error('Map not ready'); return; }
        cancelPickMode();
        setIsPickingLocation(true);
        map.getCanvas().style.cursor = 'crosshair';

        const handler = (e) => {
            const newCoords = [e.lngLat.lat, e.lngLat.lng];
            setCoordinates(newCoords);
            setCoordinatesModified(true);
            updateMarker(map, newCoords);
            map.off('click', handler);
            map.getCanvas().style.cursor = '';
            clickHandlerRef.current = null;
            setIsPickingLocation(false);
            toast.success('Location pinned');
        };

        clickHandlerRef.current = handler;
        map.on('click', handler);
    };

    const handleSave = async () => {
        if (!activeSlide?.id) { toast.error('No slide selected'); return; }
        setIsSaving(true);
        try {
            const patchData = { zoom, bearing, pitch, fly_duration: flyDuration };
            if (coordinatesModified && coordinates) patchData.coordinates = coordinates;
            // Send the full slide object so base44 doesn't silently discard partial-update fields
            const fullUpdateData = { ...activeSlide, ...patchData };
            console.log('[LiveMapEditor] Saving slide', activeSlide.id, patchData, 'chapter_id:', activeSlide.chapter_id);
            const result = await base44.entities.Slide.update(activeSlide.id, fullUpdateData);
            console.log('[LiveMapEditor] Save result:', result?.zoom, result?.bearing, result?.pitch);
            if (onSlideSave) onSlideSave(activeSlide.id, patchData);
            toast.success(`Saved — zoom ${zoom.toFixed(1)}, bearing ${bearing}°, pitch ${pitch}°`);
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
                        <button onClick={onClose} className="ml-2 shrink-0 text-slate-400 hover:text-slate-700 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Sliders */}
                    <div className="px-4 py-3 space-y-3">
                        <SliderRow label="Zoom" value={zoom} min={1} max={20} step={0.5}
                            display={zoom.toFixed(1)} onChange={v => handleSliderChange('zoom', v)} />
                        <SliderRow label="Bearing" value={bearing} min={-180} max={180} step={1}
                            display={`${bearing}°`} onChange={v => handleSliderChange('bearing', v)} />
                        <SliderRow label="Pitch" value={pitch} min={0} max={85} step={1}
                            display={`${pitch}°`} onChange={v => handleSliderChange('pitch', v)} />
                        <SliderRow label="Fly (s)" value={flyDuration} min={1} max={20} step={0.5}
                            display={`${flyDuration}s`} onChange={v => handleSliderChange('flyDuration', v)} />
                    </div>

                    {/* Buttons */}
                    <div className="px-4 pb-3 space-y-2">

                        {/* Capture View — orientation + centre */}
                        <div>
                            <button
                                onClick={captureMapPosition}
                                className={`w-full py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                                    justCaptured
                                        ? 'bg-green-100 text-green-800 border border-green-300'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                            >
                                <Crosshair className="w-4 h-4" />
                                {justCaptured ? 'Captured ✓' : 'Capture View'}
                            </button>
                            <p className="text-[10px] text-slate-400 text-center mt-0.5">
                                {justCaptured
                                    ? `zoom ${zoom.toFixed(1)}  bearing ${bearing}°  pitch ${pitch}°`
                                    : 'Captures zoom, bearing, pitch & map centre (dot moves)'}
                            </p>
                        </div>

                        {/* Set Location — click-to-pin flyTo target */}
                        <div>
                            {isPickingLocation ? (
                                <button
                                    onClick={cancelPickMode}
                                    className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel — click map to pin
                                </button>
                            ) : (
                                <button
                                    onClick={startPickMode}
                                    className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700 flex items-center justify-center gap-2 transition-colors"
                                >
                                    <MapPin className="w-4 h-4" />
                                    Pin Location
                                </button>
                            )}
                            <p className="text-[10px] text-slate-400 text-center mt-0.5">
                                {isPickingLocation
                                    ? 'Click the exact spot on the map'
                                    : 'Click a precise point as the flyTo target'}
                            </p>
                        </div>

                        {coordinates && (
                            <p className="text-[10px] text-slate-400 text-center font-mono pt-0.5">
                                {coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}
                                {coordinatesModified && <span className="text-amber-500"> *</span>}
                            </p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 pb-4 flex gap-2 justify-end border-t border-slate-100 pt-3">
                        <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
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
            <Slider min={min} max={max} step={step} value={[value]}
                onValueChange={([v]) => onChange(v)} className="flex-1" />
            <span className="text-xs font-mono text-slate-700 w-[40px] text-right shrink-0">{display}</span>
        </div>
    );
}
