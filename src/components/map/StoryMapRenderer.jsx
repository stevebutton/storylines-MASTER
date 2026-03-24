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
export default function StoryMapRenderer({ story, currentChapter, currentSlide, ...rest }) {
    if (story?.map_style === 'photorealistic-3d') {
        return <CesiumStoryMap story={story} currentChapter={currentChapter} currentSlide={currentSlide} />
    }

    return <MapBackground {...rest} />
}
