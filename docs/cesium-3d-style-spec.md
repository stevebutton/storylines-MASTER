# Cesium 3D style — integration spec

## Overview

`photorealistic-3d` is a new story-level map style. When selected, CesiumJS
renders the entire story map using Google Photorealistic 3D Tiles. Mapbox GL
is not loaded or referenced in any way for these stories.

The rest of the Storylines UI — chapter panel, navigation, photo panel,
overlays — is unchanged. The renderer swap happens at a single branch point
in StoryMapRenderer.

---

## Architecture

```
StoryViewer
└── StoryMapRenderer          ← branches on story.mapStyle
    ├── MapView               ← existing Mapbox path (unchanged)
    └── CesiumStoryMap        ← new Cesium path
        ├── useCesiumViewer   ← viewer init / destroy lifecycle
        └── useCesiumChapter  ← chapter camera sync
```

---

## Component: StoryMapRenderer

File: `src/components/map/StoryMapRenderer.jsx`

Replaces any direct use of `<MapView>` in StoryViewer with a branching wrapper.

```jsx
import MapView from './MapView'
import CesiumStoryMap from './CesiumStoryMap'

export default function StoryMapRenderer({ story, currentChapter }) {
  if (story.mapStyle === 'photorealistic-3d') {
    return <CesiumStoryMap story={story} currentChapter={currentChapter} />
  }
  return <MapView story={story} currentChapter={currentChapter} />
}
```

Props passed through are identical — CesiumStoryMap and MapView receive
the same interface so StoryViewer needs no other changes.

---

## Component: CesiumStoryMap

File: `src/components/map/CesiumStoryMap.jsx`

The persistent Cesium viewer for the story. Mounts once, responds to
chapter changes via camera moves, destroys on unmount.

### Props
```ts
{
  story: Story,
  currentChapter: Chapter
}
```

### Behaviour
1. On mount: initialise Cesium viewer, add Google 3D tileset
2. On currentChapter change: fly camera to chapter's cesiumCamera position
3. On unmount: cancel any in-flight camera move, destroy viewer

### Implementation

```jsx
import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { useCesiumViewer } from '../cesium/useCesiumViewer'
import { useCesiumChapter } from '../cesium/useCesiumChapter'

export default function CesiumStoryMap({ story, currentChapter }) {
  const containerRef = useRef(null)
  const viewer = useCesiumViewer(containerRef)
  useCesiumChapter(viewer, currentChapter)

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    />
  )
}
```

---

## Hook: useCesiumViewer

File: `src/components/cesium/useCesiumViewer.js`

Owns the viewer lifecycle. Returns the viewer ref once ready.

```js
import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'

export function useCesiumViewer(containerRef) {
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

    Cesium.createGooglePhotorealistic3DTileset()
      .then(tileset => {
        viewer.scene.primitives.add(tileset)
        viewerRef.current = viewer
        setReady(true)
      })
      .catch(err => {
        console.error('Failed to load Google 3D tileset:', err)
      })

    return () => {
      viewer.camera.cancelFlight()
      viewer.destroy()
      viewerRef.current = null
      setReady(false)
    }
  }, [])

  return ready ? viewerRef.current : null
}
```

---

## Hook: useCesiumChapter

File: `src/components/cesium/useCesiumChapter.js`

Responds to chapter changes. Moves the camera to the chapter's
cesiumCamera position using flyTo or setView.

```js
import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'
import { flyToPromise, setViewInstant } from './flyToPromise'

export function useCesiumChapter(viewer, chapter) {
  const cancelRef = useRef(false)

  useEffect(() => {
    if (!viewer || !chapter?.cesiumCamera) return

    cancelRef.current = false
    const cam = chapter.cesiumCamera

    async function moveCamera() {
      // Optional: run a multi-step path if defined
      if (cam.path?.length) {
        // First step is always instant placement
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
  }, [viewer, chapter?.id])  // chapter.id as dep — fires on chapter change
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
```

---

## Utility: flyToPromise

File: `src/components/cesium/flyToPromise.js`

Shared camera utilities used by both useCesiumChapter and any
future fullscreen CesiumScene panel component.

```js
import * as Cesium from 'cesium'

/**
 * Wraps viewer.camera.flyTo in a Promise.
 * Resolves on complete OR cancel (safe for cleanup).
 */
export function flyToPromise(viewer, step) {
  return new Promise(resolve => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        step.lng,
        step.lat,
        step.alt
      ),
      orientation: {
        heading: Cesium.Math.toRadians(step.heading ?? 0),
        pitch:   Cesium.Math.toRadians(step.pitch   ?? -30),
        roll:    0,
      },
      duration: step.duration ?? 3,
      easingFunction: Cesium.EasingFunction.SINUSOIDAL_IN_OUT,
      complete: resolve,
      cancel:   resolve,   // resolve on cancel so await chains don't hang
    })
  })
}

/**
 * Instant camera placement — no animation.
 * Use for the first step of a sequence or hard chapter cuts.
 */
export function setViewInstant(viewer, step) {
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      step.lng,
      step.lat,
      step.alt
    ),
    orientation: {
      heading: Cesium.Math.toRadians(step.heading ?? 0),
      pitch:   Cesium.Math.toRadians(step.pitch   ?? -30),
      roll:    0,
    },
  })
}
```

