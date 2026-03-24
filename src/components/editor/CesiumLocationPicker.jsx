import { useState, useRef, useEffect } from 'react'
import * as Cesium from 'cesium'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, MapPin, Loader2 } from 'lucide-react'
import { useCesiumViewer } from '@/components/cesium/useCesiumViewer'
import { setViewInstant } from '@/components/cesium/flyToPromise'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_KEY || 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A'

/**
 * Embedded Cesium viewer for selecting a chapter camera position.
 * Mirrors the EmbeddedLocationPicker API but for photorealistic-3d stories.
 *
 * Props:
 *   value    — cesium_camera object { lat, lng, alt, heading, pitch, duration } or null
 *   onChange — called with the updated cesium_camera object on capture
 */
export default function CesiumLocationPicker({ value, onChange }) {
    const containerRef = useRef(null)
    const [error, setError]               = useState(null)
    const [searchQuery, setSearchQuery]   = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [isSearching, setIsSearching]   = useState(false)
    const [captured, setCaptured]         = useState(value || null)
    const initialised = useRef(false)

    const viewer = useCesiumViewer(containerRef, setError)

    // Fly to existing position once viewer is ready
    useEffect(() => {
        if (!viewer || initialised.current) return
        initialised.current = true
        if (value?.lat != null && value?.lng != null && value?.alt != null) {
            setViewInstant(viewer, value)
        }
    }, [viewer])

    const captureView = () => {
        if (!viewer) return
        const cart = viewer.camera.positionCartographic
        const next = {
            lat:     parseFloat(Cesium.Math.toDegrees(cart.latitude).toFixed(6)),
            lng:     parseFloat(Cesium.Math.toDegrees(cart.longitude).toFixed(6)),
            alt:     Math.round(cart.height),
            heading: Math.round(Cesium.Math.toDegrees(viewer.camera.heading)),
            pitch:   Math.round(Cesium.Math.toDegrees(viewer.camera.pitch)),
            duration: captured?.duration ?? 3,
        }
        setCaptured(next)
        onChange(next)
    }

    const setDuration = (val) => {
        const next = { ...(captured || {}), duration: val === '' ? undefined : Number(val) }
        setCaptured(next)
        onChange(next)
    }

    const handleSearch = async () => {
        if (!searchQuery.trim()) return
        setIsSearching(true)
        try {
            const res = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=5`
            )
            const data = await res.json()
            setSearchResults(data.features || [])
        } catch (e) {
            console.error('Geocode failed:', e)
        } finally {
            setIsSearching(false)
        }
    }

    const selectResult = (result) => {
        const [lng, lat] = result.center
        if (viewer) {
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(lng, lat, 800),
                orientation: { heading: 0, pitch: Cesium.Math.toRadians(-35), roll: 0 },
                duration: 2,
            })
        }
        setSearchResults([])
        setSearchQuery(result.place_name)
    }

    return (
        <div className="space-y-3">
            {/* Search bar */}
            <div className="relative">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search for a location..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            className="pl-10"
                        />
                    </div>
                    <Button onClick={handleSearch} disabled={isSearching} variant="outline">
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                    </Button>
                </div>

                {searchResults.length > 0 && (
                    <div className="absolute top-full mt-1 w-full bg-white border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                        {searchResults.map(result => (
                            <button
                                key={result.id}
                                onClick={() => selectResult(result)}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-start gap-2 border-b last:border-0"
                            >
                                <MapPin className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                <span className="text-sm">{result.place_name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Viewer */}
            <div className="relative w-full h-96 rounded-lg overflow-hidden border bg-slate-900">
                <div ref={containerRef} className="absolute inset-0" />

                {/* Loading state */}
                {!viewer && !error && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 text-slate-400 text-sm pointer-events-none">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading 3D tiles…
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm text-center px-8 pointer-events-none">
                        {error}
                    </div>
                )}

                {/* Capture button */}
                {viewer && (
                    <div className="absolute top-2 left-2 z-10">
                        <Button
                            onClick={captureView}
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 shadow-lg"
                        >
                            <MapPin className="w-4 h-4 mr-2" />
                            Capture View
                        </Button>
                    </div>
                )}

                {/* Captured readout */}
                {captured?.lat != null && (
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white z-10 pointer-events-none">
                        <div className="font-medium mb-0.5">
                            {captured.lat.toFixed(4)}, {captured.lng.toFixed(4)}
                        </div>
                        <div className="text-white/70">
                            Alt: {captured.alt}m · Hdg: {captured.heading}° · Pitch: {captured.pitch}°
                        </div>
                    </div>
                )}
            </div>

            {/* Duration */}
            <div className="flex items-center gap-3">
                <Label className="text-xs text-slate-500 shrink-0">Flight duration (s)</Label>
                <Input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="3"
                    value={captured?.duration ?? ''}
                    onChange={e => setDuration(e.target.value)}
                    className="w-28"
                />
                <p className="text-xs text-slate-400">0 = instant cut</p>
            </div>
        </div>
    )
}
