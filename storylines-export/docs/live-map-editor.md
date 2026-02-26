# Live Map Editor — Design, Implementation & Status

---

## Original Problem

Adjusting map settings (zoom, bearing, pitch, fly duration) previously required:
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

## Implementation Status: COMPLETE (with known trade-offs)

The Live Map Editor is fully functional as of branch `claude-fixes-v2`, merged to `main`.

### What works

- **Floating panel** renders bottom-right, above the footer, inside a spring-animated
  `motion.div` (slides in/out from the right).
- **Active slide tracking** — panel header shows the current slide title and updates
  automatically as the user scrolls through slides and chapters.
- **Sliders** for zoom (1–20), bearing (-180–180°), pitch (0–85°), fly duration (1–20s).
  Moving any slider calls `map.easeTo()` instantly — live preview with no save needed.
- **Capture View** button reads `map.getZoom()`, `map.getBearing()`, `map.getPitch()`
  from the live Mapbox instance and populates the sliders. Does **not** capture
  coordinates (see design decision below).
- **Pin Location** button enters a click-to-pin mode; clicking the map sets the
  slide's `coordinates` field (the flyTo target and amber marker). Crosshair cursor
  activates; one click completes and exits pin mode.
- **Save** writes `{ zoom, bearing, pitch, fly_duration }` and, if coordinates were
  explicitly pinned, the updated `coordinates` to the database via
  `base44.entities.Slide.update(id, { ...fullSlide, ...patchData })`.
- **In-memory sync** — `onSlideSave` callback updates both the `chapters` array and
  `activeSlide` in StoryMapView state so changes are immediately visible without a
  page reload.
- **Amber dot marker** — rendered at `slide.coordinates` via a Mapbox custom element
  marker inside the editor; shows the current flyTo target location. Moves when Pin
  Location is used.

### Activation

- **SlidersHorizontal icon** in the story footer, gated by `isOwner` prop.
- `isOwner` is currently hardcoded `true` in StoryMapView.
- Future: gate on `story.user_id === currentUser.id` after Supabase auth migration.

---

## Key Architectural Decisions

### 1. Camera offset: `[-200, 0]` is intentional and must not be removed

The `offset: [-200, 0]` in all slide flyTo calls (`handleScroll`, `onExplore`,
`onContinue`, `onSlideChange` in StoryMapView) is a core design decision, not a bug.

**Why it exists:** The story card panel occupies the left half of the screen. If the
flyTo offset were `[0, 0]`, the EXIF marker would land at the exact screen centre —
hidden behind the card. The `[-200, 0]` offset shifts the camera focal point 200px
left, causing the EXIF point to appear 200px to the right of screen centre — in the
visible area beside the card.

**The trade-off:** With `pitch > 0`, a horizontal screen-space offset introduces a
slight vertical distortion because the map's vanishing point rises as pitch increases.
At low pitch (0–30°) this is imperceptible. At high pitch (45–85°) a small vertical
discrepancy may be noticeable between where the author expects the point and where it
appears.

**What NOT to do:** Do not remove or zero out this offset. Doing so causes a cascade
of problems: the EXIF point lands behind the card, users pan to compose views, and
`map.getCenter()` drifts from the EXIF coordinates. This was trialled and reverted.

**If the vertical shift is a problem** on a specific slide, the author should reduce
pitch for that slide (pitch=0 gives a perfectly clean offset at any zoom). A
mathematically correct per-pitch offset compensation is possible but complex; deferred
to future work.

### 2. `slide.coordinates` serves as both marker position and flyTo target

The `coordinates` field on a Slide entity is used for two things:
- Rendering the amber dot marker (exact geographic point of interest / EXIF location)
- The `center` argument to Mapbox `flyTo` / `easeTo`

These are the same value. The camera offset compensates in screen space so the user
sees the correct composed view without the coordinates themselves shifting.

**The consequence:** Capture View must NOT capture `map.getCenter()` as coordinates.
With the `[-200, 0]` offset active, `map.getCenter()` is geographically 200px left of
the EXIF point. Saving it as coordinates would shift the marker and the flyTo target
away from the true EXIF location.

**The correct workflow:**
- Use **Capture View** to lock in zoom, bearing, pitch from the live map.
- Use **Pin Location** (click-to-pin) to explicitly set or move the flyTo target.
- Do not conflate "where the camera is centred" with "where the slide's point is".

### 3. Full slide object required for base44 updates

`base44.entities.Slide.update(id, partialData)` behaves as a merge, but requires
`chapter_id` and `order` to be present in the payload to reliably persist. Sending
only `{ zoom, bearing, pitch }` risks silent field-drops.

The fix: `handleSave` sends `{ ...activeSlide, ...patchData }` — the full slide object
merged with the patch. The `loadStory` whitelist in StoryMapView includes `id`,
`chapter_id`, `order`, and all other slide fields so `activeSlide` is always complete.

