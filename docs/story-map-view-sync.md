# Story View → Map View Sync

## The Problem

When a user opens Story view (fullscreen slide overlay) from the chapter carousel, navigates to a different slide or chapter, then clicks "Map View" to return, three things should happen:

1. The map camera flies to the last slide viewed in Story view
2. The chapter carousel shows that same slide
3. The chapter title banner fires for the chapter being returned to

Previously, all three reverted to the "departure" state (the position/slide when Story view was opened).

---

## Root Causes

### 1. Scroll handler overriding the camera after return

After returning to Map view, the page scrolls to restore position. This fired the scroll-based chapter-detection handler, which detected the departure chapter in the viewport, saw a mismatch with `activeChapter`, and called `setMapConfig()` with the departure slide's coordinates — overriding the fly-to that had just been triggered.

### 2. Stale closure in the scroll handler

The scroll handler was created inside `useEffect([activeChapter, chapters])`. Between `setActiveChapter(chIdx)` being called and React re-running the effect, the old handler (with stale `activeChapter`) could fire and make incorrect chapter comparisons.

### 3. No mechanism to sync the carousel slide

`activeChapterSlideIndex` is local state inside `StoryChapter` — the parent had no way to tell it which slide to display. Setting `setActiveSlide(sl)` in the parent only updates the parent's own `activeSlide` state, not the carousel position inside `StoryChapter`.

### 4. Race condition when opening the carousel for a new chapter (cross-chapter navigation)

When returning to a chapter whose carousel was not open, `handleOpenCarousel()` sets `showCarousel = true`, but `ChapterCarousel` hasn't mounted yet. `carouselScrollToRef.current` is null at that moment, so the immediate scroll attempt fails. Embla's `emblaApi` only becomes available asynchronously after the component mounts.

### 5. Chapter title banner suppressed on cross-chapter return

The chapter title banner depends on `carouselOpened` state. `useEffect([activeChapter])` resets `carouselOpened(false)` on every chapter change (to re-arm the banner for new chapters the user scrolls into). React runs child effects before parent effects; the child's `handleOpenCarousel()` → `setCarouselOpened(true)` fired first, then the parent's `useEffect([activeChapter])` fired last with `setCarouselOpened(false)` — the last write won, so the banner never appeared.

---

## Solutions

### Fix 1: Scroll to the correct chapter card after returning

**File:** `src/pages/StoryMapView.jsx` — `handleGoToMapView`, `handleOverlayClose`

Instead of restoring scroll to the departure position, scroll to `chapterRefs.current[chIdx]` (the story-view chapter card), centred in the viewport. This ensures the chapter visible in the viewport always matches `activeChapter`, so the scroll handler's mismatch condition (`activeChapterStateRef.current !== index`) is never true and `setMapConfig` is never called.

```javascript
const targetEl = chIdx >= 0 ? chapterRefs.current[chIdx] : null;
if (targetEl) {
    setTimeout(() => {
        const rect = targetEl.getBoundingClientRect();
        const targetScroll = Math.max(0,
            window.scrollY + rect.top - (window.innerHeight / 2) + (rect.height / 2)
        );
        window.scrollTo(0, targetScroll);
    }, 50);
}
```

### Fix 2: Replace stale closure with a ref

**File:** `src/pages/StoryMapView.jsx`

Added `activeChapterStateRef = useRef(-1)` updated on every render (outside any effect). The scroll handler reads `activeChapterStateRef.current` instead of the closed-over `activeChapter`. The effect deps were changed from `[activeChapter, chapters]` to `[chapters]` so the handler is not recreated on every chapter change.

```javascript
// Top of component, outside any effect:
activeChapterStateRef.current = activeChapter;
```

### Fix 3: Timestamp-based suppress window

**File:** `src/pages/StoryMapView.jsx`

Two suppress refs (changed from booleans to timestamps) prevent `onSlideChange` and the scroll handler from overriding the camera for 1000 ms after returning from Story view:

- `suppressNextOnSlideChangeMapConfig` — blocks `setMapConfig` in `onSlideChange`
- `suppressScrollHandlerUntil` — blocks `setMapConfig` in the scroll handler

```javascript
suppressNextOnSlideChangeMapConfig.current = Date.now() + 1000;
suppressScrollHandlerUntil.current = Date.now() + 1000;
```

