import { useEffect, useRef } from 'react'
import { flyToPromise, setViewInstant } from './flyToPromise'

/**
 * Convert Mapbox-style chapter/slide location fields to a cesium_camera object.
 * Used as fallback when no cesium_camera has been explicitly set, so that
 * stories created for Mapbox still navigate correctly in Cesium mode.
 *
 * coordinates: [lat, lng]  (project convention — lat first)
 * zoom:        Mapbox zoom level (0 = global, 20+ = street)
 * bearing:     degrees from north, same convention as Cesium heading
 * pitch:       Mapbox pitch (0 = top-down, 60 = max tilt)
 *              → Cesium pitch (–90 = nadir, 0 = horizontal)
 *              pitch 0 is mapped to –35 so flat Mapbox stories open at a
 *              cinematic angle rather than a boring plan view.
 */
export function mapboxToCesiumCamera(item) {
    const coords = item?.coordinates
    if (!coords?.[0] && !coords?.[1]) return null

    // In Mapbox, coordinates = the look-at point (screen centre).
    // In Cesium, flyTo positions the *camera* at lat/lng/alt, so we must
    // offset the camera backwards so the original coordinates end up centred.
    const lookLat = coords[0]
    const lookLng = coords[1]
    const zoom    = item.zoom  || 12
    const alt     = Math.round(35200000 / Math.pow(2, zoom))

    const mapboxPitch = item.pitch || 0
    const pitch       = mapboxPitch === 0 ? -35 : Math.max(-80, mapboxPitch - 90)
    const heading     = item.bearing || 0

    // Horizontal distance from camera to look-at point on the ground
    const pitchRad    = pitch * Math.PI / 180          // negative
    const horizDist   = alt / Math.tan(-pitchRad)      // positive metres
    const headingRad  = heading * Math.PI / 180

    // Camera sits *behind* the look-at point (opposite of heading direction)
    const camLat = lookLat - (horizDist * Math.cos(headingRad)) / 111111
    const camLng = lookLng - (horizDist * Math.sin(headingRad))
        / (111111 * Math.cos(lookLat * Math.PI / 180))

    return {
        lat:      camLat,
        lng:      camLng,
        alt,
        heading,
        pitch,
        duration: item.fly_duration ?? 3,
    }
}

/**
 * Responds to chapter/slide changes by moving the Cesium camera.
 *
 * Priority order for camera data:
 *   1. cesiumCamera  (camelCase — dev test data)
 *   2. cesium_camera (snake_case — Supabase)
 *   3. Mapbox coordinates fallback (stories not yet given Cesium positions)
 *
 * Guarantees:
 *   - cancelFlight() is called in cleanup
 *   - chapter.id is the useEffect dependency (not the chapter object)
 */
export function useCesiumChapter(viewer, chapter) {
    const cancelRef = useRef(false)

    useEffect(() => {
        const cam = chapter?.cesiumCamera
            ?? chapter?.cesium_camera
            ?? mapboxToCesiumCamera(chapter)
        if (!viewer || !cam) return

        cancelRef.current = false

        async function moveCamera() {
            // Multi-step cinematic path
            if (cam.path?.length) {
                // Step 0 is always an instant placement
                setViewInstant(viewer, cam.path[0])

                for (let i = 1; i < cam.path.length; i++) {
                    if (cancelRef.current) break
                    await flyToPromise(viewer, cam.path[i])
                    if (cancelRef.current) break
                    if (cam.path[i].pause) {
                        await sleep(cam.path[i].pause)
                    }
                }
            } else {
                // Simple single-position chapter
                if (cam.duration === 0) {
                    setViewInstant(viewer, cam)
                } else {
                    await flyToPromise(viewer, cam)
                }
            }
        }

        moveCamera()

        return () => {
            cancelRef.current = true
            viewer.camera.cancelFlight()
        }
    }, [viewer, chapter?.id]) // chapter.id as dep — fires on chapter change, not object identity
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
