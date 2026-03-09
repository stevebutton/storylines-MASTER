/**
 * fadeMapLayer — fade a Mapbox GL layer in or out over FADE_MS milliseconds.
 *
 * Uses paint-property opacity transitions instead of instant visibility
 * toggling so layers dissolve smoothly. Handles fill, line, raster, circle,
 * and fill-extrusion layer types; falls back to an instant toggle for others.
 */

const FADE_MS = 500;

// Per-type opacity + transition paint-property names
const FADE_PROPS = {
    fill:             ['fill-opacity',           'fill-opacity-transition'],
    line:             ['line-opacity',           'line-opacity-transition'],
    raster:           ['raster-opacity',         'raster-opacity-transition'],
    circle:           ['circle-opacity',         'circle-opacity-transition'],
    'fill-extrusion': ['fill-extrusion-opacity', 'fill-extrusion-opacity-transition'],
    heatmap:          ['heatmap-opacity',         'heatmap-opacity-transition'],
    background:       ['background-opacity',      'background-opacity-transition'],
};

// Tracks pending hide timers so a quick show cancels an in-progress fade-out
const _hideTimers = new Map();

export function fadeMapLayer(map, layerId, show) {
    if (!map || !layerId) return;
    try {
        if (!map.getLayer(layerId)) return;

        const layerType = map.getLayer(layerId).type;

        if (layerType === 'symbol') {
            // Symbol layers have two opacity sub-properties
            _fadeSymbol(map, layerId, show);
            return;
        }

        const props = FADE_PROPS[layerType];
        if (!props) {
            // Unknown type — instant toggle
            map.setLayoutProperty(layerId, 'visibility', show ? 'visible' : 'none');
            return;
        }

        const [opProp, transProp] = props;

        if (show) {
            _cancelHide(layerId);
            // Snap to 0 without transition, make visible, then fade in
            map.setLayoutProperty(layerId, 'visibility', 'visible');
            map.setPaintProperty(layerId, transProp, { duration: 0, delay: 0 });
            map.setPaintProperty(layerId, opProp, 0);
            requestAnimationFrame(() => {
                if (!map.getLayer(layerId)) return;
                map.setPaintProperty(layerId, transProp, { duration: FADE_MS, delay: 0 });
                map.setPaintProperty(layerId, opProp, 1);
            });
        } else {
            map.setPaintProperty(layerId, transProp, { duration: FADE_MS, delay: 0 });
            map.setPaintProperty(layerId, opProp, 0);
            const t = setTimeout(() => {
                _hideTimers.delete(layerId);
                if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'none');
            }, FADE_MS + 60);
            _hideTimers.set(layerId, t);
        }
    } catch (_) {
        // Layer may not exist in the current style — silently ignore
    }
}

function _fadeSymbol(map, layerId, show) {
    const pairs = [
        ['icon-opacity', 'icon-opacity-transition'],
        ['text-opacity', 'text-opacity-transition'],
    ];
    if (show) {
        _cancelHide(layerId);
        map.setLayoutProperty(layerId, 'visibility', 'visible');
        for (const [op, tr] of pairs) {
            map.setPaintProperty(layerId, tr, { duration: 0, delay: 0 });
            map.setPaintProperty(layerId, op, 0);
        }
        requestAnimationFrame(() => {
            if (!map.getLayer(layerId)) return;
            for (const [op, tr] of pairs) {
                map.setPaintProperty(layerId, tr, { duration: FADE_MS, delay: 0 });
                map.setPaintProperty(layerId, op, 1);
            }
        });
    } else {
        for (const [op, tr] of pairs) {
            map.setPaintProperty(layerId, tr, { duration: FADE_MS, delay: 0 });
            map.setPaintProperty(layerId, op, 0);
        }
        const t = setTimeout(() => {
            _hideTimers.delete(layerId);
            if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'none');
        }, FADE_MS + 60);
        _hideTimers.set(layerId, t);
    }
}

function _cancelHide(layerId) {
    if (_hideTimers.has(layerId)) {
        clearTimeout(_hideTimers.get(layerId));
        _hideTimers.delete(layerId);
    }
}
