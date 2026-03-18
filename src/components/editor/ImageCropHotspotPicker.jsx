import React, { useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

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
    hotspotX,
    hotspotY,
    hotspotTitle = '',
    hotspotBody = '',
    onHotspotChange,
}) {
    const [mode, setMode] = useState('crop');
    const containerRef = useRef(null);
    const isDragging = useRef(false);

    const { x: fpX, y: fpY } = parsePosition(imagePosition);
    const hasHotspot = hotspotX != null && hotspotY != null;

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

    // ── Hotspot handler ────────────────────────────────────────────────────────
    const handleClick = (e) => {
        if (mode !== 'hotspot') return;
        const rect = containerRef.current.getBoundingClientRect();
        const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const ny = Math.max(0, Math.min(1, (e.clientY - rect.top)  / rect.height));
        onHotspotChange({ x: nx, y: ny, title: hotspotTitle, body: hotspotBody });
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
                    Hotspot
                    {hasHotspot && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    )}
                </button>
            </div>

            {/* Single image preview */}
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

                {/* Hotspot mode — amber pulse dot */}
                {mode === 'hotspot' && hasHotspot && (
                    <div
                        className="hotspot-pulse absolute rounded-full bg-amber-500 pointer-events-none"
                        style={{
                            width: 20,
                            height: 20,
                            border: '2px solid white',
                            boxSizing: 'border-box',
                            left: `${hotspotX * 100}%`,
                            top: `${hotspotY * 100}%`,
                            transform: 'translate(-50%, -50%)',
                        }}
                    />
                )}

                {/* Hotspot mode — placement hint */}
                {mode === 'hotspot' && !hasHotspot && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs text-slate-400 bg-white/70 rounded px-2 py-1">
                            Click to place hotspot
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

            {/* Hotspot mode — title / body inputs */}
            {mode === 'hotspot' && (
                <div className="space-y-2">
                    <div>
                        <Label className="text-xs mb-1 block">Hotspot Title</Label>
                        <Input
                            value={hotspotTitle}
                            onChange={(e) => onHotspotChange({ x: hotspotX, y: hotspotY, title: e.target.value, body: hotspotBody })}
                            placeholder="Label for this point of interest"
                            className="h-8 text-xs"
                            disabled={!hasHotspot}
                        />
                    </div>
                    <div>
                        <Label className="text-xs mb-1 block">Hotspot Details</Label>
                        <textarea
                            value={hotspotBody}
                            onChange={(e) => onHotspotChange({ x: hotspotX, y: hotspotY, title: hotspotTitle, body: e.target.value })}
                            placeholder="Additional details shown on hover..."
                            rows={3}
                            disabled={!hasHotspot}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                        />
                    </div>
                    {hasHotspot && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onHotspotChange({ x: null, y: null, title: '', body: '' })}
                            className="h-7 text-xs text-slate-500 hover:text-red-500 px-2"
                        >
                            <X className="w-3 h-3 mr-1" /> Clear hotspot
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
