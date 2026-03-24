# Cesium chapter schema

## Story-level change

Add `photorealistic-3d` as a valid mapStyle value:

```js
// src/types/story.js (or wherever mapStyle is defined/validated)

export const MAP_STYLES = {
  streets:            'streets',
  satellite:          'satellite',
  light:              'light',
  dark:               'dark',
  'photorealistic-3d': 'photorealistic-3d',   // new
}
```

---

## Chapter schema extension

Existing chapters have a `location` object shaped for Mapbox:
```js
location: {
  center: [lng, lat],
  zoom: 12,
  bearing: 30,
  pitch: 45,
}
```

For Cesium stories, add a `cesiumCamera` object alongside (or instead of)
`location`. Keeping both allows a chapter to work in either renderer if
you ever want to offer style switching mid-story.

### Simple chapter — single camera position
```js
{
  id: 'chapter-1',
  title: 'Saint-Malo',
  content: '...',

  // Existing Mapbox location (keep for non-3D fallback)
  location: {
    center: [-2.001, 48.648],
    zoom: 14,
    bearing: 150,
    pitch: 45,
  },

  // New Cesium camera
  cesiumCamera: {
    lng:      -2.001,
    lat:       48.648,
    alt:       500,      // altitude in metres
    heading:   150,      // degrees, 0 = north
    pitch:     -18,      // degrees, negative = looking down
    duration:  3,        // seconds for flyTo (0 = instant cut)
  }
}
```

### Chapter with a cinematic path
For chapters that warrant a multi-step camera move — flying in,
settling, drifting along a feature:

```js
{
  id: 'chapter-2',
  title: 'The ramparts',
  content: '...',

  cesiumCamera: {
    path: [
      // Step 0: instant placement (duration: 0 always = setView)
      { lng: -1.999, lat: 48.649, alt: 1800, heading:  30, pitch: -42, duration: 0 },
      // Step 1: descend toward the walls
      { lng: -2.001, lat: 48.648, alt:  500, heading: 150, pitch: -18, duration: 5 },
      // Step 2: drift along the ramparts (pause 800ms after landing)
      { lng: -2.003, lat: 48.646, alt:  220, heading: 200, pitch:  -8, duration: 4, pause: 800 },
    ]
  }
}
```

### Chapter with a GeoJSON overlay
```js
{
  id: 'chapter-3',
  title: 'Project boundary',
  content: '...',

  cesiumCamera: {
    lng:     -1.983,
    lat:      48.547,
    alt:      800,
    heading:  0,
    pitch:   -30,
    duration: 3,
  },

  // Optional — loaded/unloaded with the chapter
  geoJsonUrl: '/data/rance-project-boundary.geojson',
}
```

---

## Test story

Use this during development to validate the full flow without
needing real story content:

```js
export const CESIUM_TEST_STORY = {
  id: 'test-cesium-story',
  title: 'Brittany coast — 3D test',
  mapStyle: 'photorealistic-3d',
  chapters: [
    {
      id: 'test-ch-1',
      title: 'Le Minihic sur Rance',
      content: 'Testing tile coverage over the Rance valley.',
      cesiumCamera: {
        lng: -1.983, lat: 48.547, alt: 1400,
        heading: 0, pitch: -42, duration: 0,
      },
    },
    {
      id: 'test-ch-2',
      title: 'Dinard',
      content: 'Testing coverage over the waterfront.',
      cesiumCamera: {
        lng: -2.057, lat: 48.631, alt: 420,
        heading: 100, pitch: -20, duration: 4,
      },
    },
    {
      id: 'test-ch-3',
      title: 'Saint-Malo — intra-muros',
      content: 'Testing coverage over the walled city.',
      cesiumCamera: {
        path: [
          { lng: -1.999, lat: 48.649, alt: 1800, heading:  30, pitch: -42, duration: 0 },
          { lng: -2.001, lat: 48.648, alt:  380, heading: 150, pitch: -18, duration: 5 },
          { lng: -2.003, lat: 48.646, alt:  180, heading: 200, pitch:  -8, duration: 4 },
        ]
      },
    },
    {
      id: 'test-ch-4',
      title: 'Marseille',
      content: 'Testing coverage over Vieux-Port.',
      cesiumCamera: {
        lng: 5.374, lat: 43.293, alt: 600,
        heading: 80, pitch: -22, duration: 4,
      },
    },
  ],
}
```

---

## Camera parameter reference

| Parameter | Type | Description | Typical range |
|-----------|------|-------------|---------------|
| `lng` | number | Longitude | -180 to 180 |
| `lat` | number | Latitude | -90 to 90 |
| `alt` | number | Altitude in metres above ground | 100–5000 |
| `heading` | number | Camera direction in degrees (0 = north) | 0–360 |
| `pitch` | number | Camera tilt in degrees (negative = down) | -90 to 0 |
| `duration` | number | Flight time in seconds (0 = instant) | 0–8 |
| `pause` | number | Milliseconds to wait after landing | 0–3000 |

### Altitude intuition
- 100–300m — street level, rooftops visible, tight framing
- 300–600m — neighbourhood scale, good for settlements
- 600–1200m — town scale, coastal topography clear
- 1200–2000m — regional establish shot, coastline readable
- 2000m+ — wide aerial, orientation shot

### Pitch intuition
- `-8` to `-15` — near-horizontal, dramatic low angle
- `-18` to `-25` — slight downward tilt, cinematic
- `-30` to `-40` — standard aerial view
- `-45` to `-60` — steep downward, plan-like
- `-90` — straight down (rarely useful for storytelling)
