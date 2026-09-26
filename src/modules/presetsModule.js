import { EVENTS } from '../core/eventsRegistry.js';

// Page module: preset buttons (sine / triangle / sawtooth / square).
// Reads the supported names from data-preset attributes so adding a new
// preset only requires markup + a case in core/waveformModel.applyPreset.

export function createPresetsModule({ bus, dom, model }) {
    const disposers = [];

    return {
        mount() {
            for (const button of dom.presetButtons) {
                const handler = () => model.applyPreset(button.dataset.preset);
                button.addEventListener('click', handler);
                disposers.push(() => button.removeEventListener('click', handler));
            }
        },
        unmount() {
            while (disposers.length) disposers.pop()();
        },
        // Programmatic application used at startup and by future features.
        apply(name) {
            model.applyPreset(name);
        },
    };
}
