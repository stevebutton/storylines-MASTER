# Live Map Editor — Design & Implementation Notes

## Problem

Adjusting map settings (zoom, bearing, pitch, fly duration) currently requires:
1. Open Story Editor
2. Navigate to the slide
3. Guess at values while imagining the map relationship
4. Save → go to viewer → scroll to that slide → observe result
5. Repeat until correct

This is slow and disconnected. The map and the slide are never seen together during editing.

---

## Solution

A floating live-edit panel activated **while viewing the story**. The author sees the
story exactly as a reader would, but with access to a control panel that updates the map
in real time and saves changes directly to the database.

---

## Activation

- A subtle **edit icon in the story footer** (not the banner, not the chapter nav)
- Chosen location: footer keeps it out of the reading experience and away from chapter
  navigation, but accessible when the author reaches the end of a section or scrolls back
- Icon only — no label — so it doesn't distract readers

---

## Ownership & Auth (Future-Proofing)

Currently: single user, no gating needed.

Future: the icon should only render if `story.created_by === currentUser.id` (or equivalent
ownership check once Supabase migration is complete). The component should accept an
`isOwner` prop that controls visibility. For now, `isOwner` defaults to `true`.

Implementation note: after Supabase migration, pass `isOwner` from `StoryMapView` by
comparing the authenticated user ID to `story.user_id` (or equivalent ownership field).

---

## The Panel

### Behaviour
- Activating the icon opens a floating panel anchored to the **left side of the map**
  (right half of the screen), above the footer
- Panel tracks the **currently active slide** — updates its displayed values as the user
  scrolls to new slides/chapters
- All slider changes update the map **live** (no save needed to preview)
- A "Save" button writes the current values back to the Slide entity in the database

### Controls (per slide)

| Control | Type | Range |
|---|---|---|
| Zoom | Slider | 1–20 |
| Bearing | Slider | -180–180° |
| Pitch | Slider | 0–85° |
| Fly Duration | Slider | 1–20s |

### Capture Current Map Position (key feature)

The most intuitive workflow:
1. Author pans, zooms, rotates the Mapbox map freely with mouse/touch
2. Clicks **"Capture Map Position"**
3. Panel reads `map.getCenter()`, `map.getZoom()`, `map.getBearing()`, `map.getPitch()`
   directly from the live Mapbox instance
4. Values populate the sliders instantly
5. Author clicks Save → written to database

This eliminates guesswork entirely. The author positions the map exactly as they want it
for that slide, then locks it in.

### Coordinate capture

A secondary **"Set Slide Coordinates"** button captures `map.getCenter()` as the slide's
`coordinates` field — useful when the author has panned to the correct location and wants
to anchor the slide flyTo target there.

---

## Data Flow

```
Author pans map
    ↓
"Capture Map Position" clicked
    ↓
Read from Mapbox: center, zoom, bearing, pitch
    ↓
Populate panel sliders (live preview already matches)
    ↓
"Save" clicked
    ↓
base44.entities.Slide.update(slideId, { zoom, bearing, pitch, fly_duration, coordinates })
    ↓
StoryMapView re-reads updated slide on next load
```

Slider changes (without capture) also trigger a live `setMapConfig` call so the author
sees the result immediately — same mechanism the viewer already uses.

---

## Technical Implementation

### Files to modify

| File | Change |
|---|---|
| `src/pages/StoryMapView.jsx` | Add edit mode state, pass `mapRef` and active slide ID down; render `LiveMapEditor` |
| `src/components/storymap/MapContainer.jsx` | Expose `mapRef` via `forwardRef` or callback prop so `LiveMapEditor` can read map state |
| `src/components/storymap/StoryFooter.jsx` | Add edit icon button (gated by `isOwner`) |
| `src/components/storymap/LiveMapEditor.jsx` | New component — the floating panel |

### MapContainer ref exposure

`MapContainer` already holds `map.current` internally. To expose it for capture:
- Add a `onMapReady` callback prop: `onMapReady(mapInstance)` called once after map loads
- `StoryMapView` stores it in its own `mapInstanceRef`
- `LiveMapEditor` receives `mapInstanceRef` as a prop and calls `.getCenter()` etc. on demand

### Active slide tracking

`StoryMapView` already tracks the active chapter and receives slide data via `onSlideChange`.
The `LiveMapEditor` needs:
- `activeSlide` — the current slide object (id, zoom, bearing, pitch, fly_duration, coordinates)
- `onSlideUpdate(updatedValues)` — callback to trigger `setMapConfig` for live preview
- `onSlideSave(slideId, values)` — callback to write to database

### Slide ID availability

Currently `StoryMapView`'s `onSlideChange` receives slide data but not the slide `id`
(it was stripped when building `chaptersWithSlides` in `loadStory`). The slide `id` needs
to be preserved in the chapter slides array so `LiveMapEditor` can save to the correct record.

---

## UI Sketch

```
┌─────────────────────────────────────────────┐
│  ✏️  Map Settings — Slide 2: "Market Square" │
│─────────────────────────────────────────────│
│  Zoom          [━━━━●──────────] 14          │
│  Bearing       [────●──────────] 45°         │
│  Pitch         [──────●────────] 30°         │
│  Fly Duration  [━━●────────────] 6s          │
│                                             │
│  [ Capture Map Position ]                   │
│  [ Set Slide Coordinates ]                  │
│                                             │
│  Coordinates: 51.5074, -0.1278              │
│                                             │
│              [ Cancel ]  [ Save ]           │
└─────────────────────────────────────────────┘
```

Panel is positioned fixed, bottom-right of map area, above the footer.
Draggable is not required — fixed position is sufficient.

---

## Future Enhancements

- **Chapter-level settings**: map style, default zoom — separate section or tab
- **Ownership gating**: `isOwner={story.user_id === currentUser.id}` after Supabase migration
- **Undo**: store previous values on panel open, offer revert
- **Bulk apply**: "Apply zoom to all slides in this chapter"
- **Route type selector**: driving / walking / cycling — natural fit here once Supabase
  stores `route_geometry`
