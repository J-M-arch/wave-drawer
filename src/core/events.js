// Minimal pub/sub used to decouple modules from each other.
//
// Modules communicate exclusively through named events; no module reaches
// into another module's internals. See core/eventsRegistry.js for the
// catalogue of event names and payload shapes.

export function createEventBus() {
    const listeners = new Map();

    return {
        /**
         * Subscribe to an event. Returns an unsubscribe function so callers
         * (especially future page modules) can clean up on teardown.
         */
        on(eventName, handler) {
            if (!listeners.has(eventName)) listeners.set(eventName, new Set());
            listeners.get(eventName).add(handler);
            return () => this.off(eventName, handler);
        },

        off(eventName, handler) {
            const handlers = listeners.get(eventName);
            if (handlers) handlers.delete(handler);
        },

        emit(eventName, payload) {
            const handlers = listeners.get(eventName);
            if (!handlers) return;
            for (const handler of [...handlers]) handler(payload);
        },
    };
}
