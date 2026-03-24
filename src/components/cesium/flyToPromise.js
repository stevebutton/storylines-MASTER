import * as Cesium from 'cesium'

/**
 * Wraps viewer.camera.flyTo in a Promise.
 * Resolves on complete OR cancel (safe for cleanup).
 */
export function flyToPromise(viewer, step) {
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
            duration: step.duration ?? 3,
            easingFunction: Cesium.EasingFunction.SINUSOIDAL_IN_OUT,
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