---

## GeoJSON layer support (optional per chapter)

If a chapter carries a `geoJsonUrl`, load it when the chapter becomes
active and remove it when the chapter changes. Add this to useCesiumChapter
or as a separate `useCesiumLayers` hook:

```js
useEffect(() => {
  if (!viewer || !chapter?.geoJsonUrl) return

  let dataSource
  Cesium.GeoJsonDataSource.load(chapter.geoJsonUrl, {
    clampToGround: true,
    stroke: Cesium.Color.WHITE.withAlpha(0.8),
    fill: Cesium.Color.WHITE.withAlpha(0.15),
    strokeWidth: 2,
  }).then(ds => {
    dataSource = ds
    viewer.dataSources.add(ds)
  })

  return () => {
    if (dataSource) viewer.dataSources.remove(dataSource, true)
  }
}, [viewer, chapter?.id])
```

---

## Vite configuration

Install: `npm install cesium vite-plugin-cesium`

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  plugins: [
    react(),
    cesium(),   // handles worker files, asset copying, CESIUM_BASE_URL
  ],
})
```

If vite-plugin-cesium causes issues, fall back to manual config per:
https://cesium.com/learn/cesiumjs/cesiumjs-and-vite/

---

## Error states to handle

```jsx
// In CesiumStoryMap — show a fallback if tiles fail to load
// (likely cause: invalid API key or EEA content restrictions)

const [error, setError] = useState(null)

// In useCesiumViewer, catch the tileset load and surface it:
.catch(err => {
  setError('Unable to load 3D tiles. Check your Google Maps API key.')
})

// Render:
if (error) return (
  <div className="map-error">
    <p>{error}</p>
  </div>
)
```

---

## Route rendering in Cesium

### Overview

The existing Mapbox Directions API integration is fully reusable with Cesium — it is a plain REST call that returns GeoJSON and has no dependency on the Mapbox GL renderer. Only the rendering layer needs replacing.

```
Mapbox Directions API call  →  GeoJSON LineString coordinates  →  reuse as-is
                                            ↓
                Mapbox GL addLayer/addSource  ←  replace with Cesium primitive
```

### Current Mapbox path (for reference)

The existing system calls the Directions API, receives a `route_geometry` GeoJSON LineString, stores it on the chapter row, and renders it via `map.addSource` / `map.addLayer` with type `line`.

### Cesium path

The same `route_geometry` GeoJSON stored on the chapter is passed directly to Cesium. Three rendering options in order of simplicity:

**Option 1 — GeoJsonDataSource (simplest)**
```js
Cesium.GeoJsonDataSource.load(geoJsonObject, {
  clampToGround: true,
  stroke: Cesium.Color.fromCssColorString('#f59e0b'),  // amber, matches Mapbox style
  strokeWidth: 4,
}).then(ds => viewer.dataSources.add(ds))
```
Advantages: one call, handles any GeoJSON geometry, terrain-draped automatically via `clampToGround`.

**Option 2 — Corridor (terrain-hugging width)**
```js
viewer.entities.add({
  corridor: {
    positions: Cesium.Cartesian3.fromDegreesArray(flatCoordinateArray),
    width: 40,          // metres
    material: Cesium.Color.fromCssColorString('#f59e0b').withAlpha(0.85),
    outline: true,
    outlineColor: Cesium.Color.WHITE.withAlpha(0.4),
    classificationType: Cesium.ClassificationType.TERRAIN,
  }
})
```
Advantages: physical width in metres rather than screen pixels; wraps around hillsides correctly.

**Option 3 — Polyline with clamping**
```js
viewer.entities.add({
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArray(flatCoordinateArray),
    width: 4,
    material: new Cesium.PolylineOutlineMaterialProperty({
      color: Cesium.Color.fromCssColorString('#f59e0b'),
      outlineWidth: 2,
      outlineColor: Cesium.Color.BLACK.withAlpha(0.4),
    }),
    clampToGround: true,
  }
})
```

### Recommended approach

Use **Option 1 (GeoJsonDataSource)** initially — it accepts the stored `route_geometry` directly with no coordinate transformation. Switch to Option 2 (Corridor) for the final implementation; it handles steep terrain far better than a screen-width polyline and is the visually correct choice for mountainous NGO field project contexts.

### Coordinate conversion helper

GeoJSON coordinates are `[lng, lat]` pairs. Cesium's `fromDegreesArray` expects a flat array `[lng, lat, lng, lat, ...]`:

```js
function geoJsonToCartesian(lineStringCoordinates) {
  return Cesium.Cartesian3.fromDegreesArray(
    lineStringCoordinates.flatMap(([lng, lat]) => [lng, lat])
  )
}
```

### Upgrade vs Mapbox

In the Mapbox implementation routes are flat lines on a 2D-projected map. In Cesium, `clampToGround: true` drapes the route over photorealistic 3D terrain — it follows valley floors, climbs ridgelines, and disappears correctly behind hills. This is a meaningful visual improvement for field stories in mountainous or complex terrain.

---

## Reference implementation

`/docs/reference/cesium-scene-test.html` is a validated standalone
proof of concept. The Viewer config, createGooglePhotorealistic3DTileset()
call, and flyTo pattern in that file are confirmed working. Use it as the
source of truth for Cesium setup details — do not guess at API signatures.
