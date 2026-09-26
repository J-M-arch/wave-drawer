# Wave Drawer — Page Module Conventions

The app is composed of **page modules**: self-contained sections that extend
the page downward (transport controls, resolution selector, presets, canvas
editing today; export panel, spectrum analyser, etc. tomorrow).

## Directory layout

```
index.html            markup for every section (modules stacked top-to-bottom)
style.css             shared styles + .module section styling
src/
  main.js             entry point (boot only)
  app.js              composition root: wires services and mounts modules
  config.js           shared constants (single source of truth)
  core/
    events.js         pub/sub implementation
    eventsRegistry.js all cross-module event names + payload shapes
    waveformModel.js  owner of editable waveform state (DOM-free)
  audio/
    audioEngine.js    Web Audio pipeline (DOM-free, callback-driven)
  ui/
    dom.js            DOM id registry (only place getElementById is called)
    canvasRenderer.js pure canvas painting (no state, no listeners)
  modules/
    <name>Module.js   one file per interactive page section
```

## Anatomy of a module

```js
import { EVENTS } from '../core/eventsRegistry.js';

export function createExampleModule({ bus, dom, model }) {
    const disposers = [];
    return {
        mount() {
            // addEventListener / bus.on here; push matching removals into disposers
        },
        unmount() {
            while (disposers.length) disposers.pop()();
        },
    };
}
```

Rules:

1. A module receives its collaborators through the factory argument object —
   it never imports another module or queries `document` directly.
2. A module reads shared state via getters (`model.getPoints()`,
   `model.getAmplitudeAtX()`) and reacts via bus events. It never mutates
   another module's or the model's internals.
3. Emit events only from the module that **owns** that state; names live in
   `core/eventsRegistry.js`.
4. All listener registration happens in `mount()`; every subscription must
   have an inverse pushed to `disposers` and released in `unmount()`.
5. Status messages go through `EVENTS.STATUS_UPDATED` — only the status
   module writes to `#status`.
6. Constants used by more than one file belong in `src/config.js` (and the
   matching markup must stay in sync — see AGENTS.md).

## Adding a new page module (checklist)

1. Add a `<section class="module" id="<name>-module">` block in `index.html`
   below the existing sections (a skeleton is commented at the bottom of the
   container).
2. Register any new element ids in `src/ui/dom.js`.
3. Create `src/modules/<name>Module.js` following the pattern above.
4. Register new event names/payloads in `src/core/eventsRegistry.js`.
5. In `src/app.js`: instantiate with the shared context and append to the
   `modules` array (order = mount order = page order).
6. Style inside `.module` conventions in `style.css`.
7. Validate: `node --check` every changed JS file, serve over HTTP, and
   manually exercise the flows listed in AGENTS.md.
