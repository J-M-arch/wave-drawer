// Single source of truth for shared application constants.
//
// Before adding a constant here, ask whether more than one module needs it.
// Module-private constants (e.g. audio FFT sizes) belong in their own module.

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 400;

// Control-point resolution options. This array is the authoritative list:
// index.html must stay in sync with it (see ui/renderHtml.js / AGENTS.md).
export const POINT_OPTIONS = [8, 16, 32, 64, 128, 256, 512, 1024];
export const DEFAULT_POINT_COUNT = 64;

// Frequency slider bounds (Hz), mirrored by the <input type="range"> in index.html.
export const FREQUENCY_MIN = 20;
export const FREQUENCY_MAX = 2000;
export const FREQUENCY_DEFAULT = 440;
