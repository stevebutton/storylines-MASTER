# Cesium Route Rendering — Debug Notes

Status: **Disabled** — `useCesiumRoute` call is commented out in `CesiumStoryMap.jsx`.
Hook file retained at `src/components/cesium/useCesiumRoute.js` for reference.

---

## What should happen

`chapter.route_geometry` (`[[lat,lng],...]`) should render as an amber polyline draped on 3D terrain, visible only for the active chapter, fading in after the camera flight completes.

---

## Root constraint: altitude 0 is underground

GPS coordinates from geotagged photos are at WGS84 ellipsoid altitude 0.
On any land terrain, Google Photorealistic 3D Tiles are elevated above altitude 0.
Any polyline placed at altitude 0 is **inside the terrain geometry** and invisible.

**The only working solution is `clampToGround: true`**, which uses a `GroundPolylinePrimitive` to drape the line on the terrain surface.

---

## Why animation is difficult

`GroundPolylinePrimitive` (the backend for `clampToGround` polylines) evaluates positions **once at creation time** and bakes them into a GPU buffer. It does not support per-frame position updates.

This eliminates two common animation strategies:

### 1. Growing-positions animation (progressive draw)
Assigning a growing subset of positions each frame so the line appears to draw itself across the terrain.

- `CallbackProperty` on `positions`: Cesium calls the callback each frame, but `GroundPolylinePrimitive` does not rebuild geometry from the result. The line stays at its creation-time positions.
- `entity.polyline.positions = rawArray`: Silent failure. Cesium's entity system calls `.getValue(time)` on the assigned value; a plain `Cartesian3[]` does not have this method, so positions fall back to the creation-time snapshot.
- `new Cesium.ConstantProperty(arr)` each frame: Cesium correctly reads the value, but `GroundPolylinePrimitive` still does not rebuild from it. Result: full route appears at creation time regardless.
- `PolylineCollection` primitive with `line.positions = arr`: This writes directly to the GPU buffer and does update on screen — but without `clampToGround` these positions are at altitude 0 and therefore underground/invisible on all land terrain.

### 2. Material alpha fade-in
Keep positions static and `clampToGround`, animate only the material alpha via `CallbackProperty` (material uniform updates are lightweight and do not require geometry rebuilds).

```js
material: new Cesium.ColorMaterialProperty(
    new Cesium.CallbackProperty(() => {
        const alpha = Math.min(Math.max(0, Date.now() - fadeStart) / FADE_MS, 1)
        return Cesium.Color.fromCssColorString('#f59e0b').withAlpha(alpha)
    }, false)
)
```

**Expected result:** route fades in from transparent to amber over 1500ms.
**Actual result:** brief pause (= `flyDelayMs`), then full route cuts on at full opacity instantly.

This suggests `CallbackProperty` on `ColorMaterialProperty` is also not being evaluated per-frame for `GroundPolylinePrimitive`-backed entities in the current Cesium version, or the alpha value is being clamped/ignored.

---

## Cleanup (nuclear sweep)

The multi-route accumulation issue (all chapter routes visible simultaneously) was addressed with a nuclear sweep at the top of every effect and in every cleanup function:

```js
const toRemove = []
viewer.entities.values.forEach(e => { if (e.polyline) toRemove.push(e) })
toRemove.forEach(e => { try { viewer.entities.remove(e) } catch (_) {} })
```

This correctly prevents accumulation from React strict mode double-invocation or timer races. The cleanup logic itself is sound — the problem is the animation, not the lifecycle.

---

## What to investigate next

1. **`GeoJsonDataSource` approach** — load `route_geometry` as a GeoJSON object via `Cesium.GeoJsonDataSource.load()`. This uses a different internal path than entity polylines and may handle `clampToGround` + material updates differently:
   ```js
   Cesium.GeoJsonDataSource.load(geoJsonObject, {
       clampToGround: true,
       stroke: Cesium.Color.fromCssColorString('#f59e0b'),
       strokeWidth: 4,
   }).then(ds => viewer.dataSources.add(ds))
   ```

2. **`Corridor` entity** — uses `ClassificationType.TERRAIN` rather than a polyline primitive; different GPU path, may support material updates:
   ```js
   viewer.entities.add({
       corridor: {
           positions: allPositions,
           width: 40,  // metres
           material: Cesium.Color.fromCssColorString('#f59e0b').withAlpha(0.85),
           classificationType: Cesium.ClassificationType.TERRAIN,
       }
   })
   ```

3. **Cesium version check** — verify whether the installed version of CesiumJS supports `CallbackProperty` on `ColorMaterialProperty` for ground-clamped entities. The Cesium changelog may have relevant notes.

4. **Drop animation, show immediately** — if all animation approaches fail, show the full route at `alpha: 0.85` immediately when the chapter becomes active. Nuclear cleanup ensures only the current chapter's route is visible. Less polished but functionally correct.

---

## Files

| File | Notes |
|------|-------|
| `src/components/cesium/useCesiumRoute.js` | Hook retained, not deleted. Contains the fade-in approach as last attempted. |
| `src/components/map/CesiumStoryMap.jsx` | Import and call commented out. |
| `docs/cesium-3d-style-spec.md` | Reference spec includes route rendering options (Options 1–3). |
