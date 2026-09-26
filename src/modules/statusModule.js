import { EVENTS } from '../core/eventsRegistry.js';

// Page module: status/error line.
// Any module may post messages by emitting STATUS_UPDATED; this is the only
// place that writes to #status, so styling and semantics stay consistent.

export function createStatusModule({ bus, dom }) {
    const disposers = [];

    return {
        mount() {
            disposers.push(bus.on(EVENTS.STATUS_UPDATED, ({ message, error = false }) => {
                dom.status.textContent = message;
                dom.status.className = error ? 'status error' : 'status';
            }));
        },
        unmount() {
            while (disposers.length) disposers.pop()();
        },
    };
}
