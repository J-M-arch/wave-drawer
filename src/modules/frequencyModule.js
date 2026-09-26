import { EVENTS } from '../core/eventsRegistry.js';

// Page module: frequency slider + readout.
// Exposes getFrequency() for the audio engine and rebuilds playback when
// the frequency changes mid-tone.

export function createFrequencyModule({ bus, dom, audio }) {
    const disposers = [];

    function handleInput() {
        const frequencyHz = Number.parseFloat(dom.frequency.value);
        dom.frequencyValue.textContent = `${frequencyHz}Hz`;
        bus.emit(EVENTS.FREQUENCY_CHANGED, { frequencyHz });
        if (audio.isPlaying) audio.play();
    }

    return {
        mount() {
            dom.frequency.addEventListener('input', handleInput);
            disposers.push(() => dom.frequency.removeEventListener('input', handleInput));
        },
        unmount() {
            while (disposers.length) disposers.pop()();
        },
        getFrequency() {
            return Number.parseFloat(dom.frequency.value);
        },
        syncDefault(defaultHz) {
            dom.frequency.value = String(defaultHz);
            dom.frequencyValue.textContent = `${defaultHz}Hz`;
        },
    };
}
