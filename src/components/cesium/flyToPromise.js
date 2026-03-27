import * as Cesium from 'cesium'

/**
 * Cinematic easing: cubic ease-in, quintic ease-out.
 *
 * The asymmetric curve gives a gentle departure and a very gradual arrival —
 * at 90 % of flight time the camera has already covered ~99.99 % of the path,
 * so the final approach feels like a smooth deceleration rather than a hard stop.
 *
 *   t ∈ [0, 0.5]  →  cubic in:   4t³
 *   t ∈ [0.5, 1]  →  quintic out: 1 − (−2t+2)⁵ / 2
 */
const cinematicEase = t =>
    t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 5) / 2

/**
 * Wraps viewer.camera.flyTo in a Promise.
 * Resolves on complete OR cancel (safe for cleanup).
 */
export function flyToPromise(viewer, step) {
    // Guard: never pass NaN/Infinity to Cesium — it propagates into WebGL
    // buffers and crashes the render loop with "Invalid array length".
    if (!Number.isFinite(step.lat) || !Number.isFinite(step.lng) || !Number.isFinite(step.alt)) {
        return Promise.resolve()
    }
    return new Promise(resolve => {
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                step.lng,
                step.lat,
                step.alt
            ),
            orientation: {
                heading: Cesium.Math.toRadians(step.heading ?? 0),
                pitch:   Cesium.Math.toRadians(step.pitch   ?? -30),
                roll:    0,
            },
            duration:       step.duration ?? 3,
            easingFunction: cinematicEase,
            complete: resolve,
            cancel:   resolve,   // resolve on cancel so await chains don't hang
        })
    })
}

/**
 * Instant camera placement — no animation.
 * Use for the first step of a sequence or hard chapter cuts.
 */
export function setViewInstant(viewer, step) {
    if (!Number.isFinite(step.lat) || !Number.isFinite(step.lng) || !Number.isFinite(step.alt)) return
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
            step.lng,
            step.lat,
            step.alt
        ),
        orientation: {
            heading: Cesium.Math.toRadians(step.heading ?? 0),
            pitch:   Cesium.Math.toRadians(step.pitch   ?? -30),
            roll:    0,
        },
    })
}
