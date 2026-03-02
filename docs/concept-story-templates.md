# Concept: Story Templates

## The Idea
A "template" is a named combination of map style + UI theme that a user selects when creating a story. Switching template changes the whole aesthetic — map, typography, banner, cards — in one action.

## What a Template Covers
- **Map style** — Mapbox style URL (already implemented via MAP_STYLES a/c)
- **Typography** — font family for banner title, chapter cards, description card (e.g. Raleway vs Montserrat)
- **Banner** — background opacity/colour (e.g. white/95 vs transparent)
- **Cards** — chapter title card overlay darkness, carousel card bg (white/90 vs dark)
- **Accent colour** — amber is current default; could vary per template
- **Route/marker colour** — currently chapter-indexed; could be template-driven

## Implementation Approach
A `MAP_THEMES` object alongside `MAP_STYLES`:
```js
const MAP_THEMES = {
    a: {
        font: 'Raleway',
        bannerBg: 'bg-white/95',
        bannerText: 'text-slate-800',
        cardBg: 'bg-white/90',
        cardText: 'text-slate-800',
        accent: '#d97706',  // amber
    },
    c: {
        font: 'Montserrat',
        bannerBg: 'bg-transparent',
        bannerText: 'text-white',
        cardBg: 'bg-black/40',
        cardText: 'text-white',
        accent: '#ffffff',
    },
}
```
Theme passed via React context from StoryMapView — components read from it rather than hardcoded classes.

## Proof of Concept — Style C + Righteous (March 2026)

Tested associating Google Font **Righteous** with Style C. Applied to: banner story title, chapter number/name on title card, carousel slide title. Font passed via `mapStyle` prop → `THEME_FONTS[mapStyle]` inline style, with no structural changes.

**Observed:** Style C is a darker cartographic map that creates strong tonal contrast. The gradient route line (amber→white, `line-gradient`) reads significantly better against this base than against Style A — the dark map gives the gradient room to breathe. Typography shift reinforces the visual register change.

**Key insight:** The map style doesn't just change the basemap — it self-selects a visual language. Route treatment, typography, and card overlays all reinforce each other naturally. A story could shift registers mid-journey (e.g. Style A for urban chapters, Style C for wilderness sections) using the per-chapter `map_style` field already in the DB schema.

**Font note:** Righteous is a strong display choice for C. The original concept suggested Montserrat — worth testing both. Raleway (current default) suits Style A well.

## User-Facing Templates
Templates would be named presets in the story editor:
- "Classic" → Style A + Raleway + white banner
- "Dark" → Style C + Montserrat + transparent banner
- etc.

Each template maps to a `(mapStyle, theme)` pair. Users pick a template; individual overrides could still be possible at chapter level.

## Prerequisite
- Upgrade mapbox-gl v2 → v3 to unlock full range of Mapbox Standard styles for template variety
- Template names to be defined once visual options are clearer

## Status
Partially prototyped. Map style switching (a/c) implemented. Font-per-style implemented via `THEME_FONTS` in StoryChapter + StoryMapBanner. Full theme system (banner transparency, card bg, accent colour) not yet built.
