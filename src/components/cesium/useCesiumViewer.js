import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

/**
 * Owns the full Cesium viewer lifecycle.
 * Returns the viewer instance once the Google 3D tileset has loaded,
 * or null while initialising / after destruction.
 *
 * Guarantees:
 *   - viewer.destroy() is always called in cleanup
 *   - showCreditsOnScreen: true is set (Google ToS requirement)
 *   - API key is read from VITE_GOOGLE_MAPS_API_KEY — never hardcoded
 */
export function useCesiumViewer(containerRef, onError, externalRef) {
    const viewerRef = useRef(null)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        if (!containerRef.current) return

        Cesium.GoogleMaps.defaultApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

        const viewer = new Cesium.Viewer(containerRef.current, {
            animation:            false,
            timeline:             false,
            baseLayerPicker:      false,
            fullscreenButton:     false,
            geocoder:             false,
            homeButton:           false,
            infoBox:              false,
            sceneModePicker:      false,
            selectionIndicator:   false,
            navigationHelpButton: false,
            skyBox:               false,
            skyAtmosphere:        new Cesium.SkyAtmosphere(),
            showCreditsOnScreen:  true,   // required by Google ToS
        })

        // cancelFlight() is called via canvas listeners once the tileset loads.
        // Start as a no-op so the cleanup function can always call it safely.
        let removeInteractListeners = () => {}

        Cesium.createGooglePhotorealistic3DTileset()
            .then(tileset => {
                viewer.scene.primitives.add(tileset)
                viewerRef.current = viewer
                if (externalRef) externalRef.current = viewer
                setReady(true)

                // Cancel any programmatic camera flight when the user interacts,
                // matching Mapbox GL's behaviour where a click or scroll stops a flyTo.
                const canvas = viewer.scene.canvas
                const cancelFlight = () => viewer.camera.cancelFlight()
                canvas.addEventListener('pointerdown', cancelFlight)
                canvas.addEventListener('wheel',       cancelFlight, { passive: true })
                removeInteractListeners = () => {
                    canvas.removeEventListener('pointerdown', cancelFlight)
                    canvas.removeEventListener('wheel',       cancelFlight)
                }
            })
            .catch(err => {
                console.error('Failed to load Google 3D tileset:', err)
                if (onError) onError('Unable to load 3D tiles. Check your Google Maps API key.')
            })

        return () => {
            removeInteractListeners()
            // Hide immediately so the WebGL canvas doesn't flash during
            // page transitions (fixed-position WebGL layers can bypass
            // CSS opacity fades applied to ancestor elements).
            if (containerRef.current) {
                containerRef.current.style.visibility = 'hidden'
            }
            if (externalRef) externalRef.current = null
            viewer.camera.cancelFlight()
            viewer.destroy()
            viewerRef.current = null
            setReady(false)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return ready ? viewerRef.current : null
}
