import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Cesium from 'cesium'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { X, Crosshair, Save, ZoomIn, ZoomOut, Search, MapPin, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/api/supabaseClient'
import { setViewInstant, flyToPromise } from './flyToPromise'

const RAD_TO_DEG = 180 / Math.PI
const GOOGLE_KEY  = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const ORBIT_RAD_PER_SEC = Cesium.Math.toRadians(0.5)  // 0.5°/s — full rotation ≈ 12 min

/** Estimate a sensible camera altitude from a Google Geocoding viewport. */
function altitudeFromViewport(viewport, lat) {
    const latSpan = Math.abs(viewport.northeast.lat - viewport.southwest.lat) * 111111
    const lngSpan = Math.abs(viewport.northeast.lng - viewport.southwest.lng) * 111111
        * Math.cos(lat * Math.PI / 180)
    const span = Math.max(latSpan, lngSpan)
    return Math.round(Math.max(300, Math.min(80000, span * 0.55)))
}

/**
 * CesiumMapEditor — live slide-camera editor for photorealistic-3d stories.
 *
 * Props:
 *   isOpen       — controlled open state
 *   onClose      — called when panel should close
 *   activeSlide  — current slide record (read cesium_camera from it)
 *   viewerRef    — ref populated by useCesiumViewer with the live Cesium Viewer
 *   onSlideSave  — (slideId, { cesium_camera }) called after a successful save
 */
export default function CesiumMapEditor({ isOpen, onClose, activeSlide, viewerRef, onSlideSave }) {
    const [heading,  setHeading]  = useState(0)
    const [pitch,    setPitch]    = useState(-35)
    const [alt,      setAlt]      = useState(5000)
    const [lat,      setLat]      = useState(null)
    const [lng,      setLng]      = useState(null)
    const [duration, setDuration] = useState(3)
    const [justCaptured, setJustCaptured] = useState(false)
    const [isSaving,     setIsSaving]     = useState(false)
    const [isOrbiting,   setIsOrbiting]   = useState(false)

    // Search state
    const [searchQuery,   setSearchQuery]   = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [isSearching,   setIsSearching]   = useState(false)

    // Holds the orbit cleanup function while orbiting
    const orbitRef = useRef(null)

    // ── Orbit ────────────────────────────────────────────────────────────────

    const stopOrbit = () => {
        if (orbitRef.current) {
            orbitRef.current()
            orbitRef.current = null
        }
        setIsOrbiting(false)
    }

    const startOrbit = () => {
        const v = viewerRef?.current
        if (!v) return

        // Clean up any previous orbit first
        if (orbitRef.current) { orbitRef.current(); orbitRef.current = null }

        const canvas   = v.scene.canvas
        const centerPx = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2)

        // Find the screen-centre point on the scene mesh
        let surfacePoint = v.scene.pickPosition(centerPx)
        if (!Cesium.defined(surfacePoint)) {
            const ray = v.camera.getPickRay(centerPx)
            const hit = Cesium.IntersectionTests.rayEllipsoid(ray, Cesium.Ellipsoid.WGS84)
            if (!hit) { toast.error('Cannot orbit — navigate to a location first'); return }
            surfacePoint = Cesium.Ray.getPoint(ray, hit.start, new Cesium.Cartesian3())
        }

        // Project the orbit centre to the ellipsoid surface (height = 0).
        // This keeps the orbit arc above terrain — if we orbited around a point
        // on a rooftop or hillside, the arc would clip through the mesh on the far side.
        const targetCarto  = Cesium.Cartographic.fromCartesian(surfacePoint)
        targetCarto.height = 0
        const target       = Cesium.Cartographic.toCartesian(targetCarto)

        // Compute heading / pitch / range from camera to the sea-level target
        const diff   = Cesium.Cartesian3.subtract(v.camera.position, target, new Cesium.Cartesian3())
        const range  = Cesium.Cartesian3.magnitude(diff)
        const enu    = Cesium.Transforms.eastNorthUpToFixedFrame(target)
        const invEnu = Cesium.Matrix4.inverseTransformation(enu, new Cesium.Matrix4())
        const local  = Cesium.Matrix4.multiplyByPointAsVector(invEnu, diff, new Cesium.Cartesian3())

        let         orbitHeading = Math.atan2(local.x, local.y)
        const horizMag           = Math.sqrt(local.x * local.x + local.y * local.y)
        // Clamp minimum pitch to 8° above horizontal to prevent underground camera
        const orbitPitch         = Math.max(Cesium.Math.toRadians(8), Math.atan2(local.z, horizMag))

        // Time-based speed (frame-rate independent); cap dt to avoid jump after tab backgrounding
        let lastMs = Date.now()

        const sub = v.scene.postRender.addEventListener(() => {
            const now = Date.now()
            const dt  = Math.min((now - lastMs) / 1000, 0.1)
            lastMs = now
            orbitHeading += ORBIT_RAD_PER_SEC * dt
            v.camera.lookAt(target, new Cesium.HeadingPitchRange(orbitHeading, orbitPitch, range))
        })

        // Stop when the user interacts with the map
        const stopOnInteract = () => stopOrbit()
        canvas.addEventListener('pointerdown', stopOnInteract)
        canvas.addEventListener('wheel',       stopOnInteract, { passive: true })

        orbitRef.current = () => {
            sub()  // remove postRender listener
            canvas.removeEventListener('pointerdown', stopOnInteract)
            canvas.removeEventListener('wheel',       stopOnInteract)
            try {
                if (!v.isDestroyed()) v.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
            } catch { /* ignore */ }
        }

        setIsOrbiting(true)
    }

    // ── Slide sync ───────────────────────────────────────────────────────────

    useEffect(() => {
        // Stop orbit whenever the slide changes or the editor closes/opens
        stopOrbit()

        if (!isOpen || !activeSlide) return

        const cam = activeSlide.cesium_camera
        const v   = viewerRef?.current

        if (cam?.lat != null) {
            setHeading(cam.heading  ?? 0)
            setPitch(cam.pitch      ?? -35)
            setAlt(cam.alt          ?? 5000)
            setLat(cam.lat)
            setLng(cam.lng)
            setDuration(cam.duration ?? 3)
        } else if (v) {
            const c   = v.camera
            const pos = c.positionCartographic
            setHeading(Math.round((c.heading * RAD_TO_DEG + 360) % 360))
            setPitch(Math.max(-90, Math.min(0, Math.round(c.pitch * RAD_TO_DEG))))
            setAlt(Math.max(1, Math.round(pos.height)))
            setLat(pos.latitude  * RAD_TO_DEG)
            setLng(pos.longitude * RAD_TO_DEG)
            setDuration(3)
        }

        setSearchQuery('')
        setSearchResults([])

        return () => {
            // Stop orbit on cleanup (slide change, unmount)
            if (orbitRef.current) { orbitRef.current(); orbitRef.current = null }
        }
    }, [isOpen, activeSlide?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Camera preview ───────────────────────────────────────────────────────

    const previewCamera = (h, p, a, la, lo) => {
        const v = viewerRef?.current
        if (!v || la == null || lo == null) return
        setViewInstant(v, { lat: la, lng: lo, alt: a, heading: h, pitch: p })
    }

    const handleSliderChange = (field, value) => {
        // Stop orbit before any manual slider adjustment
        if (isOrbiting) stopOrbit()
        let h = heading, p = pitch, a = alt
        if (field === 'heading')  { setHeading(value);  h = value }
        if (field === 'pitch')    { setPitch(value);    p = value }
        if (field === 'duration') { setDuration(value); return }
        previewCamera(h, p, a, lat, lng)
    }

    // ── Capture ──────────────────────────────────────────────────────────────

    const captureView = () => {
        const v = viewerRef?.current
        if (!v) { toast.error('Viewer not ready'); return }

        const cam = v.camera
        const pos = cam.positionCartographic
        const h   = Math.round((cam.heading * RAD_TO_DEG + 360) % 360)
        const p   = Math.max(-90, Math.min(0, Math.round(cam.pitch * RAD_TO_DEG)))
        const a   = Math.round(pos.height)
        const la  = pos.latitude  * RAD_TO_DEG
        const lo  = pos.longitude * RAD_TO_DEG

        setHeading(h); setPitch(p); setAlt(Math.max(1, a)); setLat(la); setLng(lo)
        setJustCaptured(true)
        setTimeout(() => setJustCaptured(false), 1500)
        toast.success(`Captured — heading ${h}°, pitch ${p}°, alt ${a.toLocaleString()} m`)
    }

    // ── Save ─────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!activeSlide?.id) { toast.error('No slide selected'); return }

        // Stop orbit before saving so the camera is at the desired pose
        stopOrbit()

        const v = viewerRef?.current
        let saveLat = lat, saveLng = lng, saveAlt = alt
        let saveHeading = heading, savePitch = pitch

        if (v) {
            const c   = v.camera
            const pos = c.positionCartographic
            saveHeading = Math.round((c.heading * RAD_TO_DEG + 360) % 360)
            savePitch   = Math.max(-90, Math.min(0, Math.round(c.pitch * RAD_TO_DEG)))
            saveAlt     = Math.max(1, Math.round(pos.height))
            saveLat     = pos.latitude  * RAD_TO_DEG
            saveLng     = pos.longitude * RAD_TO_DEG
            setHeading(saveHeading); setPitch(savePitch); setAlt(saveAlt)
            setLat(saveLat);         setLng(saveLng)
        } else if (saveLat == null) {
            toast.error('Viewer not ready — try again')
            return
        }

        setIsSaving(true)
        try {
            const cesium_camera = {
                lat: saveLat, lng: saveLng, alt: saveAlt,
                heading: saveHeading, pitch: savePitch, duration,
            }
            const { error } = await supabase
                .from('slides')
                .update({ cesium_camera })
                .eq('id', activeSlide.id)
            if (error) throw error
            if (onSlideSave) onSlideSave(activeSlide.id, { cesium_camera })
            toast.success(`Saved — ${saveHeading}°  ${savePitch}°  ${saveAlt.toLocaleString()} m`)
        } catch {
            toast.error('Failed to save slide')
        } finally {
            setIsSaving(false)
        }
    }

    // ── Search ───────────────────────────────────────────────────────────────

    useEffect(() => {
        const q = searchQuery.trim()
        if (q.length < 2) { setSearchResults([]); return }
        const timer = setTimeout(async () => {
            setIsSearching(true)
            try {
                const res  = await fetch(
                    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${GOOGLE_KEY}`
                )
                const data = await res.json()
                setSearchResults(data.results?.slice(0, 6) || [])
            } catch (e) {
                console.error('Geocode failed:', e)
            } finally {
                setIsSearching(false)
            }
        }, 450)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const selectResult = (r) => {
        const v = viewerRef?.current
        const { lat: rLat, lng: rLng } = r.geometry.location
        const rAlt = altitudeFromViewport(r.geometry.viewport, rLat)
        if (v) {
            flyToPromise(v, { lat: rLat, lng: rLng, alt: rAlt, heading: 0, pitch: -35, duration: 2 })
        }
        setLat(rLat); setLng(rLng); setAlt(rAlt)
        setHeading(0); setPitch(-35)
        setSearchResults([])
        setSearchQuery(r.formatted_address)
    }

    // ── Render ───────────────────────────────────────────────────────────────

    const slideLabel  = activeSlide?.title ? `"${activeSlide.title}"` : 'Current Slide'
    const hasPosition = (lat != null && lng != null) || viewerRef?.current != null

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ type: 'tween', duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="fixed left-0 z-[9990] bg-slate-900/95 border border-white/20 shadow-2xl"
                    style={{ top: 220, width: 380 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <div className="min-w-0">
                            <div className="text-[10px] font-medium text-white/50 uppercase tracking-widest">Map Editor · 3D</div>
                            <div className="text-sm font-medium text-white truncate">{slideLabel}</div>
                        </div>
                        <button onClick={onClose} className="ml-2 shrink-0 text-white/40 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Sliders */}
                    <div className="px-4 py-3 space-y-3.5">
                        <SliderRow
                            label="Heading"
                            value={heading} min={0} max={359} step={1}
                            display={`${heading}°`}
                            onChange={v => handleSliderChange('heading', v)}
                        />
                        <SliderRow
                            label="Pitch"
                            value={pitch} min={-90} max={0} step={1}
                            display={`${pitch}°`}
                            onChange={v => handleSliderChange('pitch', v)}
                        />
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-white/50 w-[52px] shrink-0">Alt (m)</span>
                            <button
                                onClick={() => {
                                    if (isOrbiting) stopOrbit()
                                    const v = Math.max(50, Math.round(alt / 1.5))
                                    setAlt(v); previewCamera(heading, pitch, v, lat, lng)
                                }}
                                title="Zoom in"
                                className="shrink-0 w-6 h-6 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors"
                            >
                                <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <input
                                type="number"
                                value={alt}
                                min={50}
                                step={100}
                                onChange={e => {
                                    if (isOrbiting) stopOrbit()
                                    const v = Math.max(50, Number(e.target.value) || 50)
                                    setAlt(v); previewCamera(heading, pitch, v, lat, lng)
                                }}
                                className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-[11px] font-mono text-white/70 text-right focus:outline-none focus:border-white/40"
                            />
                            <button
                                onClick={() => {
                                    if (isOrbiting) stopOrbit()
                                    const v = Math.min(50_000_000, Math.round(alt * 1.5))
                                    setAlt(v); previewCamera(heading, pitch, v, lat, lng)
                                }}
                                title="Zoom out"
                                className="shrink-0 w-6 h-6 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors"
                            >
                                <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <SliderRow
                            label="Fly (s)"
                            value={duration} min={0} max={30} step={0.5}
                            display={`${duration}s`}
                            onChange={v => handleSliderChange('duration', v)}
                        />
                    </div>

                    {/* Capture + Orbit */}
                    <div className="px-4 pb-3">
                        <button
                            onClick={captureView}
                            className={`w-full py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                                justCaptured
                                    ? 'bg-white text-slate-900'
                                    : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
                            }`}
                        >
                            <Crosshair className="w-4 h-4 shrink-0" />
                            {justCaptured ? 'Captured ✓' : 'Capture View'}
                        </button>
                        <p className="text-xs text-white/55 text-center mt-1.5 leading-snug px-1">
                            {lat != null
                                ? `${lat.toFixed(4)}, ${lng.toFixed(4)} · ${alt.toLocaleString()} m`
                                : 'Navigate the 3D map, then capture to lock a position'}
                        </p>

                        {/* Auto-Orbit toggle */}
                        <button
                            onClick={isOrbiting ? stopOrbit : startOrbit}
                            className={`mt-2 w-full py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors border ${
                                isOrbiting
                                    ? 'bg-amber-500/15 border-amber-400/30 text-amber-300'
                                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70'
                            }`}
                        >
                            <RotateCcw className={`w-3 h-3 ${isOrbiting ? 'animate-spin' : ''}`} style={isOrbiting ? { animationDuration: '3s' } : {}} />
                            {isOrbiting ? 'Orbiting — click map to stop' : 'Auto-Orbit'}
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-4 pb-3 border-t border-white/10 pt-3 relative">
                        <div className="relative">
                            {isSearching
                                ? <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 animate-spin pointer-events-none" />
                                : <Search  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                            }
                            <input
                                type="text"
                                placeholder="Search location…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Escape' && setSearchResults([])}
                                className="w-full bg-white/10 border border-white/20 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
                            />
                        </div>

                        {searchResults.length > 0 && (
                            <div className="absolute left-4 right-4 bottom-full mb-1 bg-slate-800 border border-white/15 rounded-lg shadow-2xl z-[9999] max-h-48 overflow-y-auto">
                                {searchResults.map((r, i) => (
                                    <button
                                        key={i}
                                        onClick={() => selectResult(r)}
                                        className="w-full text-left px-3 py-2 text-xs text-white/80 hover:bg-white/10 flex items-start gap-2 border-b border-white/10 last:border-0"
                                    >
                                        <MapPin className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                                        <span className="leading-snug">{r.formatted_address}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 pb-4 flex gap-2 justify-end border-t border-white/10 pt-3">
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 text-xs text-white/55 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !activeSlide?.id || !hasPosition}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-white hover:bg-white/90 text-slate-900 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Saving…' : <><Save className="w-3 h-3" />Save</>}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function SliderRow({ label, value, min, max, step, display, onChange }) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-[11px] text-white/50 w-[52px] shrink-0">{label}</span>
            <SliderPrimitive.Root
                className="relative flex flex-1 touch-none select-none items-center"
                min={min} max={max} step={step} value={[value]}
                onValueChange={([v]) => onChange(v)}
            >
                <SliderPrimitive.Track className="relative h-[3px] w-full grow overflow-hidden rounded-full bg-white/20">
                    <SliderPrimitive.Range className="absolute h-full bg-white/60" />
                </SliderPrimitive.Track>
                <SliderPrimitive.Thumb className="block h-3.5 w-3.5 rounded-full bg-white shadow-md focus-visible:outline-none cursor-pointer" />
            </SliderPrimitive.Root>
            <span className="text-[11px] font-mono text-white/70 w-[40px] text-right shrink-0">{display}</span>
        </div>
    )
}
