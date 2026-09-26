import { DEFAULT_POINT_COUNT, FREQUENCY_DEFAULT } from './config.js';
import { createEventBus } from './core/events.js';
import { EVENTS } from './core/eventsRegistry.js';
import { createWaveformModel } from './core/waveformModel.js';
import { createAudioEngine } from './audio/audioEngine.js';
import { createDomRegistry } from './ui/dom.js';
import { createCanvasRenderer } from './ui/canvasRenderer.js';
import { createTransportModule } from './modules/transportModule.js';
import { createResolutionModule } from './modules/resolutionModule.js';
import { createFrequencyModule } from './modules/frequencyModule.js';
import { createPresetsModule } from './modules/presetsModule.js';
import { createStatusModule } from './modules/statusModule.js';
import { createCanvasEditModule } from './modules/canvasEditModule.js';

// App composition root. Wires shared services (bus, dom, model, audio) and
// mounts the page modules top-to-bottom, mirroring the page layout.
//
// TO ADD A FUTURE PAGE MODULE (e.g. an export panel or spectrum analyser):
//   1. Create src/modules/<name>Module.js following the existing pattern:
//        export function createXxxModule({ bus, dom, ... }) { return { mount, unmount }; }
//   2. Register any new DOM ids in ui/dom.js and add markup to index.html.
//   3. Add event names it emits/consumes to core/eventsRegistry.js.
//   4. Import it here, instantiate it below with the shared context, and
//      push it into `modules` — mount/unmount order follows the array.
// No other file needs to know the new module exists.

export function startApp() {
    const bus = createEventBus();
    const dom = createDomRegistry();
    const model = createWaveformModel({ bus });
    const renderer = createCanvasRenderer(dom.waveCanvas, model);

    // Audio engine stays DOM-free: it reads waveform + frequency through
    // injected callbacks and reports state via the status event.
    const audio = createAudioEngine({
        getAmplitudeAtX: model.getAmplitudeAtX,
        getFrequency: () => Number.parseFloat(dom.frequency.value),
        onStatus: (message, error = false) =>
            bus.emit(EVENTS.STATUS_UPDATED, { message, error }),
    });

    const statusModule = createStatusModule({ bus, dom });
    const transportModule = createTransportModule({ bus, dom, model, audio });
    const resolutionModule = createResolutionModule({ bus, dom, model });
    const frequencyModule = createFrequencyModule({ bus, dom, audio });
    const presetsModule = createPresetsModule({ bus, dom, model });
    const canvasEditModule = createCanvasEditModule({ bus, dom, model, renderer });

    // Mount order mirrors the page; later sections can simply be appended.
    const modules = [
        statusModule,
        transportModule,
        resolutionModule,
        frequencyModule,
        presetsModule,
        canvasEditModule,
    ];

    // Seed state before mounting so the first paint matches the controls.
    model.init(DEFAULT_POINT_COUNT);
    for (const module of modules) module.mount();

    resolutionModule.sync(DEFAULT_POINT_COUNT);
    frequencyModule.syncDefault(FREQUENCY_DEFAULT);

    // Initial shape: sine preset (stops nothing yet; playback is off).
    model.applyPreset('sine');
    renderer.render();
    bus.emit(EVENTS.STATUS_UPDATED, { message: 'Ready to edit!', error: false });

    return { bus, dom, model, renderer, audio, modules,
        dispose: () => modules.reverse().forEach((m) => m.unmount()) };
}
