# Storyboarder — Development Path

> Status: Beta / Proof of Concept — deployed as a web route within Storylines. Long-term target is a standalone native iOS app distributed via TestFlight.

---

## What It Is

Storyboarder is a mobile-first capture tool designed for NGO field teams. It enables a user to walk a site with their phone and build a structured Storylines story on location — photos, GPS coordinates, chapter structure, and slide captions — without any desktop involvement.

The intended workflow:

```
Field capture (Storyboarder mobile)
        ↓
Story synced to Supabase
        ↓
Desktop editor (StoryEditor) — review, enrich, publish
        ↓
Storylines viewer (StoryMapView)
```

---

## Current Form (Phase 1 — Web Route)

Storyboarder currently runs as a protected route within the Storylines web app at `/Storyboarder`. It is accessible on any device via browser but is optimised for iPhone use.

### What works
- Full story/chapter/slide creation directly to Supabase
- GPS coordinate capture per slide via browser geolocation
- Photo capture via `<input capture="environment">`
- Image compression before upload (800px max, 85% quality) — protects field transfer times
- EXIF date extraction — capture date written to `capture_date` on slide
- Chapter structure — multiple chapters per session
- Slide captions — typed description saved per slide
- Auth — protected behind Storylines user accounts

### Known limitations in current form

| Limitation | Cause | Impact |
|---|---|---|
| Photo originals not saved to Camera Roll | Browser cannot write to Photos library | No path back to original resolution |
| Share Sheet workaround | iOS security boundary — only native APIs can write to Photos | Adds one tap per photo; user can dismiss |
| Images compressed to 800px | Intentional — bandwidth in field | Low-res stored version; originals unrecoverable if not saved via Share Sheet |
| Images not registered in Media Library | Storyboarder writes to `slides` table only, not `media` table | Photos exist in storage but invisible to Media Library |
| Voice recorder bypassed | Technical issues; placeholder UI in place | Caption entry is text-only for now |
| Web URL dependency | App loads from Netlify on each session | Requires signal to launch; no offline capability |
| Session fragility | iOS may terminate Safari tabs when backgrounded | In-progress session can be lost if phone sleeps mid-session |

### Assessment for beta use

None of the above are blockers for proof-of-concept field testing. The core loop — open app, name story, name chapter, take photos, finish — works reliably. The Share Sheet workaround for saving originals is acceptable friction for beta. The compressed images are suitable for reviewing and editing structure on desktop; quality is usable for most web/screen contexts.

**Recommendation:** proceed with web-route beta testing. Treat current form as a validation tool for the workflow concept, not a production field instrument.

---

## Target Form (Phase 2 — Native iOS via Capacitor + TestFlight)

The web-route form has structural limitations that cannot be resolved without a native shell. The long-term target is a standalone iOS app built with Capacitor, distributed internally via TestFlight.

### Why native is required

- **Photos library access** — native `@capacitor/camera` with `saveToGallery: true` saves originals to Camera Roll automatically, no share sheet, no user action required
- **Offline capability** — app loads from device, not a URL; works with no signal
- **Session stability** — native apps are not subject to Safari tab termination
- **Background GPS** — more reliable and accurate than browser geolocation
- **No URL to manage** — field teams install once via TestFlight; updates pushed automatically
- **Future: voice capture** — native microphone access is more robust than Web Audio API on iOS

### What Capacitor migration preserves

Capacitor wraps the existing React/Vite codebase in a native iOS shell. It does not replace the UI or logic.

| Component | Fate in native app |
|---|---|
| All React/JSX UI | Unchanged |
| Tailwind, Framer Motion | Unchanged |
| Supabase client + auth | Unchanged |
| `<input capture>` | Replaced by `@capacitor/camera` (~20 lines) |
| `navigator.geolocation` | Replaced by `@capacitor/geolocation` (more reliable) |
| `navigator.share` workaround | Removed — `saveToGallery: true` handles it natively |
| ImageResizer.jsx | Retained — compression still useful for upload speed |

### Distribution via TestFlight

TestFlight is Apple's official internal beta distribution platform. It does not require App Store publication.

- Requires Apple Developer account ($99/year)
- Up to 10,000 external testers invited by email
- Testers install the free TestFlight app; Storyboarder appears inside it
- Builds expire after 90 days — upload a new build to refresh
- Internal team members (up to 100) receive builds instantly without Apple review
- Indistinguishable from a production app to the end user

### Migration steps (when ready)

1. New Vite + React project extracting Storyboarder and its dependencies
2. `npm install @capacitor/core @capacitor/ios @capacitor/camera @capacitor/geolocation`
3. Swap `<input capture>` for `@capacitor/camera` in `handlePhotoCapture`
4. Swap `navigator.geolocation` for `@capacitor/geolocation` in `captureGPS`
5. Xcode configuration — bundle ID, provisioning profile, permissions (`NSCameraUsageDescription`, `NSPhotoLibraryAddUsageDescription`, `NSLocationWhenInUseUsageDescription`)
6. TestFlight build + upload
7. Invite field team

---

## Outstanding Items Before Native Migration

The following should be addressed in the web-route phase first, so they carry over cleanly:

- [ ] Register Storyboarder photos in `media` table (so they appear in Media Library)
- [ ] Voice recorder — resolve or replace before native build
- [ ] Media Library swap — desktop mechanism to replace compressed slide image with original
- [ ] Offline queue — consider local-first capture with sync on reconnection (Capacitor + SQLite)

---

## Related Docs

- `concept-story-planner.md` — desktop pre-production companion to Storyboarder
- `docs/migrations/` — database schema changes
