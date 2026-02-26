# Route Drawing Strategy

## Context

Story maps contain chapters with slides, each slide having GPS coordinates. As the user navigates
slide-to-slide, a line is drawn on the map connecting the locations. Slides are taken in a variety
of contexts: along roads, on foot in pedestrian areas, off-road in fields or countryside, or by
bicycle on mixed terrain.

The goal is for the connecting line to look natural — following roads and paths where they exist,
and falling back to a straight line when they don't.

---

## What's Actually Happening (Mapbox Directions API)

### When the route deviates massively but still "succeeds"
If a slide is taken 100m off-road, the `driving` profile doesn't fail — it routes to the nearest
road, along that road, then snaps back to the nearest road near the destination. This can produce
a line that drives 2km around a field to connect two points 200m apart. The API returns a
"successful" route, so the code uses it — even though it looks wrong.

### When it fails entirely
Truly inaccessible points (middle of a field with no roads nearby) return no route at all.
The code correctly falls back to a straight line in this case.

---

## Two Levers to Fix This

### 1. Routing Profile: `driving` → `walking`

Walking routes follow paths, pedestrian zones, and tracks — much more appropriate for field
research. Specific improvements:

- Bicycle routes along roads: `walking` covers the same road network
- Pedestrian areas that block `driving`: `walking` navigates through them correctly
- Rural tracks and footpaths: `walking` follows them where `driving` cannot

### 2. Distance Ratio Heuristic

Compare the API's returned route distance to the straight-line (haversine) distance between the
two points. If the route is more than **2.5×** the straight-line distance, it is routing around
something the user didn't actually travel — discard it and use a straight line instead.

**Examples:**
```
straight-line: 200m  |  route: 1,800m  →  ratio 9.0×  →  straight line  ✗ too detoured
straight-line: 200m  |  route:   350m  →  ratio 1.75× →  road route     ✓ reasonable
straight-line: 500m  |  route:   800m  →  ratio 1.6×  →  road route     ✓ reasonable
straight-line: 500m  |  route: 2,200m  →  ratio 4.4×  →  straight line  ✗ too detoured
```

The threshold of 2.5× is a starting point and can be tuned tighter (2.0) if detours are still
appearing in practice.

---

## Decision Matrix

| Scenario | Profile | Ratio check | Result |
|---|---|---|---|
| Road / path between two points | `walking` follows it | ≤ 2.5× | Road route drawn ✓ |
| Pedestrian zone | `walking` navigates through | ≤ 2.5× | Pedestrian route drawn ✓ |
| Bicycle route on roads | `walking` follows same roads | ≤ 2.5× | Road route drawn ✓ |
| Image taken 100m off-road | Detoured route returned | > 2.5× | Straight line drawn ✓ |
| Middle of a field | No route / huge detour | fails or > 2.5× | Straight line drawn ✓ |

---

## Implementation

Both fixes are applied together in the `onSlideChange` segment-fetch block in `StoryMapView.jsx`:

1. Change API URL from `mapbox/driving` → `mapbox/walking`
2. Add Haversine distance helper
3. After receiving the route, calculate `routeDist / straightDist`; if > 2.5, store `[from, to]`
   (straight line) instead of the road geometry

```js
// Haversine straight-line distance in metres
function haversineMetres([lat1, lng1], [lat2, lng2]) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(lat1 * Math.PI / 180)
            * Math.cos(lat2 * Math.PI / 180)
            * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

// In segment fetch:
const straightDist = haversineMetres(from, to);
const route = data.routes?.[0];
const tooDetoured = !route || route.distance > straightDist * 2.5;
segmentCacheRef.current[segKey] = tooDetoured
    ? [from, to]
    : route.geometry.coordinates.map(c => [c[1], c[0]]);
```

---

## Future Considerations

- **Tunable threshold**: The 2.5× ratio could become a per-story or per-chapter setting once
  Supabase migration is complete, allowing authors to choose how aggressively to fall back.
- **Profile selection**: Could offer `driving` / `walking` / `cycling` as a story-level setting
  for authors who know their content is road-based or trail-based.
- **Segment caching**: Segments are cached per session in a ref (keyed by coordinate pair).
  Road segments already fetched survive chapter re-entry but are cleared on story switch.
