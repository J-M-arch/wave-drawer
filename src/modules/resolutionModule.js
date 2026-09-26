import { EVENTS } from '../core/eventsRegistry.js';

// Page module: point-count resolution selector.
// Owns the <select>, its readout, and the resample request. The model keeps
// the authored shape; this module only reports the chosen count.

export function createResolutionModule({ bus, dom, model }) {
    const disposers = [];
    let currentCount = null;

    function syncReadout(count) {
        dom.pointCountValue.textContent = `${count} points`;
    }

    function handleChange() {
        const requested = Number.parseInt(dom.pointCount.value, 10);
        const resolved = model.setPointCount(requested);
        currentCount = resolved;
        syncReadout(resolved);
        bus.emit(EVENTS.POINT_COUNT_CHANGED, { count: resolved });
        bus.emit(EVENTS.STATUS_UPDATED, { message: `Waveform uses ${resolved} points.`, error: false });
    }

    return {
        mount() {
            dom.pointCount.addEventListener('change', handleChange);
            disposers.push(() => dom.pointCount.removeEventListener('change', handleChange));
        },
        unmount() {
            while (disposers.length) disposers.pop()();
        },
        // Initialize UI after the model has been seeded with a point count.
        sync(count) {
            currentCount = count;
            dom.pointCount.value = String(count);
            syncReadout(count);
        },
        get currentCount() {
            return currentCount;
        },
    };
}
