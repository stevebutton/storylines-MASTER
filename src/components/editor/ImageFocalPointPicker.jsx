import React, { useRef } from 'react';

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

function parsePosition(value = '50% 50%') {
    const parts = value.split(' ');
    return {
        x: parseFloat(parts[0]) || 50,
        y: parseFloat(parts[1]) || 50,
    };
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

export default function ImageFocalPointPicker({ imageUrl, value = '50% 50%', onChange }) {
    const previewRef = useRef(null);
    const isDragging = useRef(false);
    const { x, y } = parsePosition(value);

    const computePosition = (e) => {
        const rect = previewRef.current.getBoundingClientRect();
        const px = clamp((e.clientX - rect.left) / rect.width * 100, 0, 100);
        const py = clamp((e.clientY - rect.top) / rect.height * 100, 0, 100);
        return { px, py };
    };

    const handlePointerDown = (e) => {
        isDragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        const { px, py } = computePosition(e);
        onChange(`${Math.round(px)}% ${Math.round(py)}%`);
    };

    const handlePointerMove = (e) => {
        if (!isDragging.current) return;
        const { px, py } = computePosition(e);
        onChange(`${Math.round(px)}% ${Math.round(py)}%`);
    };

    const handlePointerUp = (e) => {
        if (!isDragging.current) return;
        isDragging.current = false;
        const { px, py } = computePosition(e);
        onChange(`${Math.round(px)}% ${Math.round(py)}%`);
    };

    return (
        <div className="space-y-2">
            {/* Live preview */}
            <div
                ref={previewRef}
                className="relative w-full aspect-video rounded-md overflow-hidden cursor-crosshair bg-slate-200 select-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {imageUrl && (
                    <img
                        src={imageUrl}
                        draggable={false}
                        className="w-full h-full object-cover pointer-events-none select-none"
                        style={{ objectPosition: value }}
                        alt=""
                    />
                )}
                {/* Crosshair dot */}
                <div
                    className="absolute w-5 h-5 rounded-full bg-white border-2 border-amber-500 shadow-md pointer-events-none"
                    style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)',
                    }}
                />
            </div>

            {/* 3×3 preset grid */}
            <div className="grid grid-cols-3 gap-1">
                {PRESETS.map((row, ri) =>
                    row.map((preset, ci) => {
                        const isActive = value === preset;
                        return (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => onChange(preset)}
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
        </div>
    );
}
