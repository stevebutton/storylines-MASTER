import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'

// Same icon path data as MapContainer.jsx — duplicated here to avoid a shared
// import that would couple the Cesium and Mapbox bundles.
function getIconSvg(iconId) {
    const paths = {
        MapPin:        '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
        Info:          '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
        Flag:          '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
        Camera:        '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
        AlertTriangle: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
        Home:          '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
        Building2:     '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
        Star:          '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    }
    const inner = paths[iconId] || paths.MapPin
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
}

/**
 * Renders annotation pin markers as screen-space HTML overlays on a Cesium globe.
 *
 * Each frame a requestAnimationFrame loop projects the 3D Cartesian position of
 * every pin to window coordinates via Cesium.SceneTransforms.worldToWindowCoordinates,
 * then repositions the absolute-placed DOM element to match.  This keeps pins
 * locked to their geographic position during all camera moves.
 *
 * @param {Cesium.Viewer|null}    viewer        - Cesium viewer instance
 * @param {React.RefObject}       containerRef  - ref to the Cesium container <div>
 * @param {Array}                 annotations   - slide.map_annotations array
 */
export function useCesiumAnnotations(viewer, containerRef, annotations) {
    const markersRef     = useRef([])   // [{ el, position: Cesium.Cartesian3 }]
    const rafRef         = useRef(null)
    const activePopupRef = useRef(null)

    useEffect(() => {
        // ── Cleanup previous state ───────────────────────────────────────────
        markersRef.current.forEach(m => m.el.remove())
        markersRef.current = []
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        if (activePopupRef.current) {
            activePopupRef.current.remove()
            activePopupRef.current = null
        }

        if (!viewer || viewer.isDestroyed() || !containerRef?.current) return
        if (!annotations?.length) return

        const container = containerRef.current

        const closePopup = () => {
            if (activePopupRef.current) {
                activePopupRef.current.remove()
                activePopupRef.current = null
            }
        }

        // ── Build a DOM element for each annotation ──────────────────────────
        annotations.forEach(ann => {
            if (ann.lat == null || ann.lng == null || isNaN(ann.lat) || isNaN(ann.lng)) return

            // 50 m altitude — floats above terrain without needing async sampleHeight
            const position = Cesium.Cartesian3.fromDegrees(ann.lng, ann.lat, 50)

            const isCustom = typeof ann.icon === 'string' && ann.icon.startsWith('http')
            const color    = ann.color || '#d97706'

            const el = document.createElement('div')
            el.style.cssText = [
                'position:absolute',
                'cursor:pointer', 'z-index:15',
                'pointer-events:auto',
                'transform:translate(-50%,-50%)',
                'display:none',
                'opacity:0',
                'transition:opacity 0.45s ease',
            ].join(';')

            let scaleTarget

            if (isCustom) {
                // Transparent PNG: render at natural size directly — no circle wrapper
                const img = document.createElement('img')
                img.src = ann.icon
                img.style.cssText = 'display:block;transition:transform 0.15s ease;'
                el.appendChild(img)
                scaleTarget = img
            } else {
                // Built-in icon: 36px coloured circle with white SVG icon
                el.style.width  = '36px'
                el.style.height = '36px'
                const inner = document.createElement('div')
                inner.style.cssText = [
                    'width:36px', 'height:36px', 'border-radius:50%',
                    `background:${color}`,
                    'border:2px solid white',
                    'box-shadow:0 2px 8px rgba(0,0,0,0.5)',
                    'display:flex', 'align-items:center', 'justify-content:center',
                    'transition:transform 0.15s ease',
                ].join(';')
                inner.innerHTML = getIconSvg(ann.icon)
                el.appendChild(inner)
                scaleTarget = inner
            }

            el.addEventListener('mouseenter', () => {
                scaleTarget.style.transform = 'scale(1.05)'

                if (!ann.title?.trim() && !ann.body?.trim()) return
                closePopup()

                const rect    = el.getBoundingClientRect()
                const popup   = document.createElement('div')
                popup.setAttribute('data-annotation-popup', '1')
                popup.style.cssText = [
                    'position:fixed',
                    `left:${rect.left + rect.width / 2}px`,
                    `top:${rect.bottom + 18}px`,
                    'transform:translateX(-50%) translateY(-4px)',
                    'z-index:20000',
                    'min-width:160px', 'max-width:260px',
                    'background:rgba(0,0,0,0.30)',
                    'backdrop-filter:blur(6px)',
                    '-webkit-backdrop-filter:blur(6px)',
                    'border:1px solid rgba(255,255,255,0.70)',
                    'border-radius:12px',
                    'padding:14px 20px 16px',
                    'pointer-events:none',
                    'opacity:0',
                    'transition:opacity 180ms ease, transform 180ms ease',
                ].join(';')

                const hasTitle = ann.title?.trim()
                const hasBody  = ann.body?.trim()
                popup.innerHTML = [
                    '<div style="position:absolute;top:-5px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:5px solid rgba(255,255,255,0.70);"></div>',
                    hasTitle ? `<div style="font-size:15px;font-weight:600;color:white;line-height:1.4;${hasBody ? 'margin-bottom:6px;' : ''}">${hasTitle}</div>` : '',
                    hasBody  ? `<div style="font-size:13px;color:rgba(255,255,255,0.8);line-height:1.55;">${hasBody}</div>` : '',
                ].join('')

                document.body.appendChild(popup)
                activePopupRef.current = popup

                requestAnimationFrame(() => requestAnimationFrame(() => {
                    if (popup.isConnected) {
                        popup.style.opacity = '1'
                        popup.style.transform = 'translateX(-50%) translateY(0)'
                    }
                }))
            })

            el.addEventListener('mouseleave', () => {
                scaleTarget.style.transform = 'scale(1)'
                closePopup()
            })

            el.addEventListener('click', (e) => {
                e.stopPropagation()
                if (!viewer || viewer.isDestroyed()) return
                // Convert Mapbox zoom → approximate altitude; Mapbox pitch → Cesium pitch
                const alt = ann.zoom != null
                    ? Math.max(100, Math.round(35000000 / Math.pow(2, ann.zoom)))
                    : 1500
                const cesiumPitch = ann.pitch != null
                    ? Cesium.Math.toRadians(ann.pitch - 90)
                    : Cesium.Math.toRadians(-30)
                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(ann.lng, ann.lat, alt),
                    orientation: {
                        heading: Cesium.Math.toRadians(ann.bearing ?? 0),
                        pitch:   cesiumPitch,
                        roll:    0,
                    },
                    duration: 4,
                })
            })

            container.appendChild(el)
            markersRef.current.push({ el, position })
        })

        // ── rAF loop: project positions to screen coords each frame ──────────
        const tick = () => {
            if (!viewer || viewer.isDestroyed()) return

            markersRef.current.forEach(({ el, position }) => {
                const screenPos = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, position)
                if (screenPos) {
                    el.style.left = `${screenPos.x}px`
                    el.style.top  = `${screenPos.y}px`
                    if (el.style.display === 'none') {
                        el.style.display = 'block'
                        requestAnimationFrame(() => { el.style.opacity = '1' })
                    }
                } else {
                    el.style.display = 'none'
                    el.style.opacity = '0'
                }
            })

            rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)

        return () => {
            const toFade = markersRef.current.slice()
            markersRef.current = []
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            rafRef.current = null
            if (activePopupRef.current) {
                activePopupRef.current.remove()
                activePopupRef.current = null
            }
            // Fade out then remove
            toFade.forEach(({ el }) => { el.style.opacity = '0' })
            setTimeout(() => { toFade.forEach(({ el }) => el.remove()) }, 480)
        }
    }, [viewer, annotations]) // eslint-disable-line react-hooks/exhaustive-deps
}