### Fix 4: `targetSlide` prop to sync the carousel slide

**Files:** `src/pages/StoryMapView.jsx`, `src/components/storymap/StoryChapter.jsx`

Added `targetSlide` state in `StoryMapView`. When returning from Story view, it is set to `{ chapter: chIdx, slide: slideIdx }`. Each `StoryChapter` receives `targetSlideIndex={targetSlide?.chapter === index ? targetSlide.slide : undefined}`. A `useEffect([targetSlideIndex])` in `StoryChapter` calls `handleOpenCarousel()` and `carouselScrollToRef.current(targetSlideIndex)` when the value changes.

`setTargetSlide(null)` is called in `openOverlay` (when Story view opens) to ensure the dep always transitions `undefined → slideIdx` on return, even if returning to the same slide twice.

### Fix 5: `initialIndex` prop to handle the carousel race condition

**Files:** `src/components/storymap/StoryChapter.jsx`, `src/components/storymap/ChapterCarousel.jsx`

Added `carouselInitialIndex` state in `StoryChapter`. When `targetSlideIndex` fires, `carouselInitialIndex` is set before `handleOpenCarousel()`. This is passed to `ChapterCarousel` as `initialIndex`.

`ChapterCarousel`'s `useEffect([emblaApi, scrollToRef])` — which fires when Embla first initialises — calls `emblaApi.scrollTo(initialIndex, true)` (instant jump). `initialIndex` is intentionally excluded from the effect deps so the jump only happens on first init, not on every change.

```javascript
// ChapterCarousel.jsx
React.useEffect(() => {
    if (scrollToRef && emblaApi) {
        scrollToRef.current = (idx) => emblaApi.scrollTo(idx);
        if (initialIndex > 0) emblaApi.scrollTo(initialIndex, true);
    }
}, [emblaApi, scrollToRef]); // eslint-disable-line react-hooks/exhaustive-deps
```

Two-path coverage:
- **Carousel already open** (same-chapter return): `carouselScrollToRef.current(targetSlideIndex)` fires immediately in `StoryChapter`'s `targetSlideIndex` effect.
- **Carousel not yet mounted** (cross-chapter return): `initialIndex` carries the target into `ChapterCarousel`'s Embla init effect.

### Fix 6: `openCarouselOnChapterChangeRef` for the banner

**File:** `src/pages/StoryMapView.jsx`

Added `openCarouselOnChapterChangeRef = useRef(false)`. Set to `true` (synchronously, before any state updates) in `handleGoToMapView` and `handleOverlayClose` when `chIdx !== activeChapter`. The `useEffect([activeChapter])` checks this flag: if set, it calls `setCarouselOpened(true)` instead of `false` and clears the flag.

```javascript
// In handleGoToMapView / handleOverlayClose:
if (chIdx !== activeChapter) {
    openCarouselOnChapterChangeRef.current = true;
}
setActiveChapter(chIdx);

// In useEffect([activeChapter]):
if (openCarouselOnChapterChangeRef.current) {
    openCarouselOnChapterChangeRef.current = false;
    setCarouselOpened(true);
} else {
    setCarouselOpened(false);
}
```

---

## Known Limitation

Occasional incorrect carousel position on return. The multi-step async chain (state batch → effect → Embla init → scroll) means edge cases exist, particularly when:

- The chapter's `isActive` transition triggers resets concurrently with the `targetSlide` mechanism
- Rapid navigation in Story view leaves intermediate state changes in flight
- The 1000 ms suppress window expires before Embla has fully settled

This is documented here for future investigation rather than fixed now, as it is intermittent and the core behaviour is correct in the majority of cases.

---

## Files Changed

| File | Changes |
|------|---------|
| `src/pages/StoryMapView.jsx` | Suppress refs (timestamp), `activeChapterStateRef`, scroll-to-chapter-card, `targetSlide` state, `openCarouselOnChapterChangeRef`, `setTargetSlide(null)` in `openOverlay` |
| `src/components/storymap/StoryChapter.jsx` | `carouselInitialIndex` state, `targetSlideIndex` effect updated, `initialIndex` prop passed to `ChapterCarousel` |
| `src/components/storymap/ChapterCarousel.jsx` | `initialIndex` prop, jump on Embla init |

---

## Status

Implemented and working with intermittent edge cases noted above. Committed August 2026.
