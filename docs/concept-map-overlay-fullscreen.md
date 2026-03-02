# Concept: Map Markers & Route Overlay on Fullscreen Photo

## The Idea
When the user opens the fullscreen image carousel, superimpose the route trail and location markers graphically over the fullscreen photo — connecting the geographic narrative with the visual one.

## Why It's Interesting
- Creates a spatial/abstract connection between the photo and where it was taken
- The route trail becomes a graphic element within the image, not just a map feature
- Markers float over the photo, showing visited locations in context
- Could animate as the map flies underneath — the overlay borrows the map's coordinate math but lives above everything visually

## Technical Approach
Route lines and markers cannot simply have their z-index raised:
- **Route lines** are pixels on Mapbox's WebGL canvas — not DOM elements, cannot be composited above other layers independently
- **Markers** are DOM divs inside the Mapbox container (z-0 stacking context) — portalling to `document.body` would let them escape, but they'd only be at fixed screen positions

**The right architecture**: a separate SVG/canvas overlay layer in the React DOM, rendered above the fullscreen viewer, that mirrors the map data:
1. Use `map.project([lng, lat])` to convert geographic coordinates → screen pixel positions
2. Draw the route as an `<svg>` `<path>` element positioned over the fullscreen viewer
3. Render markers as `<div>` elements absolutely positioned at those projected coordinates
4. The map stays hidden behind — the overlay just borrows its coordinate math

## Visual Possibilities
- Route trail as a thin amber/gradient SVG line across the photo
- Visited markers as pulsing dots at their projected screen positions
- Active marker highlighted differently — connecting "you are here" to the image
- Could fade/dim when user navigates away, animate in when fullscreen opens
- Abstract enough to be graphic rather than literal — feels designed not functional

## Implementation Notes
- `map.project()` returns `{x, y}` pixel coords relative to the map container (which is `fixed inset-0`)
- Need to reproject on map move/zoom if the map is still animating when fullscreen opens
- The SVG overlay would be `fixed inset-0 z-[201]` (above fullscreen viewer at z-[200])
- Markers in the overlay are duplicates of the map markers — the Mapbox ones stay hidden
- Route coordinates are already available in `routeCoordinates` state in StoryMapView

## Status
Concept only — not implemented. Flagged as future exploration.
