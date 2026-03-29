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
                'width:36px', 'height:36px',
                'cursor:pointer', 'z-index:15',
                'pointer-events:auto',
                'transform:translate(-50%,-50%)',
                'display:none',
            ].join(';')

            el.innerHTML = `<div style="
                width:36px;height:36px;border-radius:50%;
                background:${isCustom ? 'white' : color};
                border:2px solid ${isCustom ? color : 'white'};
                box-shadow:0 2px 8px rgba(0,0,0,0.5);
                display:flex;align-items:center;justify-content:center;
                transition:transform 0.15s ease;
            ">${isCustom
                ? `<img src="${ann.icon}" style="width:22px;height:22px;object-fit:contain;border-radius:2px;">`
                : getIconSvg(ann.icon)
            }</div>`

            const inner = el.firstElementChild

            el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.1)' })
            el.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)' })

            el.addEventListener('click', (e) => {
                e.stopPropagation()
                closePopup()

                if (!ann.title && !ann.body) return

                // Position popup relative to marker's current screen position
                const cx = parseFloat(el.style.left)
                const cy = parseFloat(el.style.top)

                const popup = document.createElement('div')
                popup.setAttribute('data-annotation-popup', '1')
                popup.style.cssText = [
                    'position:absolute',
                    `left:${cx}px`,
                    `top:${cy}px`,
                    'background:rgba(2,6,23,0.92)',
                    'backdrop-filter:blur(12px)',
                    'border:1px solid rgba(255,255,255,0.15)',
                    'border-radius:12px',
                    'padding:10px 14px',
                    'min-width:140px', 'max-width:200px',
                    'pointer-events:none', 'z-index:100',
                    'transform:translateX(-50%) translateY(calc(-100% - 10px))',
                    'opacity:0', 'transition:opacity 0.15s ease',
                ].join(';')

                popup.innerHTML = [
                    ann.title ? `<div style="font-size:13px;font-weight:600;color:white;margin-bottom:${ann.body ? '4px' : '0'}">${ann.title}</div>` : '',
                    ann.body  ? `<div style="font-size:12px;color:rgba(255,255,255,0.7)">${ann.body}</div>`  : '',
                    '<div style="position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid rgba(2,6,23,0.92)"></div>',
                ].join('')

                container.appendChild(popup)
                activePopupRef.current = popup

                // Fade in via double-rAF (forces a paint cycle before opacity change)
                requestAnimationFrame(() => requestAnimationFrame(() => { popup.style.opacity = '1' }))

                // Close on next click anywhere
                setTimeout(() => document.addEventListener('click', closePopup, { once: true }), 0)
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
                    el.style.left    = `${screenPos.x}px`
                    el.style.top     = `${screenPos.y}px`
                    el.style.display = 'block'
                } else {
                    el.style.display = 'none'
                }
            })

            rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)

        return () => {
            markersRef.current.forEach(m => m.el.remove())
            markersRef.current = []
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            if (activePopupRef.current) {
                activePopupRef.current.remove()
                activePopupRef.current = null
            }
        }
    }, [viewer, annotations]) // eslint-disable-line react-hooks/exhaustive-deps
}
