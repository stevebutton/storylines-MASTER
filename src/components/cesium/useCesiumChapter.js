import { useEffect, useRef } from 'react'
import { flyToPromise, setViewInstant } from './flyToPromise'

/**
 * Responds to chapter changes by moving the Cesium camera to the
 * chapter's cesiumCamera position.
 *
 * Guarantees:
 *   - cancelFlight() is called in cleanup
 *   - chapter.id is the useEffect dependency (not the chapter object)
 */
export function useCesiumChapter(viewer, chapter) {
    const cancelRef = useRef(false)

    useEffect(() => {
        // Support both camelCase (dev test data) and snake_case (Supabase)
        const cam = chapter?.cesiumCamera ?? chapter?.cesium_camera
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
