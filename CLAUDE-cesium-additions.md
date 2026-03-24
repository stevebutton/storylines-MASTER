# Cesium 3D — additions to CLAUDE.md

Add this section to your existing CLAUDE.md at the project root.

---

## Cesium 3D style (feature branch: cesium-3d-style)

### What this feature does
Adds `photorealistic-3d` as a first-class map style option for stories.
When a story uses this style, CesiumJS replaces Mapbox GL as the map renderer
for the entire story. Mapbox is not involved at all — no coexistence, no layers.

The chapter panel, text overlays, navigation, and photo panel all remain unchanged.
Only the map renderer underneath them swaps.

### Key files
```
src/
  components/
    map/
      MapView.jsx              ← existing Mapbox renderer, DO NOT MODIFY
      CesiumStoryMap.jsx       ← new, create this
      StoryMapRenderer.jsx     ← new, branching wrapper (Mapbox vs Cesium)
    cesium/
      useCesiumViewer.js       ← new, viewer lifecycle hook
      useCesiumChapter.js      ← new, chapter camera sync hook
      flyToPromise.js          ← new, camera utility
  types/
    chapter.js                 ← extend with Cesium camera fields
    story.js                   ← add 'photorealistic-3d' to mapStyle enum
  constants/
    mapStyles.js               ← add Cesium style entry
docs/
  cesium-3d-style-spec.md      ← full spec (read this before building)
  cesium-chapter-schema.md     ← chapter data reference
  reference/
    cesium-scene-test.html     ← validated standalone proof of concept
```

### Environment variables
```
VITE_GOOGLE_MAPS_API_KEY=     ← required for Cesium/Google tiles
VITE_MAPBOX_TOKEN=            ← existing, unchanged
```

### Cesium Vite configuration
Cesium requires special Vite config — do not skip this step.
Use `vite-plugin-cesium` (preferred) or configure manually per:
https://cesium.com/learn/cesiumjs/cesiumjs-and-vite/

Install: `npm install cesium vite-plugin-cesium`

### Hard rules
- NEVER import Cesium in any file that also imports Mapbox GL
- ALWAYS call viewer.destroy() in useEffect cleanup — no exceptions
- ALWAYS pass showCreditsOnScreen: true to Viewer (Google ToS requirement)
- NEVER hardcode the Google Maps API key — use import.meta.env.VITE_GOOGLE_MAPS_API_KEY
- DO NOT modify MapView.jsx or any existing map components
