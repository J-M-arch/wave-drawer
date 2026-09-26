import { CANVAS_WIDTH, CANVAS_HEIGHT, POINT_OPTIONS, DEFAULT_POINT_COUNT } from '../config.js';
import { EVENTS } from './eventsRegistry.js';

// The single owner of editable waveform state. Pure data + math: it never
// touches the DOM, canvas, or Web Audio. Consumers (canvas renderer, audio
// engine, future export/analysis modules) read it through its getters and
// react to its events.
//
// State rules (unchanged from the original app):
//   1. Each point is { x, y }; x values are ordered from 0 to WIDTH.
//   2. y stays between DEAD_ZONE and HEIGHT - DEAD_ZONE via clampY.
//   3. Edits commit() when completed (drag end, preset, reset, resample).
//   4. Resolution changes resample from the last COMMITTED shape, never
//      from an already-resampled array, to avoid cumulative smoothing.
//   5. The last point sits exactly at WIDTH; others are evenly spaced.

const DEAD_ZONE = 20;

export function createWaveformModel({ bus }) {
    const CENTER = CANVAS_HEIGHT / 2;

    let points = [];
    let committedPoints = [];

    const clampY = (y) => Math.max(DEAD_ZONE, Math.min(CANVAS_HEIGHT - DEAD_ZONE, y));
    const normalizeY = (y) => Math.max(-1, Math.min(1, 1 - y / CENTER));
    const clonePoints = (source) => source.map(({ x, y }) => ({ x, y }));

    function buildSpacing(count) {
        const spacing = CANVAS_WIDTH / (count - 1);
        return Array.from({ length: count }, (_, index) =>
            index === count - 1 ? CANVAS_WIDTH : index * spacing);
    }

    // Linear interpolation of a shape at a canvas x coordinate,
    // returning normalized amplitude in [-1, 1].
    function amplitudeFromPoints(source, targetX) {
        if (!source.length) return 0;
        const x = Math.max(0, Math.min(CANVAS_WIDTH, targetX));
        for (let i = 0; i < source.length - 1; i++) {
            if (source[i].x <= x && source[i + 1].x >= x) {
                const span = source[i + 1].x - source[i].x;
                const ratio = span ? (x - source[i].x) / span : 0;
                return normalizeY(source[i].y + ratio * (source[i + 1].y - source[i].y));
            }
        }
        return normalizeY(x <= source[0].x ? source[0].y : source[source.length - 1].y);
    }

    function init(count = DEFAULT_POINT_COUNT) {
        points = buildSpacing(count).map((x) => ({ x, y: CENTER }));
        commit();
    }

    function commit() {
        committedPoints = clonePoints(points);
    }

    function resample(count, source) {
        points = buildSpacing(count).map((x) => ({
            x,
            y: clampY((1 - amplitudeFromPoints(source, x)) * CENTER),
        }));
    }

    return {
        // --- Read access for renderers / analysers ---
        getPoints: () => points,
        getCenter: () => CENTER,
        getDeadZone: () => DEAD_ZONE,
        clampY,

        // Normalized horizontal phase [0, 1) -> amplitude [-1, 1].
        // This is the contract shared with the audio engine.
        getAmplitudeAtX: (normalizedX) => amplitudeFromPoints(points, normalizedX * CANVAS_WIDTH),

        init,
        commit,

        setPointCount(count) {
            const resolved = POINT_OPTIONS.includes(count) ? count : DEFAULT_POINT_COUNT;
            if (resolved !== points.length) {
                resample(resolved, committedPoints.length >= 2 ? committedPoints : points);
                commit();
                bus.emit(EVENTS.WAVEFORM_CHANGED);
            }
            return resolved;
        },

        movePoint(index, y) {
            if (index == null || !points[index]) return;
            points[index].y = clampY(y);
            bus.emit(EVENTS.WAVEFORM_CHANGED);
        },

        applyPreset(name) {
            const amplitude = CENTER - DEAD_ZONE;
            points.forEach((point) => {
                const x = point.x / CANVAS_WIDTH;
                const value = name === 'sine' ? Math.sin(2 * Math.PI * x)
                    : name === 'triangle' ? (x < 0.5 ? 4 * x - 1 : 3 - 4 * x)
                    : name === 'sawtooth' ? 2 * x - 1
                    : x < 0.5 ? 1 : -1; // square
                point.y = clampY(CENTER - amplitude * value);
            });
            commit();
            bus.emit(EVENTS.PRESET_APPLIED, { name });
            bus.emit(EVENTS.WAVEFORM_CHANGED);
        },

        reset() {
            init(points.length || DEFAULT_POINT_COUNT);
            bus.emit(EVENTS.WAVEFORM_RESET);
            bus.emit(EVENTS.WAVEFORM_CHANGED);
        },
    };
}
