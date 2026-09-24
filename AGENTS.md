# Wave Drawer: Coding-Agent Guide

## Purpose

Wave Drawer is a no-build browser application for drawing a periodic waveform and hearing it through the Web Audio API. It is intentionally small and uses only native HTML, CSS, JavaScript, Canvas 2D, and Web Audio APIs.

The application lets a user:

- Edit vertically constrained control points on an 800 x 400 canvas.
- Choose the control-point resolution from 8, 16, 32, 64, 128, 256, 512, or 1024 points.
- Apply sine, triangle, sawtooth, and square presets.
- Play or pause the current waveform.
- Change the oscillator frequency from 20 Hz to 2000 Hz in 10 Hz steps.

## Runtime and development model

There is no package manager, bundler, transpiler, test framework, or dependency manifest. Do not add build tooling for routine changes.

Run the app through HTTP because `script.js` is an ES module:

```bash
cd /home/operator/hangar/wave-drawer
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080/` in a browser. If port 8080 is occupied, use another port and keep the URL consistent with the server command.

Opening `index.html` directly with `file://` is not a reliable development path because browsers restrict module imports from local files.

## File ownership

### `index.html`

Defines the DOM contract. The IDs and data attributes below are consumed by `script.js` and must remain stable unless both files are updated together:

| Element | Contract |
|---|---|
| `#waveCanvas` | 800 x 400 drawing surface |
| `#playPauseBtn` | Toggles audio playback |
| `#clearBtn` | Resets the waveform |
| `#pointCount` | Discrete point-count selector |
| `#pointCountValue` | Human-readable selected-count display |
| `#frequency` | Frequency range input |
| `#frequencyValue` | Human-readable frequency display |
| `#status` | User-facing status/error message |
| `.preset-btn[data-preset]` | Preset buttons; supported values are `sine`, `triangle`, `sawtooth`, `square` |

The point-count options currently live in both HTML and JavaScript. If the list changes, update both places.

The script must be loaded as:

```html
<script type="module" src="script.js"></script>
```

### `script.js`

Owns application state and user interaction:

- DOM lookup and event registration.
- The editable `points` array.
- `authoredPoints`, the last committed shape used as the source when changing resolution.
- Canvas grid, axes, control-point, and waveform rendering.
- Mouse and touch editing.
- Point-count resampling.
- Preset generation and reset behavior.
- Translation between canvas coordinates and normalized audio amplitude.
- The adapter passed to `createAudioController`.

Important state rules:

1. Each point has `{ x, y }`; `x` values are ordered from `0` to `WIDTH`.
2. `y` values must stay between `DEAD_ZONE` and `HEIGHT - DEAD_ZONE` through `clampY`.
3. Call `commitPoints()` after a completed edit, preset application, reset, or resolution change.
4. Resolution changes must resample from `authoredPoints`, not repeatedly from the already resampled `points`, to avoid cumulative smoothing.
5. The last point must be exactly at `WIDTH`; all other points are evenly spaced.
6. `getAmplitudeAtX()` accepts normalized horizontal phase in `[0, 1)` and returns amplitude in `[-1, 1]`.

### `audio.js`

Exports one factory:

```js
createAudioController({ getAmplitudeAtX, getFrequency, onStatus })
```

The module owns all Web Audio state:

- `AudioContext`
- Gain node
- Oscillator
- `PeriodicWave`
- Playback state

The controller exposes:

- `isPlaying`: read-only getter.
- `play()`: samples the current shape, creates the periodic wave, and starts an oscillator.
- `pause()`: stops the oscillator and reports the paused state.
- `stop()`: stops the oscillator without replacing the caller’s status message.

Keep this module independent from DOM elements and canvas objects. It receives waveform data through callbacks and reports user-visible state through `onStatus`.

## Audio pipeline

The audio path is intentionally not a direct “samples as coefficients” conversion:

