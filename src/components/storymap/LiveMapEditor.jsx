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

    // Photo/EXIF location — drives the marker dot on the map.
    // Only written to DB when user explicitly clicks "Set Marker Location".
    const [coordinates, setCoordinates] = useState(null);
    const [coordinatesModified, setCoordinatesModified] = useState(false);

    // Camera center — where the map flies to during playback.
    // Independent of the marker; captured automatically by "Capture View".
    const [cameraCenter, setCameraCenter] = useState(null);
    const [cameraCenterModified, setCameraCenterModified] = useState(false);

    const [isPickingLocation, setIsPickingLocation] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const markerRef = useRef(null);
    const clickHandlerRef = useRef(null);

    // Place or move the amber marker dot at the photo/EXIF coordinate
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

    // Cancel pick mode — removes the click listener and resets the cursor
    const cancelPickMode = () => {
        const map = mapInstanceRef?.current;
        if (clickHandlerRef.current && map) {
            map.off('click', clickHandlerRef.current);
            clickHandlerRef.current = null;
            map.getCanvas().style.cursor = '';
        }
        setIsPickingLocation(false);
    };

    // Snap the map to a specific center + orientation (no offset — user composes freely)
    const previewOnMap = (z, b, p, center) => {
        const map = mapInstanceRef?.current;
        if (!map || !center) return;
        map.easeTo({
            center: [center[1], center[0]],   // Mapbox expects [lng, lat]
            zoom: z,
            bearing: b,
            pitch: p,
            offset: [0, 0],
            duration: 0
        });
    };

    // When editor opens or slide changes: sync all state from the slide record
    useEffect(() => {
        if (!isOpen || !activeSlide) return;
        const z  = activeSlide.zoom          ?? 12;
        const b  = activeSlide.bearing       ?? 0;
        const p  = activeSlide.pitch         ?? 0;
        const fd = activeSlide.fly_duration  ?? 8;
        const coords = activeSlide.coordinates   ?? null;
        const cc     = activeSlide.camera_center ?? null;

        setZoom(z);
        setBearing(b);
        setPitch(p);
        setFlyDuration(fd);
        setCoordinates(coords);
        setCoordinatesModified(false);
        setCameraCenter(cc);
        setCameraCenterModified(false);
        cancelPickMode();

        const map = mapInstanceRef?.current;
        updateMarker(map, coords);

        // Preview using camera_center if stored, else fall back to photo coordinates
        const previewCenter = cc ?? coords;
        previewOnMap(z, b, p, previewCenter);
    }, [isOpen, activeSlide?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Remove marker and cancel pick mode when the editor closes
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
        // Preview re-uses whichever camera center is currently active
        const center = cameraCenter ?? activeSlide?.camera_center ?? activeSlide?.coordinates;
        previewOnMap(z, b, p, center);
    };

    // Capture View: reads orientation (zoom/bearing/pitch) AND map center → camera_center
    const captureMapPosition = () => {
        const map = mapInstanceRef?.current;
        if (!map) { toast.error('Map not ready'); return; }
        const z = Math.round(map.getZoom() * 10) / 10;
        const b = Math.round(map.getBearing());
        const p = Math.round(map.getPitch());
        const mc = map.getCenter();
        const newCenter = [mc.lat, mc.lng];
        setZoom(z);
        setBearing(b);
        setPitch(p);
        setCameraCenter(newCenter);
        setCameraCenterModified(true);
        toast.success('View captured');
    };

    // Enter pick mode: next map click pins the photo/marker location
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
            toast.success('Marker location pinned');
        };

        clickHandlerRef.current = handler;
        map.on('click', handler);
    };

    const handleSave = async () => {
        if (!activeSlide?.id) { toast.error('No slide selected'); return; }
        setIsSaving(true);
        try {
            const updateData = { zoom, bearing, pitch, fly_duration: flyDuration };
            // camera_center: only write if captured in this session
            if (cameraCenterModified && cameraCenter) updateData.camera_center = cameraCenter;
            // coordinates (marker/EXIF): only write if user explicitly re-pinned it
            if (coordinatesModified && coordinates) updateData.coordinates = coordinates;
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

    // Which camera center are we currently using? (for display)
    const activeCameraCenter = cameraCenter ?? activeSlide?.camera_center ?? null;

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

                        {/* Capture View — orientation + camera center */}
                        <div>
                            <button
                                onClick={captureMapPosition}
                                className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors"
                            >
                                <Crosshair className="w-4 h-4" />
                                Capture View
                            </button>
                            <p className="text-[10px] text-slate-400 text-center mt-0.5">
                                Captures zoom, bearing, pitch &amp; camera centre
                            </p>
                            {activeCameraCenter && (
                                <p className="text-[10px] text-slate-400 text-center font-mono">
                                    cam: {activeCameraCenter[0].toFixed(4)}, {activeCameraCenter[1].toFixed(4)}
                                    {cameraCenterModified && <span className="text-amber-500"> *</span>}
                                </p>
                            )}
                        </div>

                        {/* Set Marker Location — pick-to-pin photo/EXIF point */}
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
                                    Set Marker Location
                                </button>
                            )}
                            <p className="text-[10px] text-slate-400 text-center mt-0.5">
                                {isPickingLocation
                                    ? 'Click the exact spot on the map'
                                    : 'Moves the amber marker dot (photo location)'}
                            </p>
                            {coordinates && (
                                <p className="text-[10px] text-slate-400 text-center font-mono">
                                    pin: {coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}
                                    {coordinatesModified && <span className="text-amber-500"> *</span>}
                                </p>
                            )}
                        </div>

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
