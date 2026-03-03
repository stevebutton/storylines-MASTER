# Concept: Story Planner (Desktop)

> Status: Deferred — parked for future development. Active focus is Storyboarder (mobile).

---

## The Problem It Solves

The current workflow has a gap between "blank story" and "full editor". StoryEditor is a finishing tool — it expects content to exist. When a user knows they're going somewhere next week and wants to plan a story arc in advance, there's nothing to support that pre-production phase.

The mobile Storyboarder solves *unplanned capture* — you're in a place, things are happening, you grab it. Story Planner solves *planned capture* — you know the story arc before you leave.

---

## The Workflow It Enables

```
Plan (desktop) → Capture (mobile) → Edit (desktop) → Publish
```

Story Planner sits at the front of this pipeline. You sketch the structure, define the geographic arc, name the chapters — then head out with Storyboarder knowing what you're looking for. You return to the editor with content that already has a home.

---

## How It Differs from StoryEditor

| | Story Planner | StoryEditor |
|---|---|---|
| Purpose | Define structure | Polish content |
| Primary input | Map clicks, text outline | Media uploads, rich text |
| Media required | No — placeholder-first | Yes |
| Session length | Short (2–5 min) | Long |
| Mental model | "Planning a future story" | "Finishing an existing story" |

---

## Core Capabilities

### Map-first chapter creation
Click points on a Mapbox map to drop chapter anchors. Name each one. The map interaction defines the geographic arc of the story — the route becomes the skeleton. This is the central differentiator and should be the primary entry point.

### Chapter cards with placeholder state
Cards clearly signal "no content yet" — they're ready for mobile capture or manual upload to fill in later. Structure is the output, not content.

### Drag to reorder
Rearranging chapters is the main creative act at this stage. Should be trivial — no saves, no confirmation, just drag.

### Outline import
Paste a plain text or markdown list of chapter ideas; the tool scaffolds the chapter structure. Removes even the map-click friction for purely narrative (non-geographic) stories.

### AI scaffolding (optional, later)
Describe the story in a sentence. Get a suggested chapter breakdown. Low priority — the manual tools above cover most cases.

---

## What It Should NOT Include

Deliberately excluded to preserve speed and focus:
- Media upload or management
- Detailed text / description editing
- Map style choices
- PDF attachments
- Extended content fields
- Slide-level detail of any kind

All of that belongs in StoryEditor. Story Planner's constraint is what it *doesn't do*. Feature creep into editor territory would eliminate its value.

---

## Architecture Decision: Separate Tool

Story Planner should be a **separate page/tool**, not a responsive variant of Storyboarder. Reasons:

1. **Incompatible interaction paradigms** — mobile is camera-button-first, voice-primary, portrait, short sessions. Desktop is map-first, keyboard/mouse, landscape, planning sessions. These don't collapse with a media query.

2. **Responsive design is for layout, not different workflows** — `isMobile ? <CameraButton> : <MapSketch>` is two apps in one file, not responsive design.

3. **Different component needs** — the desktop tool requires a map-click interaction layer, drag-and-drop, possibly an outline parser. None of that belongs in Storyboarder.

**Shared layer** (thin but real):
- Supabase CRUD utilities (story/chapter creation)
- `generateId`, GPS utilities
- Same underlying data model

---

## Naming

"Storyboarder" works as an umbrella concept with mobile and desktop variants. Alternatively, a distinct name reflecting its planning nature: *Story Planner*, *Story Sketch*, *Story Architect*. The name should imply pre-production rather than field capture. Decide before building — it shapes how the tool is surfaced in the UI.

---

## Open Questions

- Does it live as a panel within StoryEditor, or a completely separate entry point?
- Should it import from an existing story (reorder/restructure) or only create new?
- Geographic arc vs. purely narrative stories — both valid, but the map-first approach naturally privileges location-based work. Worth considering a "no map" mode for narrative-only stories.
