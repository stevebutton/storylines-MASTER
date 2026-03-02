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
Concept only. Map style switching (a/c) already implemented. Theme system not yet built.
