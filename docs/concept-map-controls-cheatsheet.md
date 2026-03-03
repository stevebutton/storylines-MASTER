# Concept: Map Controls Cheat Sheet Overlay

## The Idea
A small `?` button in the BottomPillBar map controls pill that expands an overlay listing native Mapbox keyboard/mouse shortcuts. Pure discoverability — no extra functionality needed.

## Native Mapbox Controls (no code required)
| Action | Result |
|---|---|
| `Ctrl + drag` | Tilt + bearing simultaneously (most precise) |
| Right-click + drag | Rotate bearing only |
| Scroll wheel | Zoom |
| `Cmd + scroll` | Zoom faster |
| Double-click | Zoom in to point |
| `Shift + drag` | Zoom to bounding box |
| Two-finger drag (trackpad) | Pan |
| Two-finger pinch (trackpad) | Zoom |

## Implementation
- `?` icon button as last item in the map controls pill
- Click toggles a small card above the pill listing the shortcuts
- `AnimatePresence` fade-in/out, click outside to dismiss
- No new state needed beyond a `showCheatSheet` bool

## Status
Concept only — noted as a future addition for discoverability.
