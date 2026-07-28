import MapBackground from '@/components/storymap/MapContainer'
import CesiumStoryMap from './CesiumStoryMap'

/**
 * StoryMapRenderer — selects the correct map backend based on story.map_style.
 *
 * - 'photorealistic-3d' → CesiumStoryMap (Google Photorealistic 3D Tiles)
 * - anything else       → MapBackground (Mapbox GL)
 *
 * The Cesium and Mapbox paths are intentionally kept in separate files so that
 * Cesium modules are never imported alongside mapbox-gl (bundler tree-shaking
 * keeps the two large libs independent).
 */
export default function StoryMapRenderer({ story, storyIdParam, chapters, currentChapter, currentSlide, hidden, viewerRef, onMapReady, annotationMarkers = [], ...rest }) {
    // Don't render any map backend while a story transition is in progress.
    // storyIdParam changed (URL updated) but the story state hasn't been fetched
    // yet for the new URL — the stale story from the previous page is in state.
    // The black overlay covers this gap; returning null here is what actually
    // destroys the Cesium viewer the moment navigation starts rather than waiting
    // for the next story's data to arrive.
    if (!story || (storyIdParam && storyIdParam !== String(story?.id))) return null

    if (story?.map_style === 'photorealistic-3d') {
        return (
            <CesiumStoryMap
                story={story}
                chapters={chapters}
                currentChapter={currentChapter}
                currentSlide={currentSlide}
                hidden={hidden}
                viewerRef={viewerRef}
                onMapReady={onMapReady}
                annotationMarkers={annotationMarkers}
            />
        )
    }

    return <MapBackground annotationMarkers={annotationMarkers} onMapReady={onMapReady} {...rest} />
}