---

## Files Modified / Created

| File | Role |
|---|---|
| `src/components/storymap/LiveMapEditor.jsx` | New — the floating editor panel |
| `src/pages/StoryMapView.jsx` | Added: `activeSlide` state, `mapInstanceRef`, `isLiveEditorOpen`, `onSlideSave`, `onMapReady`; preserved `offset: [-200, 0]` at four flyTo call sites |
| `src/components/storymap/StoryFooter.jsx` | Added: SlidersHorizontal icon button, `onOpenMapEditor` + `isOwner` props |
| `src/components/storymap/MapContainer.jsx` | Added: `onMapReady` callback prop; exposes live Mapbox instance to parent |

---

## Data Flow

```
Author scrolls to a slide
    ↓
StoryChapter → onSlideChange(slide) → StoryMapView sets activeSlide
    ↓
LiveMapEditor opens (or is already open) — useEffect syncs sliders from activeSlide
    ↓
Author moves slider → handleSliderChange → map.easeTo() → live preview
    OR
Author clicks Capture View → reads zoom/bearing/pitch from map → populates sliders
    OR
Author clicks Pin Location → click on map → setCoordinates → amber dot moves
    ↓
Author clicks Save
    ↓
base44.entities.Slide.update(id, { ...activeSlide, zoom, bearing, pitch,
                                    fly_duration, [coordinates if pinned] })
    ↓
onSlideSave → setChapters (updates in-memory) + setActiveSlide (updates panel)
    ↓
On next scroll to this slide: onSlideChange reads updated values → correct map view
```

---

## Known Issues & Remaining Work

### 1. Vertical shift at high pitch (known trade-off — low priority)
With `offset: [-200, 0]` and `pitch > 45°`, a subtle vertical discrepancy appears
between the expected point location and where it renders on screen. The author can
mitigate by reducing pitch. A proper fix requires computing a pitch-corrected screen
offset via 3D inverse perspective — mathematically non-trivial, deferred.

### 2. Ownership gating not yet implemented
`isOwner` is hardcoded `true`. Once Supabase auth is in place, this should be:
```jsx
isOwner={story.user_id === currentUser?.id}
```
Until then, the editor icon is visible to all users (single-user context, acceptable).

### 3. Editor does not re-open on the correct slide after chapter change
If the editor is open while the user scrolls to a new chapter, it updates `activeSlide`
correctly. However, if the editor is closed and the user reopens it in a new chapter,
`activeSlide` may still hold the previous slide (before the chapter change was
registered). Mitigation: scroll to the target slide first, then open the editor.
This is a minor UX nuisance, not a data-loss issue.

### 4. Diagnostic console.log in StoryChapter
`src/components/storymap/StoryChapter.jsx` has a pre-existing
`console.log("Current Slide for debugging:", currentSlide)` (approx. line 35).
This should be removed in a cleanup pass.

### 5. Capture View amber dot doesn't move
Because Capture View no longer captures coordinates (correct behaviour), the amber dot
stays at the original EXIF location when the author uses Capture View after panning.
This is intentional but may be briefly confusing. Consider a small tooltip clarifying
"dot = flyTo target; pan does not move it".

### 6. `camera_center` vs `coordinates` — long-term schema improvement
The cleanest eventual fix for the offset/drift problem is to store two separate fields
on the Slide entity:
- `coordinates` — the geographic EXIF point; drives the marker
- `camera_center` — the explicit flyTo target; can differ from coordinates if the
  author wants to frame a wider context shot

This would make `offset` redundant (the camera would be centred exactly on
`camera_center`). Requires a base44 / Supabase schema addition. Not urgent given the
current working state.

---

## UI Positional Notes (current)

The panel is `fixed`, `bottom-[76px]`, `right-6`, `w-[300px]`, `z-[9990]`.
It sits above the story footer bar (`z-[9999]`). On mobile it may overlap the content
but this is an author-only tool used on desktop.

Potential improvements to panel layout (not yet implemented):
- Draggable / repositionable panel
- Collapse to icon-only when not in focus
- Move trigger from footer to a persistent floating button visible during scrolling

---

## Commits (this feature, branch `claude-fixes-v2`)

| Hash | Summary |
|---|---|
| (early) | Initial LiveMapEditor component + StoryFooter edit icon |
| (early) | MapContainer onMapReady callback; mapInstanceRef in StoryMapView |
| bdec1e8 | Fix persistence: full slide object in handleSave; activeSlide update in onSlideSave |
| eaa2704 | Add chapter_id + order to loadStory whitelist; diagnostic console.logs |
| 256ddf9 | Restore coordinates capture in Capture View (subsequently reverted approach) |
| fc026da | Reinstate offset [-200,0]; restrict Capture View to zoom/bearing/pitch only |
