import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const PULSE_STYLE = `
@keyframes hotspot-pulse {
    0%   { box-shadow: 0 0 0 0px  rgba(217,119,6,0.8), 0 2px 8px rgba(0,0,0,0.3); }
    70%  { box-shadow: 0 0 0 22px rgba(217,119,6,0),   0 2px 8px rgba(0,0,0,0.3); }
    100% { box-shadow: 0 0 0 0px  rgba(217,119,6,0),   0 2px 8px rgba(0,0,0,0.3); }
}
.hotspot-pulse { animation: hotspot-pulse 1.8s ease-out infinite; }
`;

export default function ImageHotspotPicker({ imageUrl, x, y, title, body, onChange }) {
    const containerRef = useRef(null);

    const handleClick = (e) => {
        const rect = containerRef.current.getBoundingClientRect();
        const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        onChange({ x: nx, y: ny, title: title || '', body: body || '' });
    };

    const handleClear = () => {
        onChange({ x: null, y: null, title: '', body: '' });
    };

    const hasPosition = x != null && y != null;

    return (
        <div className="space-y-2 max-w-[600px]">
            <style>{PULSE_STYLE}</style>

            {/* Image preview */}
            <div
                ref={containerRef}
                className="relative w-full aspect-video rounded-md overflow-hidden cursor-crosshair bg-slate-200 select-none"
                onClick={handleClick}
            >
                {imageUrl && (
                    <img
                        src={imageUrl}
                        draggable={false}
                        className="w-full h-full object-cover pointer-events-none select-none"
                        alt=""
                    />
                )}
                {hasPosition && (
                    <div
                        className="hotspot-pulse absolute rounded-full bg-amber-500 pointer-events-none"
                        style={{
                            width: 20,
                            height: 20,
                            border: '2px solid white',
                            boxSizing: 'border-box',
                            left: `${x * 100}%`,
                            top: `${y * 100}%`,
                            transform: 'translate(-50%, -50%)',
                        }}
                    />
                )}
                {!hasPosition && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs text-slate-400 bg-white/70 rounded px-2 py-1">Click to place hotspot</span>
                    </div>
                )}
            </div>

            {/* Text fields */}
            <div className="space-y-2">
                <div>
                    <Label className="text-xs mb-1 block">Hotspot Title</Label>
                    <Input
                        value={title}
                        onChange={(e) => onChange({ x, y, title: e.target.value, body })}
                        placeholder="Label for this point of interest"
                        className="h-8 text-xs"
                        disabled={!hasPosition}
                    />
                </div>
                <div>
                    <Label className="text-xs mb-1 block">Hotspot Details</Label>
                    <textarea
                        value={body}
                        onChange={(e) => onChange({ x, y, title, body: e.target.value })}
                        placeholder="Additional details shown on hover..."
                        rows={3}
                        disabled={!hasPosition}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                </div>
                {hasPosition && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClear}
                        className="h-7 text-xs text-slate-500 hover:text-red-500 px-2"
                    >
                        <X className="w-3 h-3 mr-1" /> Clear hotspot
                    </Button>
                )}
            </div>
        </div>
    );
}
