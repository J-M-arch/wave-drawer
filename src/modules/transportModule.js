import { EVENTS } from '../core/eventsRegistry.js';

// Page module: Play/Pause + Reset buttons.
// Pattern shared by every module in src/modules/:
//   createXxxModule({ bus, dom, ...collaborators }) -> { mount(), unmount() }
// `mount()` registers listeners; `unmount()` removes them so the app can
// grow without leaking handlers as sections are added or removed.

export function createTransportModule({ bus, dom, model, audio }) {
    const disposers = [];
    const listen = (element, type, handler) => {
        element.addEventListener(type, handler);
        disposers.push(() => element.removeEventListener(type, handler));
    };

    function refreshButton() {
        dom.playPauseBtn.textContent = audio.isPlaying ? 'Pause' : 'Play';
    }

    function togglePlayPause() {
        if (audio.isPlaying) audio.pause(); else audio.play();
        refreshButton();
        bus.emit(EVENTS.PLAYBACK_TOGGLED, { isPlaying: audio.isPlaying });
    }

    function stopPlayback() {
        audio.stop();
        refreshButton();
    }

    function mount() {
        listen(dom.playPauseBtn, 'click', togglePlayPause);
        listen(dom.clearBtn, 'click', () => {
            stopPlayback();
            model.reset();
            bus.emit(EVENTS.STATUS_UPDATED, { message: 'Waveform reset. Click anywhere to adjust points.', error: false });
        });

        // Changing the shape while playing rebuilds playback from the new shape.
        disposers.push(bus.on(EVENTS.WAVEFORM_CHANGED, () => {
            if (audio.isPlaying) audio.play();
        }));
        disposers.push(bus.on(EVENTS.PRESET_APPLIED, ({ name }) => {
            stopPlayback();
            bus.emit(EVENTS.STATUS_UPDATED, { message: `Applied ${name} wave preset. Click and drag to modify.`, error: false });
        }));
    }

    function unmount() {
        while (disposers.length) disposers.pop()();
    }

    return { mount, unmount, stopPlayback };
}
