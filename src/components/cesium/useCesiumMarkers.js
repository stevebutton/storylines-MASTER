import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'

/**
 * Adds a billboard marker for every slide that has a cesium_camera position.
 * Active slide is amber; others are white with amber outline.
 *
 * Uses BillboardCollection (screen-space quads) rather than PointGraphics
 * because PointGraphics + disableDepthTestDistance behaves inconsistently
 * when Google Photorealistic 3D Tiles are the only scene content.
 * Billboards draw last in the Cesium pipeline and are always visible.
 *
 * Altitude: camera position alt / 2 — halfway between camera and sea level,
 * so markers float clearly above the tile mesh without being at the camera.
 */

/**
 * Given a cesiumCamera spec, compute the lat/lng/alt where the camera is
 * actually looking (ray from camera position along heading+pitch hits the
 * WGS84 ellipsoid). Returns null if the ray misses (e.g. pitch >= 0).
 */
function getLookAtPosition(cam) {
    const cameraPos = Cesium.Cartesian3.fromDegrees(cam.lng, cam.lat, cam.alt ?? 500)

    const heading = Cesium.Math.toRadians(cam.heading ?? 0)
    const pitch   = Cesium.Math.toRadians(cam.pitch   ?? -30)

    // Direction in local ENU frame: East, North, Up
    const localDir = new Cesium.Cartesian3(
        Math.sin(heading) * Math.cos(pitch),
        Math.cos(heading) * Math.cos(pitch),
        Math.sin(pitch)
    )

    // Transform ENU direction to world (ECEF) space
    const enuToWorld = Cesium.Transforms.eastNorthUpToFixedFrame(cameraPos)
    const worldDir   = Cesium.Matrix4.multiplyByPointAsVector(
        enuToWorld, localDir, new Cesium.Cartesian3()
    )
    Cesium.Cartesian3.normalize(worldDir, worldDir)

    // Ray–ellipsoid intersection
    const ray          = new Cesium.Ray(cameraPos, worldDir)
    const intersection = Cesium.IntersectionTests.rayEllipsoid(ray, Cesium.Ellipsoid.WGS84)
    if (!intersection) return null

    const hitPoint    = Cesium.Ray.getPoint(ray, intersection.start, new Cesium.Cartesian3())
    const cartographic = Cesium.Cartographic.fromCartesian(hitPoint)
    return {
        lng: Cesium.Math.toDegrees(cartographic.longitude),
        lat: Cesium.Math.toDegrees(cartographic.latitude),
        alt: Math.max(10, cartographic.height + 10),
    }
}

function makeCircleCanvas(size, fillColor, strokeColor, strokeWidth) {
    const canvas = document.createElement('canvas')
    canvas.width  = size
    canvas.height = size
    const ctx     = canvas.getContext('2d')
    const r       = (size - strokeWidth) / 2
    const cx      = size / 2
    ctx.beginPath()
    ctx.arc(cx, cx, r, 0, Math.PI * 2)
    ctx.fillStyle   = fillColor
    ctx.fill()
    ctx.lineWidth   = strokeWidth
    ctx.strokeStyle = strokeColor
    ctx.stroke()
    return canvas
}

const CANVAS_ACTIVE   = makeCircleCanvas(28, '#d97706', '#ffffff', 3)
const CANVAS_INACTIVE = makeCircleCanvas(20, 'rgba(255,255,255,0.85)', '#d97706', 2.5)

export function useCesiumMarkers(viewer, chapters, activeSlideId) {
    const collectionRef = useRef(null)   // BillboardCollection
    const billboardMap  = useRef({})     // { slideId: billboard }

    // ── Build collection when viewer + chapters arrive ─────────────────────────
    useEffect(() => {
        if (!viewer) return

        // Remove previous collection entirely
        if (collectionRef.current && !viewer.isDestroyed()) {
            viewer.scene.primitives.remove(collectionRef.current)
        }
        collectionRef.current = null
        billboardMap.current  = {}

        const collection = new Cesium.BillboardCollection({ scene: viewer.scene })

        let count = 0
        chapters?.forEach(chapter => {
            chapter.slides?.forEach(slide => {
                const cam = slide.cesium_camera
                if (!cam?.lat || !cam?.lng) return

                // Place marker at the point the camera is looking at, not the camera itself
                const lookAt = getLookAtPosition(cam)
                if (!lookAt) return

                const isActive = slide.id === activeSlideId

                const billboard = collection.add({
                    position:                 Cesium.Cartesian3.fromDegrees(lookAt.lng, lookAt.lat, lookAt.alt),
                    image:                    isActive ? CANVAS_ACTIVE : CANVAS_INACTIVE,
                    verticalOrigin:           Cesium.VerticalOrigin.CENTER,
                    horizontalOrigin:         Cesium.HorizontalOrigin.CENTER,
                    eyeOffset:                new Cesium.Cartesian3(0, 0, 0),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    id:                       slide.id,
                })
                billboardMap.current[slide.id] = billboard
                count++
            })
        })

        viewer.scene.primitives.add(collection)
        collectionRef.current = collection

        console.log(`[useCesiumMarkers] added ${count} billboard markers`)

        return () => {
            if (!viewer.isDestroyed()) {
                viewer.scene.primitives.remove(collection)
            }
            collectionRef.current = null
            billboardMap.current  = {}
        }
    }, [viewer, chapters]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Swap billboard image when active slide changes ─────────────────────────
    useEffect(() => {
        Object.entries(billboardMap.current).forEach(([slideId, bb]) => {
            const isActive = slideId === activeSlideId
            bb.image = isActive ? CANVAS_ACTIVE : CANVAS_INACTIVE
        })
    }, [activeSlideId])
}
