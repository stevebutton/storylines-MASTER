import { useRef, useState } from 'react'
import { useCesiumViewer } from '../cesium/useCesiumViewer'
import { useCesiumChapter } from '../cesium/useCesiumChapter'

/**
 * CesiumStoryMap — persistent Cesium viewer for photorealistic-3d stories.
 *
 * Mounts once, responds to chapter changes via camera moves, destroys on unmount.
 * Delegates lifecycle to useCesiumViewer, camera movement to useCesiumChapter.
 *
 * NOTE: Do not import mapbox-gl or any Mapbox utility in this file.
 */
export default function CesiumStoryMap({ story, chapters, currentChapter, currentSlide, hidden, viewerRef }) {
    const containerRef = useRef(null)
    const [error, setError] = useState(null)

    const viewer = useCesiumViewer(containerRef, setError, viewerRef)
    useCesiumChapter(viewer, currentChapter)
    // Slide-level camera — fires after chapter, overrides it when slide has cesium_camera
    useCesiumChapter(viewer, currentSlide)

    if (error) {
        return (
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0e0e0e',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 14,
                    fontFamily: 'sans-serif',
                    padding: 32,
                    textAlign: 'center',
                }}
            >
                {error}
            </div>
        )
    }

    // The Cesium canvas is GPU-composited separately and bypasses CSS opacity/visibility
    // applied to ancestor elements. We must hide it directly and synchronously in the
    // render path (not in a useEffect) so the canvas disappears before the page transition
    // overlay fades in.
    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-0"
            style={hidden ? { display: 'none' } : undefined}
        />
    )
}
