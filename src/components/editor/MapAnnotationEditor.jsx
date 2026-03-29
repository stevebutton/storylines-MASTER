import React, { useState, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Info, Flag, Camera, AlertTriangle, Home, Building2, Star, Trash2, X, Map, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import MediaLibraryDialog from '@/components/editor/MediaLibraryDialog';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_KEY || 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';
mapboxgl.accessToken = MAPBOX_TOKEN;

const ICON_SET = [
    { id: 'MapPin',        icon: MapPin },
    { id: 'Info',          icon: Info },
    { id: 'Flag',          icon: Flag },
    { id: 'Camera',        icon: Camera },
    { id: 'AlertTriangle', icon: AlertTriangle },
    { id: 'Home',          icon: Home },
    { id: 'Building2',     icon: Building2 },
    { id: 'Star',          icon: Star },
];

const COLOR_PALETTE = [
    '#d97706', '#2563eb', '#16a34a', '#9333ea',
    '#e11d48', '#0d9488', '#ffffff', '#64748b',
];

const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);

export default function MapAnnotationEditor({ annotations = [], onChange, storyId }) {
    // Media library picker (custom icon image)
    const [mediaPickerAnnotationId, setMediaPickerAnnotationId] = useState(null);

    // Full-screen map picker
    const [mapPickerAnnotationId, setMapPickerAnnotationId] = useState(null);
    const [pickerQuery, setPickerQuery]             = useState('');
    const [pickerResults, setPickerResults]         = useState([]);
    const [pickerShowResults, setPickerShowResults] = useState(false);
    const [pickerLat, setPickerLat]                 = useState('');
    const [pickerLng, setPickerLng]                 = useState('');
    const [pickerView, setPickerView]               = useState(null); // { zoom, bearing, pitch }
    const pickerMapContainerRef = useRef(null);
    const pickerMapRef          = useRef(null);
    const pickerMarkerRef       = useRef(null);
    const pickerSearchTimer     = useRef(null);

    // ── Annotation helpers ───────────────────────────────────────────────────
    const update = (id, patch) => {
        onChange(annotations.map(a => a.id === id ? { ...a, ...patch } : a));
    };

    const remove = (id) => {
        onChange(annotations.filter(a => a.id !== id));
    };

    const addPin = () => {
        if (annotations.length >= 5) return;
        onChange([...annotations, {
            id: generateId(),
            lat: null, lng: null,
            icon: 'MapPin', color: '#d97706',
            title: '', body: '',
        }]);
    };

    // ── Map picker ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!mapPickerAnnotationId) return;

        const initMap = () => {
            if (!pickerMapContainerRef.current) return;

            const ann    = annotations.find(a => a.id === mapPickerAnnotationId);
            const hasPos  = ann?.lat != null && ann?.lng != null;
            const center  = hasPos ? [ann.lng, ann.lat] : [20, 5];
            const initZoom    = ann?.zoom    ?? (hasPos ? 8 : 2);
            const initBearing = ann?.bearing ?? 0;
            const initPitch   = ann?.pitch   ?? 0;

            // Seed lat/lng inputs and view from existing annotation values
            setPickerLat(hasPos ? String(ann.lat) : '');
            setPickerLng(hasPos ? String(ann.lng) : '');
            setPickerView(ann?.zoom != null ? { zoom: ann.zoom, bearing: initBearing, pitch: initPitch } : null);

            pickerMapRef.current = new mapboxgl.Map({
                container: pickerMapContainerRef.current,
                style: 'mapbox://styles/stevebutton/clummsfw1002701mpbiw3exg7',
                center,
                zoom:    initZoom,
                bearing: initBearing,
                pitch:   initPitch,
                interactive: true,
            });

            pickerMapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

            if (hasPos) {
                pickerMarkerRef.current = new mapboxgl.Marker({ color: ann.color || '#d97706' })
                    .setLngLat([ann.lng, ann.lat])
                    .addTo(pickerMapRef.current);
            }

            pickerMapRef.current.on('click', (e) => {
                const { lng, lat } = e.lngLat;
                setPickerLat(lat.toFixed(6));
                setPickerLng(lng.toFixed(6));
                if (pickerMarkerRef.current) {
                    pickerMarkerRef.current.setLngLat([lng, lat]);
                } else {
                    const a = annotations.find(x => x.id === mapPickerAnnotationId);
                    pickerMarkerRef.current = new mapboxgl.Marker({ color: a?.color || '#d97706' })
                        .setLngLat([lng, lat])
                        .addTo(pickerMapRef.current);
                }
            });
        };

        const raf = requestAnimationFrame(initMap);

        return () => {
            cancelAnimationFrame(raf);
            if (pickerMapRef.current) {
                pickerMapRef.current.remove();
                pickerMapRef.current    = null;
                pickerMarkerRef.current = null;
            }
        };
    }, [mapPickerAnnotationId]); // eslint-disable-line react-hooks/exhaustive-deps

    const closePicker = () => {
        setMapPickerAnnotationId(null);
        setPickerQuery('');
        setPickerResults([]);
        setPickerShowResults(false);
        setPickerLat('');
        setPickerLng('');
        setPickerView(null);
    };

    const confirmPickerLocation = () => {
        if (!mapPickerAnnotationId) { closePicker(); return; }
        let lat, lng;
        if (pickerMarkerRef.current) {
            ({ lat, lng } = pickerMarkerRef.current.getLngLat());
        } else {
            lat = parseFloat(pickerLat);
            lng = parseFloat(pickerLng);
        }
        if (!isNaN(lat) && !isNaN(lng)) {
            const patch = { lat, lng };
            if (pickerView) {
                patch.zoom    = parseFloat(pickerView.zoom.toFixed(2));
                patch.bearing = Math.round(pickerView.bearing);
                patch.pitch   = Math.round(pickerView.pitch);
            }
            update(mapPickerAnnotationId, patch);
        }
        closePicker();
    };

    const capturePickerView = () => {
        if (!pickerMapRef.current) return;
        const center  = pickerMapRef.current.getCenter();
        const zoom    = pickerMapRef.current.getZoom();
        const bearing = pickerMapRef.current.getBearing();
        const pitch   = pickerMapRef.current.getPitch();
        // Move pin to current map centre so the view matches the pin location
        setPickerLat(center.lat.toFixed(6));
        setPickerLng(center.lng.toFixed(6));
        if (pickerMarkerRef.current) {
            pickerMarkerRef.current.setLngLat([center.lng, center.lat]);
        } else {
            const ann = annotations.find(a => a.id === mapPickerAnnotationId);
            pickerMarkerRef.current = new mapboxgl.Marker({ color: ann?.color || '#d97706' })
                .setLngLat([center.lng, center.lat])
                .addTo(pickerMapRef.current);
        }
        setPickerView({ zoom, bearing, pitch });
    };

    // Geocode search inside picker
    const handlePickerSearch = (query) => {
        setPickerQuery(query);
        if (pickerSearchTimer.current) clearTimeout(pickerSearchTimer.current);
        if (!query.trim()) { setPickerResults([]); setPickerShowResults(false); return; }
        pickerSearchTimer.current = setTimeout(async () => {
            try {
                const res  = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5`);
                const data = await res.json();
                setPickerResults(data.features || []);
                setPickerShowResults(true);
            } catch {
                setPickerResults([]);
            }
        }, 350);
    };

    const selectPickerResult = (feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        setPickerLat(lat.toFixed(6));
        setPickerLng(lng.toFixed(6));
        if (pickerMapRef.current) {
            pickerMapRef.current.flyTo({ center: [lng, lat], zoom: 12, duration: 800 });
        }
        if (pickerMarkerRef.current) {
            pickerMarkerRef.current.setLngLat([lng, lat]);
        } else if (pickerMapRef.current) {
            const ann = annotations.find(a => a.id === mapPickerAnnotationId);
            pickerMarkerRef.current = new mapboxgl.Marker({ color: ann?.color || '#d97706' })
                .setLngLat([lng, lat])
                .addTo(pickerMapRef.current);
        }
        setPickerQuery(feature.place_name);
        setPickerResults([]);
        setPickerShowResults(false);
    };

    // Manual lat/lng inputs in modal
    const moveMarkerTo = (lat, lng) => {
        if (isNaN(lat) || isNaN(lng)) return;
        if (pickerMarkerRef.current) {
            pickerMarkerRef.current.setLngLat([lng, lat]);
        } else if (pickerMapRef.current) {
            const ann = annotations.find(a => a.id === mapPickerAnnotationId);
            pickerMarkerRef.current = new mapboxgl.Marker({ color: ann?.color || '#d97706' })
                .setLngLat([lng, lat])
                .addTo(pickerMapRef.current);
        }
        if (pickerMapRef.current) {
            pickerMapRef.current.easeTo({ center: [lng, lat], duration: 400 });
        }
    };

    const handlePickerLatChange = (val) => {
        setPickerLat(val);
        moveMarkerTo(parseFloat(val), parseFloat(pickerLng));
    };

    const handlePickerLngChange = (val) => {
        setPickerLng(val);
        moveMarkerTo(parseFloat(pickerLat), parseFloat(val));
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            {annotations.map((ann) => {
                const isCustomIcon = typeof ann.icon === 'string' && ann.icon.startsWith('http');
                const hasLocation  = ann.lat != null && ann.lng != null;

                return (
                    <div key={ann.id} className="border rounded-lg p-4 bg-white space-y-3 relative">

                        {/* Trash */}
                        <button
                            type="button"
                            onClick={() => remove(ann.id)}
                            className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Icon */}
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Icon</p>
                            <div className="flex flex-wrap gap-2 items-center">
                                {ICON_SET.map(({ id, icon: Icon }) => {
                                    const isSelected = !isCustomIcon && ann.icon === id;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => update(ann.id, { icon: id })}
                                            title={id}
                                            style={{
                                                width: 28, height: 28, borderRadius: 6,
                                                border: isSelected ? `2px solid ${ann.color}` : '2px solid #e2e8f0',
                                                background: isSelected ? ann.color : '#f8fafc',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', flexShrink: 0,
                                            }}
                                        >
                                            <Icon size={14} color={isSelected ? '#fff' : '#64748b'} />
                                        </button>
                                    );
                                })}

                                {isCustomIcon ? (
                                    <div className="flex items-center gap-1 ml-1">
                                        <img
                                            src={ann.icon}
                                            alt="custom icon"
                                            style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, border: `2px solid ${ann.color}` }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => update(ann.id, { icon: 'MapPin' })}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                            title="Remove custom icon"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setMediaPickerAnnotationId(ann.id)}
                                        className="ml-1 text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap"
                                    >
                                        Custom image
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Color */}
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Color</p>
                            <div className="flex gap-2 flex-wrap">
                                {COLOR_PALETTE.map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => update(ann.id, { color })}
                                        style={{
                                            width: 20, height: 20, borderRadius: '50%',
                                            background: color,
                                            border: ann.color === color ? '3px solid #1e293b' : '2px solid #e2e8f0',
                                            outline: ann.color === color ? '2px solid white' : 'none',
                                            outlineOffset: '-4px',
                                            cursor: 'pointer', flexShrink: 0,
                                        }}
                                        title={color}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Title */}
                        <Input
                            value={ann.title || ''}
                            onChange={(e) => update(ann.id, { title: e.target.value })}
                            placeholder="Title"
                        />

                        {/* Body */}
                        <textarea
                            value={ann.body || ''}
                            onChange={(e) => update(ann.id, { body: e.target.value })}
                            placeholder="Description..."
                            rows={2}
                            className="w-full text-sm border border-input rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background"
                        />

                        {/* Location — dominant Pick on Map button */}
                        <div>
                            <button
                                type="button"
                                onClick={() => setMapPickerAnnotationId(ann.id)}
                                style={{
                                    width: '100%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: 8,
                                    padding: '10px 16px',
                                    background: '#d97706',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'background 0.15s ease',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#b45309'}
                                onMouseLeave={e => e.currentTarget.style.background = '#d97706'}
                            >
                                <Map size={16} />
                                {hasLocation ? 'Edit Location on Map' : 'Pick Location on Map'}
                            </button>
                            {hasLocation && (
                                <div className="mt-2 space-y-0.5">
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {ann.lat.toFixed(5)}, {ann.lng.toFixed(5)}
                                    </p>
                                    {ann.zoom != null && (
                                        <p className="text-xs text-slate-400">
                                            Click flies to: Zoom {ann.zoom.toFixed(1)} · Bearing {Math.round(ann.bearing || 0)}° · Pitch {Math.round(ann.pitch || 0)}°
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            <Button
                type="button"
                variant="outline"
                onClick={addPin}
                disabled={annotations.length >= 5}
                className="w-full"
            >
                + Add Map Pin
            </Button>

            {/* Media library — custom icon picker */}
            <MediaLibraryDialog
                storyId={storyId}
                isOpen={!!mediaPickerAnnotationId}
                onClose={() => setMediaPickerAnnotationId(null)}
                mode="picker"
                accept="image"
                onSelect={(url) => {
                    if (mediaPickerAnnotationId) update(mediaPickerAnnotationId, { icon: url });
                    setMediaPickerAnnotationId(null);
                }}
            />

            {/* Full-screen map location picker */}
            {mapPickerAnnotationId && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 400000, display: 'flex', flexDirection: 'column' }}>

                    {/* Header bar */}
                    <div style={{
                        background: '#0f172a',
                        padding: '10px 14px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        flexShrink: 0,
                        position: 'relative',
                        zIndex: 1,
                    }}>
                        {/* Row 1: Search + Set Location + Close */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#94a3b8', pointerEvents: 'none' }} />
                                <input
                                    value={pickerQuery}
                                    onChange={(e) => handlePickerSearch(e.target.value)}
                                    placeholder="Search location…"
                                    style={{
                                        width: '100%', boxSizing: 'border-box',
                                        paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                                        background: '#1e293b', color: 'white', border: '1px solid #334155',
                                        borderRadius: 8, fontSize: 14, outline: 'none',
                                    }}
                                />
                                {pickerShowResults && pickerResults.length > 0 && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                                        background: 'white', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                                        overflow: 'hidden', zIndex: 10,
                                    }}>
                                        {pickerResults.map(f => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => selectPickerResult(f)}
                                                style={{
                                                    width: '100%', textAlign: 'left', padding: '9px 14px',
                                                    fontSize: 13, color: '#1e293b', borderBottom: '1px solid #f1f5f9',
                                                    background: 'white', cursor: 'pointer', display: 'block',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                            >
                                                {f.place_name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={confirmPickerLocation}
                                style={{
                                    background: '#d97706', color: 'white', border: 'none',
                                    borderRadius: 8, padding: '8px 18px', fontSize: 13,
                                    fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                                }}
                            >
                                Set Location
                            </button>

                            <button
                                type="button"
                                onClick={closePicker}
                                style={{
                                    background: 'transparent', border: '1px solid #334155', color: '#94a3b8',
                                    borderRadius: 8, padding: '7px 10px', cursor: 'pointer', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <X style={{ width: 16, height: 16 }} />
                            </button>
                        </div>

                        {/* Row 2: Lat / Lng manual inputs */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Lat</span>
                            <input
                                type="number"
                                value={pickerLat}
                                onChange={(e) => handlePickerLatChange(e.target.value)}
                                placeholder="0.000000"
                                step="0.000001"
                                style={{
                                    flex: 1, padding: '6px 10px',
                                    background: '#1e293b', color: 'white',
                                    border: '1px solid #334155', borderRadius: 6,
                                    fontSize: 13, outline: 'none',
                                }}
                            />
                            <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Lng</span>
                            <input
                                type="number"
                                value={pickerLng}
                                onChange={(e) => handlePickerLngChange(e.target.value)}
                                placeholder="0.000000"
                                step="0.000001"
                                style={{
                                    flex: 1, padding: '6px 10px',
                                    background: '#1e293b', color: 'white',
                                    border: '1px solid #334155', borderRadius: 6,
                                    fontSize: 13, outline: 'none',
                                }}
                            />
                        </div>
                    </div>

                    {/* Map */}
                    <div ref={pickerMapContainerRef} style={{ flex: 1, position: 'relative' }}>
                        {/* Capture View button — top-left of map */}
                        <button
                            type="button"
                            onClick={capturePickerView}
                            style={{
                                position: 'absolute', top: 10, left: 10, zIndex: 10,
                                background: pickerView ? '#059669' : '#d97706',
                                color: 'white', border: 'none', borderRadius: 8,
                                padding: '7px 14px', fontSize: 12, fontWeight: 600,
                                cursor: 'pointer', whiteSpace: 'nowrap',
                                transition: 'background 0.15s ease',
                            }}
                        >
                            {pickerView
                                ? `✓ View · Zoom ${pickerView.zoom.toFixed(1)} · ${Math.round(pickerView.bearing)}° · Pitch ${Math.round(pickerView.pitch)}°`
                                : 'Capture View'}
                        </button>
                        <div style={{
                            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                            background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)',
                            color: 'white', fontSize: 12, padding: '6px 14px', borderRadius: 20,
                            pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap',
                        }}>
                            Click to place pin · Capture View to set fly-to camera
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
