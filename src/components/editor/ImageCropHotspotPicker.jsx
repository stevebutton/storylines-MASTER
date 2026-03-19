import React, { useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';

const PRESETS = [
    ['0% 0%',   '50% 0%',   '100% 0%'],
    ['0% 50%',  '50% 50%',  '100% 50%'],
    ['0% 100%', '50% 100%', '100% 100%'],
];
const LABELS = [
    ['↖', '↑', '↗'],
    ['←', '·', '→'],
    ['↙', '↓', '↘'],
];

const PULSE_STYLE = `
@keyframes hotspot-pulse {
    0%   { box-shadow: 0 0 0 0px  rgba(217,119,6,0.8), 0 2px 8px rgba(0,0,0,0.3); }
    70%  { box-shadow: 0 0 0 22px rgba(217,119,6,0),   0 2px 8px rgba(0,0,0,0.3); }
    100% { box-shadow: 0 0 0 0px  rgba(217,119,6,0),   0 2px 8px rgba(0,0,0,0.3); }
}
.hotspot-pulse { animation: hotspot-pulse 1.8s ease-out infinite; }
`;

function parsePosition(value = '50% 50%') {
    const parts = value.split(' ');
    return { x: parseFloat(parts[0]) || 50, y: parseFloat(parts[1]) || 50 };
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export default function ImageCropHotspotPicker({
    imageUrl,
    imagePosition = '50% 50%',
    onImagePositionChange,
    hotspots = [],
    onHotspotsChange,
}) {
    const [mode, setMode] = useState('crop');
    const [selectedIdx, setSelectedIdx] = useState(null);
    const containerRef = useRef(null);
    const isDragging = useRef(false);

    const { x: fpX, y: fpY } = parsePosition(imagePosition);

    // ── Crop handlers ──────────────────────────────────────────────────────────
    const computePos = (e) => {
        const rect = containerRef.current.getBoundingClientRect();
        return {
            px: clamp((e.clientX - rect.left) / rect.width  * 100, 0, 100),
            py: clamp((e.clientY - rect.top)  / rect.height * 100, 0, 100),
        };
    };

    const handlePointerDown = (e) => {
        if (mode !== 'crop') return;
        isDragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        const { px, py } = computePos(e);
        onImagePositionChange(`${Math.round(px)}% ${Math.round(py)}%`);
    };

    const handlePointerMove = (e) => {
        if (mode !== 'crop' || !isDragging.current) return;
        const { px, py } = computePos(e);
        onImagePositionChange(`${Math.round(px)}% ${Math.round(py)}%`);
    };

    const handlePointerUp = (e) => {
        if (mode !== 'crop' || !isDragging.current) return;
        isDragging.current = false;
        const { px, py } = computePos(e);
        onImagePositionChange(`${Math.round(px)}% ${Math.round(py)}%`);
    };

    // ── Hotspot click on image ─────────────────────────────────────────────────
    const handleClick = (e) => {
        if (mode !== 'hotspot') return;
        const rect = containerRef.current.getBoundingClientRect();
        const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const ny = Math.max(0, Math.min(1, (e.clientY - rect.top)  / rect.height));

        if (selectedIdx !== null) {
            // Move selected hotspot to clicked position
            const updated = hotspots.map((h, i) => i === selectedIdx ? { ...h, x: nx, y: ny } : h);
            onHotspotsChange(updated);
        } else if (hotspots.length < 3) {
            // Add new hotspot; auto-select it for editing
            const updated = [...hotspots, { x: nx, y: ny, title: '', body: '' }];
            onHotspotsChange(updated);
            setSelectedIdx(updated.length - 1);
        }
        // At max (3) with nothing selected: ignore click
    };

    const addHotspotAtCenter = () => {
        if (hotspots.length >= 3) return;
        const updated = [...hotspots, { x: 0.5, y: 0.5, title: '', body: '' }];
        onHotspotsChange(updated);
        setSelectedIdx(updated.length - 1);
    };

    const removeSelected = () => {
        if (selectedIdx === null) return;
        const updated = hotspots.filter((_, i) => i !== selectedIdx);
        onHotspotsChange(updated);
        setSelectedIdx(null);
    };

    const updateSelectedField = (field, value) => {
        if (selectedIdx === null) return;
        const updated = hotspots.map((h, i) => i === selectedIdx ? { ...h, [field]: value } : h);
        onHotspotsChange(updated);
    };

    return (
        <div className="space-y-2 max-w-[600px]">
            <style>{PULSE_STYLE}</style>

            {/* Mode toggle */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
                <button
                    type="button"
                    onClick={() => setMode('crop')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        mode === 'crop'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Crop Position
                </button>
                <button
                    type="button"
                    onClick={() => setMode('hotspot')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        mode === 'hotspot'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Hotspots
                    {hotspots.length > 0 && (
                        <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {hotspots.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Image preview */}
            <div
                ref={containerRef}
                className="relative w-full aspect-video rounded-md overflow-hidden cursor-crosshair bg-slate-200 select-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onClick={handleClick}
            >
                {imageUrl && (
                    <img
                        src={imageUrl}
                        draggable={false}
                        className="w-full h-full object-cover pointer-events-none select-none"
                        style={{ objectPosition: imagePosition }}
                        alt=""
                    />
                )}

                {/* Crop mode — focal point crosshair */}
                {mode === 'crop' && (
                    <div
                        className="absolute w-5 h-5 rounded-full bg-white border-2 border-amber-500 shadow-md pointer-events-none"
                        style={{
                            left: `${fpX}%`,
                            top: `${fpY}%`,
                            transform: 'translate(-50%, -50%)',
                        }}
                    />
                )}

                {/* Hotspot mode — numbered dots */}
                {mode === 'hotspot' && hotspots.map((h, i) => (
                    <div
                        key={i}
                        className="hotspot-pulse absolute rounded-full bg-amber-500 flex items-center justify-center"
                        style={{
                            width: 24,
                            height: 24,
                            border: selectedIdx === i ? '3px solid white' : '2px solid white',
                            boxSizing: 'border-box',
                            left: `${h.x * 100}%`,
                            top: `${h.y * 100}%`,
                            transform: 'translate(-50%, -50%)',
                            outline: selectedIdx === i ? '2px solid #f59e0b' : 'none',
                            outlineOffset: 2,
                            zIndex: 10,
                            cursor: 'pointer',
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIdx(prev => prev === i ? null : i);
                        }}
                    >
                        <span className="text-white text-[9px] font-bold select-none">{i + 1}</span>
                    </div>
                ))}

                {/* Hotspot hints */}
                {mode === 'hotspot' && hotspots.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs text-slate-400 bg-white/70 rounded px-2 py-1">
                            Click to place hotspot
                        </span>
                    </div>
                )}
                {mode === 'hotspot' && hotspots.length > 0 && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                        <span className="text-xs text-slate-500 bg-white/80 rounded px-2 py-1">
                            {selectedIdx !== null
                                ? `Click image to move hotspot ${selectedIdx + 1}`
                                : hotspots.length < 3
                                    ? 'Click image to add · Click dot to edit'
                                    : 'Max 3 hotspots · Click dot to edit'}
                        </span>
                    </div>
                )}
            </div>

            {/* Crop mode — 3×3 preset grid */}
            {mode === 'crop' && (
                <div className="grid grid-cols-3 gap-1">
                    {PRESETS.map((row, ri) =>
                        row.map((preset, ci) => {
                            const isActive = imagePosition === preset;
                            return (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => onImagePositionChange(preset)}
                                    className={`h-7 rounded text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {LABELS[ri][ci]}
                                </button>
                            );
                        })
                    )}
                </div>
            )}

            {/* Hotspot mode — selector tabs + edit form */}
            {mode === 'hotspot' && (
                <div className="space-y-2">
                    {/* Hotspot selector row */}
                    <div className="flex gap-1 flex-wrap">
                        {hotspots.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setSelectedIdx(prev => prev === i ? null : i)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    selectedIdx === i
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700'
                                }`}
                            >
                                Hotspot {i + 1}
                            </button>
                        ))}
                        {hotspots.length < 3 && (
                            <button
                                type="button"
                                onClick={addHotspotAtCenter}
                                className="px-2 py-1 rounded text-xs text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> Add
                            </button>
                        )}
                    </div>

                    {/* Edit form for selected hotspot */}
                    {selectedIdx !== null && hotspots[selectedIdx] && (
                        <>
                            <div>
                                <Label className="text-xs mb-1 block">Hotspot Title</Label>
                                <Input
                                    value={hotspots[selectedIdx].title || ''}
                                    onChange={(e) => updateSelectedField('title', e.target.value)}
                                    placeholder="Label for this point of interest"
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div>
                                <Label className="text-xs mb-1 block">Hotspot Details</Label>
                                <textarea
                                    value={hotspots[selectedIdx].body || ''}
                                    onChange={(e) => updateSelectedField('body', e.target.value)}
                                    placeholder="Additional details shown on click…"
                                    rows={3}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={removeSelected}
                                className="h-7 text-xs text-slate-500 hover:text-red-500 px-2"
                            >
                                <X className="w-3 h-3 mr-1" /> Remove hotspot {selectedIdx + 1}
                            </Button>
                        </>
                    )}

                    {hotspots.length === 0 && (
                        <p className="text-xs text-slate-400 italic">Click the image above to place up to 3 hotspots.</p>
                    )}
                </div>
            )}
        </div>
    );
}
