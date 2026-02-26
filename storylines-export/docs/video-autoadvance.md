# Video Auto-Advance — Design Notes & Implementation Status

## Feature

When a fullscreen video slide finishes playing, automatically advance to the next slide
without requiring the user to click the next button.

---

## Status

| Video type | Status | Notes |
|---|---|---|
| Uploaded / native (mp4, mov, etc.) | **Implemented** | `onEnded` event on `<video>` element |
| YouTube embed | Pending | Requires YouTube IFrame Player API |
| Vimeo embed | Pending | Requires Vimeo Player SDK |

---

## Implemented: Native / Uploaded Video

**How it works:**

The HTML `<video>` element fires an `onEnded` event when playback reaches the end.
`VideoPlayer` accepts an `onVideoEnded` callback prop and attaches it to the native event.
`FullScreenImageViewer` passes `handleNext` as that callback.

```
video finishes
    ↓
onEnded fires on <video> element
    ↓
onVideoEnded() called (= handleNext in FullScreenImageViewer)
    ↓
onNavigate(nextIndex) — advances to next slide
    ↓
TextPanelCarousel remounts with defaultOpen={!nextSlide.video_url}
    ↓
Panel opens automatically if next slide is an image
```

**Edge case — last slide:** `handleNext` already wraps to index 0 if the video is on
the last slide. This is consistent with manual next-button behaviour. If looping is
undesirable for auto-advance, a guard (`currentIndex < slides.length - 1`) can be added.

---

## Pending: YouTube

YouTube iframes do not fire DOM events. Detection requires the
[YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference).

**Implementation outline when needed:**

1. Load the YT script once: `<script src="https://www.youtube.com/iframe_api">`
2. Replace the bare `<iframe>` with a `<div id>` and instantiate `new YT.Player(id, {...})`
3. In `onStateChange`: when `event.data === YT.PlayerState.ENDED`, call `onVideoEnded()`
4. The embed URL must include `enablejsapi=1` parameter

**Complexity:** ~40 lines; requires managing the YT global and player instance lifecycle.

**Alternative (simpler but less reliable):** Listen for `window.message` events with
`event.data === '{"event":"onStateChange","info":0}'` — YouTube posts these without
requiring the full API, but the format is undocumented and may change.

---

## Pending: Vimeo

Vimeo iframes communicate via `postMessage` using the
[Vimeo Player SDK](https://github.com/vimeo/player.js).

**Implementation outline when needed:**

1. `npm install @vimeo/player` (or load from CDN)
2. Instantiate `new Vimeo.Player(iframeRef.current)`
3. `player.on('ended', onVideoEnded)`
4. Destroy player instance on component unmount

**Complexity:** ~20 lines with the SDK; cleaner than YouTube because the SDK is
well-maintained and the API is stable.

**Without the SDK (postMessage):** Listen on `window` for messages where
`event.data.event === 'finish'` — works but is fragile.

---

## Considerations for Future Implementation

**Auto-advance on last slide:** Currently wraps to slide 0 (consistent with manual nav).
Consider a `slide.auto_advance` boolean field on the Slide entity if per-slide control
is needed. No schema change required in base44/Supabase until then.

**User expectation:** Auto-advance feels natural for short clips (10–60s). For longer
videos (interviews, full features) it may be unwanted. A story-level or slide-level
`auto_advance` toggle would give authors control. Defer until use case is clearer.

**Seek / replay:** If the user seeks backward and the video re-ends, `onEnded` fires
again, causing a second auto-advance. This is unlikely in practice but worth monitoring.

**Pause then end:** If the user pauses mid-video, navigates away, and returns, the
`<video>` element remounts (keyed by `currentIndex`) so state resets cleanly. No issue.