1. `script.js` supplies normalized waveform samples through `getAmplitudeAtX`.
2. `audio.js` samples 2048 phases, excluding the duplicated endpoint.
3. A discrete Fourier transform calculates 128 harmonic coefficients.
4. The coefficients are peak-normalized to approximately `0.9`.
5. The coefficients are passed to `AudioContext.createPeriodicWave`.
6. An oscillator uses the resulting `PeriodicWave` at the selected frequency.

`PeriodicWave` expects Fourier harmonic coefficients, not raw time-domain samples. Do not regress this by assigning sampled waveform values directly to the `real` array.

The one-shot buffer path is only a fallback when `createPeriodicWave` is unavailable or rejects the generated coefficients. It uses the same waveform sampler and gain node.

## Interaction behavior

- Clicking or dragging selects the horizontally nearest point; horizontal movement may switch the active point.
- Vertical coordinates are clamped away from the top and bottom edges.
- Mouse and touch interactions share the same point-editing behavior.
- Applying a preset stops playback, changes the current points, commits the shape, redraws, and reports the preset.
- Reset stops playback and rebuilds the waveform at the currently selected point count.
- Changing point count preserves the current authored shape by linear interpolation.
- Changing point count or frequency while playing rebuilds playback from the current shape.
- Browser audio may require a user gesture; the Play button is the intended gesture.

## Safe change patterns

Before editing:

1. Read the relevant file and confirm whether a change belongs to UI markup, state/rendering, or audio.
2. Search for all consumers of any DOM ID, preset name, or exported function.
3. Preserve the module boundary: canvas/UI code should not own `AudioContext`, and audio code should not query the DOM.

When changing point resolution:

- Update the `<select>` options in `index.html`.
- Update `POINT_OPTIONS` and, if needed, `DEFAULT_POINTS` in `script.js`.
- Keep `currentCount()` validation aligned with the HTML options.
- Preserve `authoredPoints` as the resampling source.

When changing audio:

- Keep normalized amplitude in `[-1, 1]`.
- Preserve Fourier conversion and peak normalization.
- Stop the prior oscillator before replacing it.
- Keep status/error reporting explicit through `onStatus`.

When adding controls:

- Add the element to `index.html`.
- Add styling in `style.css`.
- Register listeners in `setup()`.
- Keep UI state synchronized when reset, presets, point-count changes, and playback transitions occur.

## Validation checklist

At minimum, run:

```bash
node --check script.js
node --check audio.js
```

For module and browser-serving changes, also run:

```bash
python3 -m http.server 8080
curl --fail --silent --show-error http://127.0.0.1:8080/
curl --fail --silent --show-error http://127.0.0.1:8080/script.js
curl --fail --silent --show-error http://127.0.0.1:8080/audio.js
curl --fail --silent --show-error http://127.0.0.1:8080/style.css
```

Manually verify in a browser when behavior changes:

1. Canvas renders with 256 centered points.
2. Mouse and touch editing move points and keep them inside the dead zone.
3. Every point-count option changes visible resolution without losing the authored shape.
4. Each preset produces the expected shape at every point count.
5. Play produces an audible waveform; frequency changes affect active playback.
6. Play/Pause, Reset, preset changes, and point-count changes do not leave stale playback.
7. Browser console has no module, DOM, or Web Audio errors.

Do not claim browser behavior was verified from syntax checks alone.

## Known constraints

- The app is browser-only and requires Web Audio support for sound.
- There is no automated browser test suite.
- The canvas backing resolution is fixed at 800 x 400; CSS resizing does not change its internal coordinate system.
- Fourier generation is intentionally CPU-heavy (`2048 * 128` harmonic operations) but acceptable for this small interactive app.
- The point selector options are duplicated between HTML and JavaScript; this is a maintenance hotspot.
- `audio.js` assumes `window.AudioContext` or `window.webkitAudioContext` exists when Play is invoked.

## Scope guidance for future agents

Prefer surgical changes. Do not split the app into more modules unless a new responsibility has a clear independent boundary. In particular, presets, pointer handling, and rendering currently share waveform state and do not need separate files by default.
